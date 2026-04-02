"""
SkillProof — FastAPI Backend
Entry point. Creates tables on startup, seeds questions, registers routers.
"""

import json
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select

from database import engine, create_db_and_tables
from models import Question
from routers import resume, evaluation, report

DATA_DIR = Path(__file__).resolve().parent / "data"


# ---------------------------------------------------------------------------
# Lifespan — runs once on startup
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Create all tables (idempotent)
    create_db_and_tables()

    # 2. Seed questions table if it's empty
    with Session(engine) as session:
        count = session.exec(select(Question)).first()
        if count is None:
            with open(DATA_DIR / "questions.json", "r") as f:
                raw_questions = json.load(f)
            for q in raw_questions:
                session.add(Question(
                    question_id=q["question_id"],
                    skill_id=q["skill_id"],
                    question_type=q["question_type"],
                    question_text=q["question_text"],
                    options=q["options"],
                    correct_option_id=q["correct_option_id"],
                    explanation=q["explanation"],
                ))
            session.commit()
            print(f"✅ Seeded {len(raw_questions)} questions into Postgres.")
        else:
            print("ℹ️  Questions table already populated — skipping seed.")

    yield  # app runs here


# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------
app = FastAPI(
    title="SkillProof API",
    version="0.2.0",
    description="Deterministic resume skill verification engine.",
    lifespan=lifespan,
)

# ---------------------------------------------------------------------------
# CORS — allow the Vite dev server (ports 5173 / 5174) and any localhost
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------
app.include_router(resume.router, prefix="/api")
app.include_router(evaluation.router, prefix="/api")
app.include_router(report.router, prefix="/api")


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------
@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "skillproof-api"}
