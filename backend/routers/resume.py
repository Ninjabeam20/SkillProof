"""
POST /api/resume/extract — Stage 1 Ingestion

Accepts raw resume text, matches substrings against taxonomy.json,
detects proficiency-level signals, returns SkillProfile[].
"""

import json
import re
from pathlib import Path
from typing import Optional

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

# ---------------------------------------------------------------------------
# Data loading (done once at import time — stateless, no DB)
# ---------------------------------------------------------------------------
DATA_DIR = Path(__file__).resolve().parent.parent / "data"

with open(DATA_DIR / "taxonomy.json", "r") as f:
    TAXONOMY: dict[str, str] = json.load(f)

with open(DATA_DIR / "skill_graph.json", "r") as f:
    SKG_NODES: list[dict] = json.load(f)

# Pre-build an alias → canonical_id lookup that also includes every alias
# defined in the SKG nodes themselves (belt-and-suspenders approach).
_ALIAS_MAP: dict[str, str] = {}
for alias, canonical in TAXONOMY.items():
    _ALIAS_MAP[alias.lower()] = canonical
for node in SKG_NODES:
    _ALIAS_MAP[node["canonical_name"].lower()] = node["skill_id"]
    for alias in node.get("aliases", []):
        _ALIAS_MAP[alias.lower()] = node["skill_id"]


# ---------------------------------------------------------------------------
# Level-signal detection
# ---------------------------------------------------------------------------
_EXPERT_SIGNALS = re.compile(
    r"\b(expert|advanced|proficient|senior|deep\s+experience|strong)\b", re.IGNORECASE
)
_BEGINNER_SIGNALS = re.compile(
    r"\b(basic|beginner|exposure|familiar|introductory|some\s+experience)\b", re.IGNORECASE
)


def _find_closest_signal(
    text_lower: str, skill_start: int, skill_end: int
) -> str:
    """Find the closest level signal to the skill mention and return the level.

    Scans the entire text for all level signals, then picks the one whose
    match span is closest to the skill mention span. This avoids a fixed
    window that either bleeds or misses.
    """
    candidates: list[tuple[int, str]] = []  # (distance, level)

    for m in _EXPERT_SIGNALS.finditer(text_lower):
        # Distance = gap between signal span and skill span
        dist = min(abs(m.start() - skill_end), abs(m.end() - skill_start))
        candidates.append((dist, "EXPERT"))

    for m in _BEGINNER_SIGNALS.finditer(text_lower):
        dist = min(abs(m.start() - skill_end), abs(m.end() - skill_start))
        candidates.append((dist, "BEGINNER"))

    if not candidates:
        return "INTERMEDIATE"

    # Sort by distance; if tie, prefer BEGINNER (more specific qualifier)
    candidates.sort(key=lambda c: (c[0], 0 if c[1] == "BEGINNER" else 1))
    closest_dist, closest_level = candidates[0]

    # Only use the signal if it's reasonably close (within ~50 chars)
    if closest_dist > 50:
        return "INTERMEDIATE"

    return closest_level


# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------
class ExtractRequest(BaseModel):
    text: str


class SkillProfile(BaseModel):
    skill_id: str
    canonical_name: str
    claimed_level: str  # BEGINNER | INTERMEDIATE | EXPERT


class ExtractResponse(BaseModel):
    profiles: list[SkillProfile]


# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------
@router.post("/resume/extract", response_model=ExtractResponse)
def extract_skills(req: ExtractRequest):
    """
    Scan raw resume text for taxonomy matches.
    For each match, find the closest level signal in the full text.
    Returns de-duplicated SkillProfile list.
    """
    text_lower = req.text.lower()
    found: dict[str, SkillProfile] = {}  # canonical_id → profile

    # Sort aliases longest-first so "react js" matches before "react"
    sorted_aliases = sorted(_ALIAS_MAP.keys(), key=len, reverse=True)

    for alias in sorted_aliases:
        canonical_id = _ALIAS_MAP[alias]
        if canonical_id in found:
            continue  # already matched via a longer alias

        idx = text_lower.find(alias)
        if idx == -1:
            continue

        # Use distance-based closest-signal detection
        level = _find_closest_signal(text_lower, idx, idx + len(alias))

        # Resolve canonical name from SKG
        canonical_name = canonical_id  # fallback
        for node in SKG_NODES:
            if node["skill_id"] == canonical_id:
                canonical_name = node["canonical_name"]
                break

        found[canonical_id] = SkillProfile(
            skill_id=canonical_id,
            canonical_name=canonical_name,
            claimed_level=level,
        )

    return ExtractResponse(profiles=list(found.values()))

