"""
Evaluation Router — Stage 3 Intelligence Layer (Postgres-backed)

GET  /api/evaluation/{skill_id}/questions  — random questions from DB
POST /api/evaluation/score                 — deterministic grader + persistence
POST /api/skg/queue                        — prerequisite-gated evaluation order
"""

import json
import uuid
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select
from sqlalchemy import func as sa_func

from database import engine
from models import Question as QuestionModel, Evaluation, User

router = APIRouter()

# ---------------------------------------------------------------------------
# Static data (skill_graph.json is still file-based — no DB table for it)
# ---------------------------------------------------------------------------
DATA_DIR = Path(__file__).resolve().parent.parent / "data"

with open(DATA_DIR / "skill_graph.json", "r") as f:
    SKG_NODES: list[dict] = json.load(f)

_SKG_BY_ID: dict[str, dict] = {node["skill_id"]: node for node in SKG_NODES}


# ============================================================================
# GET /api/evaluation/{skill_id}/questions
# ============================================================================
class StrippedOption(BaseModel):
    id: str
    text: str


class StrippedQuestion(BaseModel):
    question_id: str
    skill_id: str
    question_type: str
    question_text: str
    options: list[StrippedOption]


class QuestionsResponse(BaseModel):
    skill_id: str
    questions: list[StrippedQuestion]


@router.get("/evaluation/{skill_id}/questions", response_model=QuestionsResponse)
def get_questions(skill_id: str):
    """Return randomized questions for a skill, stripped of correct answers.

    Selects exactly 1 THEORY, 1 PRACTICAL, and 1 EDGE_CASE question
    via Postgres ORDER BY RANDOM().
    """
    with Session(engine) as session:
        questions = []
        for qtype in ("THEORY", "PRACTICAL", "EDGE_CASE"):
            stmt = (
                select(QuestionModel)
                .where(QuestionModel.skill_id == skill_id)
                .where(QuestionModel.question_type == qtype)
                .order_by(sa_func.random())
                .limit(1)
            )
            q = session.exec(stmt).first()
            if q:
                questions.append(q)

    if not questions:
        raise HTTPException(
            status_code=404,
            detail=f"No questions found for skill: {skill_id}",
        )

    stripped = []
    for q in questions:
        options_data = q.options if isinstance(q.options, list) else json.loads(q.options)
        stripped.append(StrippedQuestion(
            question_id=q.question_id,
            skill_id=q.skill_id,
            question_type=q.question_type,
            question_text=q.question_text,
            options=[
                StrippedOption(id=opt["id"], text=opt["text"])
                for opt in options_data
            ],
        ))

    return QuestionsResponse(skill_id=skill_id, questions=stripped)


# ============================================================================
# POST /api/evaluation/score
# ============================================================================
class AnswerItem(BaseModel):
    question_id: str
    selected_option_id: str


class ScoreRequest(BaseModel):
    skill_id: str
    claimed_level: str   # BEGINNER | INTERMEDIATE | EXPERT
    answers: list[AnswerItem]
    user_id: Optional[str] = None  # Optional — anonymous if missing


class AnswerDetail(BaseModel):
    question_id: str
    question_type: str
    selected_option_id: str
    correct_option_id: str
    is_correct: bool
    misconception_tag: Optional[str] = None


class ScoreResponse(BaseModel):
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
    answers_detail: list[AnswerDetail]
    evaluation_id: str  # returned from Postgres
    user_id: str        # returned so frontend can store for report queries


def _compute_type_score(details: list[AnswerDetail], qtype: str) -> float:
    """Compute ratio of correct answers for a given question type."""
    typed = [d for d in details if d.question_type == qtype]
    if not typed:
        return 0.0
    correct = sum(1 for d in typed if d.is_correct)
    return correct / len(typed)


def _fire_verdict_rules(tier: int, claimed_level: str, composite: float) -> tuple[str, str]:
    """
    Fire verdict rules R01–R06 sequentially per PROJECT_CONTEXT.md §4.
    Returns (verdict, rule_id).
    """
    # --- Tier 2 rules first ---
    if tier == 2:
        if composite >= 0.60:
            return ("BASIC_VERIFIED", "R01")
        else:
            return ("BASIC_UNVERIFIED", "R02")

    # --- Tier 1 rules ---
    # R05: Claimed EXPERT & composite < 0.60 → OVERCLAIM
    if claimed_level == "EXPERT" and composite < 0.60:
        return ("OVERCLAIM", "R05")

    # R06: Claimed INTERMEDIATE & composite < 0.45 → OVERCLAIM
    if claimed_level == "INTERMEDIATE" and composite < 0.45:
        return ("OVERCLAIM", "R06")

    # R03: composite >= 0.70 → VERIFIED
    if composite >= 0.70:
        return ("VERIFIED", "R03")

    # R04: composite between 0.50 and 0.69 → PARTIAL
    if composite >= 0.50:
        return ("PARTIAL", "R04")

    # Fallback: below 0.50 for Tier 1
    return ("PARTIAL", "R04")


@router.post("/evaluation/score", response_model=ScoreResponse)
def score_evaluation(req: ScoreRequest):
    """
    Deterministic grader. Computes composite score, fires verdict rules R01–R06,
    collects misconception tags, and persists the evaluation to Postgres.
    """
    # Fetch the questions from Postgres (need correct answers for grading)
    with Session(engine) as session:
        stmt = select(QuestionModel).where(QuestionModel.skill_id == req.skill_id)
        db_questions = session.exec(stmt).all()

    if not db_questions:
        raise HTTPException(
            status_code=404,
            detail=f"No questions found for skill: {req.skill_id}",
        )

    # Build a lookup: question_id → QuestionModel
    q_map = {q.question_id: q for q in db_questions}

    # Build answer lookup: question_id → selected_option_id
    answer_map = {a.question_id: a.selected_option_id for a in req.answers}

    # Grade each answered question
    details: list[AnswerDetail] = []
    misconception_tags: list[str] = []

    for answer in req.answers:
        q = q_map.get(answer.question_id)
        if q is None:
            continue  # skip unknown question IDs

        is_correct = answer.selected_option_id == q.correct_option_id

        # Find misconception_tag if wrong
        tag = None
        if not is_correct:
            options_data = q.options if isinstance(q.options, list) else json.loads(q.options)
            for opt in options_data:
                if opt["id"] == answer.selected_option_id and "misconception_tag" in opt:
                    tag = opt["misconception_tag"]
                    misconception_tags.append(tag)
                    break

        details.append(AnswerDetail(
            question_id=answer.question_id,
            question_type=q.question_type,
            selected_option_id=answer.selected_option_id,
            correct_option_id=q.correct_option_id,
            is_correct=is_correct,
            misconception_tag=tag,
        ))

    # Compute per-type scores
    theory = _compute_type_score(details, "THEORY")
    practical = _compute_type_score(details, "PRACTICAL")
    edge_case = _compute_type_score(details, "EDGE_CASE")

    # Composite: (theory × 0.3) + (practical × 0.4) + (edge_case × 0.3)
    composite = (theory * 0.3) + (practical * 0.4) + (edge_case * 0.3)

    # Look up skill tier
    skg_node = _SKG_BY_ID.get(req.skill_id)
    tier = skg_node["tier"] if skg_node else 1
    canonical_name = skg_node["canonical_name"] if skg_node else req.skill_id

    # Fire verdict rules
    verdict, rule_fired = _fire_verdict_rules(tier, req.claimed_level, composite)

    # ---------------------------------------------------------------------------
    # Persist to Postgres
    # ---------------------------------------------------------------------------
    with Session(engine) as session:
        # Resolve or create anonymous user
        if req.user_id:
            uid = uuid.UUID(req.user_id)
        else:
            uid = uuid.uuid4()
            session.add(User(id=uid))
            session.flush()  # ensure User row exists before FK reference

        eval_row = Evaluation(
            user_id=uid,
            skill_id=req.skill_id,
            claimed_level=req.claimed_level,
            composite_score=round(composite, 4),
            theory_score=round(theory, 4),
            practical_score=round(practical, 4),
            edge_case_score=round(edge_case, 4),
            verdict=verdict,
            rule_fired=rule_fired,
            misconception_tags=misconception_tags,
        )
        session.add(eval_row)
        session.commit()
        session.refresh(eval_row)
        evaluation_id = str(eval_row.id)
        returned_user_id = str(uid)

    return ScoreResponse(
        skill_id=req.skill_id,
        canonical_name=canonical_name,
        claimed_level=req.claimed_level,
        composite_score=round(composite, 4),
        theory_score=round(theory, 4),
        practical_score=round(practical, 4),
        edge_case_score=round(edge_case, 4),
        verdict=verdict,
        rule_fired=rule_fired,
        misconception_tags=misconception_tags,
        answers_detail=details,
        evaluation_id=evaluation_id,
        user_id=returned_user_id,
    )


# ============================================================================
# POST /api/skg/queue — Prerequisite-gated evaluation order
# ============================================================================
class SkillClaim(BaseModel):
    skill_id: str
    claimed_level: str


class QueueRequest(BaseModel):
    claims: list[SkillClaim]


class QueueSkill(BaseModel):
    skill_id: str
    canonical_name: str
    claimed_level: str
    tier: int
    domain: str
    has_questions: bool
    is_implied: bool = False
    prerequisites_met: bool = True
    missing_prerequisites: list[str] = []



class QueueResponse(BaseModel):
    queue: list[QueueSkill]


@router.post("/skg/queue", response_model=QueueResponse)
def get_evaluation_queue(req: QueueRequest):
    """
    Accept claimed skills, perform transitive closure of prerequisites,
    and return an ordered evaluation queue.

    Implied prerequisites (auto-added via BFS) are marked is_implied=True.
    Example: claiming 'react' auto-adds 'javascript', 'html', 'css'.
    """
    claimed_ids = {c.skill_id for c in req.claims}
    claimed_level_map = {c.skill_id: c.claimed_level for c in req.claims}

    # ------------------------------------------------------------------
    # BFS: compute full transitive prerequisite closure
    # ------------------------------------------------------------------
    all_needed: set[str] = set()
    bfs_queue: list[str] = list(claimed_ids)

    while bfs_queue:
        current = bfs_queue.pop(0)
        if current in all_needed:
            continue
        all_needed.add(current)
        node = _SKG_BY_ID.get(current)
        if node:
            for prereq in node.get("prerequisites", []):
                if prereq not in all_needed:
                    bfs_queue.append(prereq)

    # ------------------------------------------------------------------
    # Query which skills actually have questions in Postgres
    # ------------------------------------------------------------------
    with Session(engine) as session:
        stmt = select(QuestionModel.skill_id).distinct()
        skills_with_questions = {row for row in session.exec(stmt)}

    # ------------------------------------------------------------------
    # Build queue items
    # ------------------------------------------------------------------
    queue_items: list[QueueSkill] = []

    for sid in all_needed:
        node = _SKG_BY_ID.get(sid)
        is_implied = sid not in claimed_ids
        level = "INTERMEDIATE" if is_implied else claimed_level_map.get(sid, "INTERMEDIATE")

        if not node:
            queue_items.append(QueueSkill(
                skill_id=sid,
                canonical_name=sid,
                claimed_level=level,
                tier=1,
                domain="Unknown",
                has_questions=sid in skills_with_questions,
                is_implied=is_implied,
            ))
            continue

        queue_items.append(QueueSkill(
            skill_id=sid,
            canonical_name=node["canonical_name"],
            claimed_level=level,
            tier=node["tier"],
            domain=node["domain"],
            has_questions=sid in skills_with_questions,
            is_implied=is_implied,
        ))

    # Sort: tier asc → domain → explicit claims before implied
    queue_items.sort(key=lambda s: (
        s.tier,
        s.domain,
        1 if s.is_implied else 0,
    ))

    return QueueResponse(queue=queue_items)
