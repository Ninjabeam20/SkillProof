"""
Report Router — Stage 4 Reporting Layer (Postgres-backed)

GET /api/report/{user_id}  — fetch all evaluations for a user
"""

import json
import uuid
from pathlib import Path

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from database import engine
from models import Evaluation, User

router = APIRouter()

# ---------------------------------------------------------------------------
# Static data — skill_graph.json for enrichment
# ---------------------------------------------------------------------------
DATA_DIR = Path(__file__).resolve().parent.parent / "data"

with open(DATA_DIR / "skill_graph.json", "r") as f:
    SKG_NODES: list[dict] = json.load(f)

_SKG_BY_ID: dict[str, dict] = {node["skill_id"]: node for node in SKG_NODES}


# ============================================================================
# GET /api/report/{user_id}
# ============================================================================
class EvaluationReport(BaseModel):
    skill_id: str
    canonical_name: str
    claimed_level: str
    composite_score: float
    theory_score: float
    practical_score: float
    edge_case_score: float
    verdict: str
    rule_fired: str
    misconception_tags: list[str]
    created_at: str


class ReportResponse(BaseModel):
    user_id: str
    evaluations: list[EvaluationReport]


@router.get("/report/{user_id}", response_model=ReportResponse)
def get_report(user_id: str):
    """Fetch all evaluations for a given user_id from Postgres."""
    try:
        uid = uuid.UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user_id format")

    with Session(engine) as session:
        # Verify user exists
        user = session.get(User, uid)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        stmt = (
            select(Evaluation)
            .where(Evaluation.user_id == uid)
            .order_by(Evaluation.created_at)
        )
        evaluations = session.exec(stmt).all()

    reports = []
    for ev in evaluations:
        skg_node = _SKG_BY_ID.get(ev.skill_id)
        canonical_name = skg_node["canonical_name"] if skg_node else ev.skill_id

        tags = ev.misconception_tags
        if isinstance(tags, str):
            tags = json.loads(tags)

        reports.append(EvaluationReport(
            skill_id=ev.skill_id,
            canonical_name=canonical_name,
            claimed_level=ev.claimed_level,
            composite_score=ev.composite_score,
            theory_score=ev.theory_score,
            practical_score=ev.practical_score,
            edge_case_score=ev.edge_case_score,
            verdict=ev.verdict,
            rule_fired=ev.rule_fired,
            misconception_tags=tags if isinstance(tags, list) else [],
            created_at=ev.created_at.isoformat(),
        ))

    return ReportResponse(user_id=user_id, evaluations=reports)
