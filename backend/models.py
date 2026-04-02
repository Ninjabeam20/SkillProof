"""
SkillProof — SQLModel Table Definitions

Three tables:
  1. User       — placeholder for future authentication
  2. Question   — seeded from questions.json, queried with random ordering
  3. Evaluation — persisted scoring results, linked to anonymous/future users
"""

import uuid
from datetime import datetime, timezone
from typing import Any, Optional

from sqlmodel import Field, SQLModel, Column
from sqlalchemy import JSON


# ---------------------------------------------------------------------------
# User (future auth placeholder)
# ---------------------------------------------------------------------------
class User(SQLModel, table=True):
    __tablename__ = "users"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    email: Optional[str] = Field(default=None, index=True, unique=True)
    password_hash: Optional[str] = Field(default=None)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ---------------------------------------------------------------------------
# Question
# ---------------------------------------------------------------------------
class Question(SQLModel, table=True):
    __tablename__ = "questions"

    id: int = Field(default=None, primary_key=True)
    question_id: str = Field(index=True, unique=True)
    skill_id: str = Field(index=True)
    question_type: str  # THEORY | PRACTICAL | EDGE_CASE
    question_text: str
    options: Any = Field(sa_column=Column(JSON))  # list[dict]
    correct_option_id: str
    explanation: str


# ---------------------------------------------------------------------------
# Evaluation
# ---------------------------------------------------------------------------
class Evaluation(SQLModel, table=True):
    __tablename__ = "evaluations"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True)
    skill_id: str
    claimed_level: str
    composite_score: float
    theory_score: float = Field(default=0.0)
    practical_score: float = Field(default=0.0)
    edge_case_score: float = Field(default=0.0)
    verdict: str
    rule_fired: str
    misconception_tags: Any = Field(default=[], sa_column=Column(JSON))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
