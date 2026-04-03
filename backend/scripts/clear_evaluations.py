#!/usr/bin/env python3
"""
clear_evaluations.py — Wipe ghost evaluations

Deletes ALL rows from the `evaluations` table so the Results page
resets to a clean "Untested" slate. Does NOT touch users or questions.

Usage:
    cd backend
    source venv/bin/activate
    python scripts/clear_evaluations.py
"""

import sys
from pathlib import Path

# Ensure the backend package is importable
BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from sqlmodel import Session, delete
from database import engine, create_db_and_tables
from models import Evaluation


def main():
    create_db_and_tables()

    with Session(engine) as session:
        count = session.exec(delete(Evaluation)).rowcount  # type: ignore
        session.commit()

    print(f"✅ Deleted {count} evaluation row(s) from the database.")
    print("   Users and Questions tables are untouched.")


if __name__ == "__main__":
    main()
