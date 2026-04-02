"""
SkillProof — Database Engine & Session Factory

Connects to PostgreSQL. Falls back to the DATABASE_URL env var,
then to a local default using the current OS user.
"""

import os
import getpass

from sqlmodel import SQLModel, Session, create_engine

# ---------------------------------------------------------------------------
# Connection URL
# ---------------------------------------------------------------------------
# Priority: DATABASE_URL env var  →  local Postgres with current OS user
_DEFAULT_URL = f"postgresql://{getpass.getuser()}@localhost:5432/skillproof"
DATABASE_URL = os.getenv("DATABASE_URL", _DEFAULT_URL)

engine = create_engine(DATABASE_URL, echo=False)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def create_db_and_tables():
    """Create all SQLModel tables (idempotent — safe to call on every boot)."""
    SQLModel.metadata.create_all(engine)


def get_session():
    """Yield a short-lived DB session (for FastAPI Depends)."""
    with Session(engine) as session:
        yield session
