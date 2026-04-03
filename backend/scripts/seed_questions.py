#!/usr/bin/env python3
"""
seed_questions.py — Bulk Question Ingestion Script

Reads every .json file from backend/data/question_banks/, validates each
question's skill_id against the 15 canonical IDs in taxonomy.json, and
UPSERTs them into the Postgres `questions` table.

Usage:
    cd backend
    source venv/bin/activate
    python scripts/seed_questions.py
"""

import json
import sys
from pathlib import Path

# ---------------------------------------------------------------------------
# Ensure the backend package is importable
# ---------------------------------------------------------------------------
BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from sqlmodel import Session, select
from database import engine, create_db_and_tables
from models import Question

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
DATA_DIR = BACKEND_DIR / "data"
QUESTION_BANKS_DIR = DATA_DIR / "question_banks"
TAXONOMY_PATH = DATA_DIR / "taxonomy.json"

# ---------------------------------------------------------------------------
# Load valid canonical skill IDs from taxonomy.json
# ---------------------------------------------------------------------------
with open(TAXONOMY_PATH, "r") as f:
    taxonomy: dict[str, str] = json.load(f)

CANONICAL_IDS: set[str] = set(taxonomy.values())


def validate_question(q: dict, source_file: str) -> bool:
    """Validate that a question object has all required fields and a valid skill_id."""
    required_fields = [
        "question_id", "skill_id", "question_type",
        "question_text", "options", "correct_option_id", "explanation",
    ]
    for field in required_fields:
        if field not in q:
            print(f"  ⚠️  SKIP: Missing field '{field}' in {source_file} (question_id: {q.get('question_id', '???')})")
            return False

    if q["skill_id"] not in CANONICAL_IDS:
        print(f"  ⚠️  SKIP: skill_id '{q['skill_id']}' is not a canonical ID "
              f"(question_id: {q['question_id']}, file: {source_file})")
        return False

    valid_types = {"THEORY", "PRACTICAL", "EDGE_CASE"}
    if q["question_type"] not in valid_types:
        print(f"  ⚠️  SKIP: question_type '{q['question_type']}' invalid "
              f"(question_id: {q['question_id']}, file: {source_file})")
        return False

    return True


def upsert_questions(questions: list[dict], session: Session) -> tuple[int, int]:
    """UPSERT questions into the DB. Returns (inserted, updated) counts."""
    inserted = 0
    updated = 0

    for q in questions:
        # Check if question already exists by question_id
        stmt = select(Question).where(Question.question_id == q["question_id"])
        existing = session.exec(stmt).first()

        if existing:
            # UPDATE existing question
            existing.skill_id = q["skill_id"]
            existing.question_type = q["question_type"]
            existing.question_text = q["question_text"]
            existing.options = q["options"]
            existing.correct_option_id = q["correct_option_id"]
            existing.explanation = q["explanation"]
            session.add(existing)
            updated += 1
        else:
            # INSERT new question
            session.add(Question(
                question_id=q["question_id"],
                skill_id=q["skill_id"],
                question_type=q["question_type"],
                question_text=q["question_text"],
                options=q["options"],
                correct_option_id=q["correct_option_id"],
                explanation=q["explanation"],
            ))
            inserted += 1

    return inserted, updated


def main():
    print("=" * 60)
    print("SkillProof — Bulk Question Ingestion")
    print("=" * 60)
    print(f"\n📂 Source directory: {QUESTION_BANKS_DIR}")
    print(f"📋 Valid canonical IDs ({len(CANONICAL_IDS)}): {sorted(CANONICAL_IDS)}\n")

    if not QUESTION_BANKS_DIR.exists():
        print("❌ question_banks/ directory not found. Nothing to ingest.")
        sys.exit(1)

    json_files = sorted(QUESTION_BANKS_DIR.glob("*.json"))
    if not json_files:
        print("ℹ️  No .json files found in question_banks/. Nothing to ingest.")
        sys.exit(0)

    # Ensure tables exist
    create_db_and_tables()

    total_inserted = 0
    total_updated = 0
    total_skipped = 0
    files_processed = 0

    with Session(engine) as session:
        for json_file in json_files:
            print(f"\n📄 Processing: {json_file.name}")

            try:
                with open(json_file, "r") as f:
                    raw = json.load(f)
            except json.JSONDecodeError as e:
                print(f"  ❌ Invalid JSON: {e}")
                continue

            if not isinstance(raw, list):
                print(f"  ❌ Expected a JSON array, got {type(raw).__name__}. Skipping.")
                continue

            valid_questions = []
            for q in raw:
                if validate_question(q, json_file.name):
                    valid_questions.append(q)
                else:
                    total_skipped += 1

            if valid_questions:
                inserted, updated = upsert_questions(valid_questions, session)
                total_inserted += inserted
                total_updated += updated
                print(f"  ✅ {inserted} inserted, {updated} updated ({len(valid_questions)} valid / {len(raw)} total)")
            else:
                print(f"  ⚠️  No valid questions to ingest from this file.")

            files_processed += 1

        session.commit()

    print("\n" + "=" * 60)
    print("✅ Ingestion Complete")
    print(f"   Files processed:  {files_processed}")
    print(f"   Questions inserted: {total_inserted}")
    print(f"   Questions updated:  {total_updated}")
    print(f"   Questions skipped:  {total_skipped}")
    print("=" * 60)


if __name__ == "__main__":
    main()
