"""
SkillProof — FastAPI Backend
Entry point. Creates tables on startup, registers routers.
Ingestion is now handled manually via scripts/seed_questions.py.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import create_db_and_tables
from routers import resume, evaluation, report


# ---------------------------------------------------------------------------
# Lifespan — runs once on startup
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create all tables (idempotent)
    create_db_and_tables()
    print("ℹ️  Tables verified. Question ingestion is manual — run: python scripts/seed_questions.py")

    yield  # app runs here


# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------
app = FastAPI(
    title="SkillProof API",
    version="0.3.0",
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
