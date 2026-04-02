"""
test_report.py — Tests for GET /api/report/{user_id}

Inserts a test user + evaluation into Postgres, verifies the report endpoint
returns correctly structured data, then cleans up.
"""

import sys
import uuid
from pathlib import Path
from datetime import datetime, timezone

# Make the backend package importable from the tests directory
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlmodel import Session
from database import engine
from models import User, Evaluation
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


class TestReportEndpoint:
    """Test GET /api/report/{user_id} with real DB rows."""

    @classmethod
    def setup_class(cls):
        """Insert a test user and evaluation before tests run."""
        cls.test_user_id = uuid.uuid4()
        cls.test_eval_id = uuid.uuid4()

        with Session(engine) as session:
            session.add(User(id=cls.test_user_id))
            session.flush()

            session.add(Evaluation(
                id=cls.test_eval_id,
                user_id=cls.test_user_id,
                skill_id="react",
                claimed_level="EXPERT",
                composite_score=0.85,
                theory_score=0.9,
                practical_score=0.8,
                edge_case_score=0.85,
                verdict="VERIFIED",
                rule_fired="R03",
                misconception_tags=["test-misconception"],
                created_at=datetime.now(timezone.utc),
            ))
            session.commit()

    @classmethod
    def teardown_class(cls):
        """Clean up test data after tests complete."""
        with Session(engine) as session:
            eval_row = session.get(Evaluation, cls.test_eval_id)
            if eval_row:
                session.delete(eval_row)
            user_row = session.get(User, cls.test_user_id)
            if user_row:
                session.delete(user_row)
            session.commit()

    def test_report_returns_200(self):
        """GET /api/report/{user_id} returns 200 with valid user_id."""
        response = client.get(f"/api/report/{self.test_user_id}")
        assert response.status_code == 200

    def test_report_has_correct_structure(self):
        """Response contains user_id and evaluations array."""
        response = client.get(f"/api/report/{self.test_user_id}")
        data = response.json()

        assert "user_id" in data
        assert "evaluations" in data
        assert isinstance(data["evaluations"], list)
        assert len(data["evaluations"]) >= 1

    def test_report_evaluation_data(self):
        """Evaluation entry has correct fields matching inserted data."""
        response = client.get(f"/api/report/{self.test_user_id}")
        data = response.json()

        ev = next((e for e in data["evaluations"] if e["skill_id"] == "react"), None)
        assert ev is not None
        assert ev["canonical_name"] == "React"
        assert ev["claimed_level"] == "EXPERT"
        assert ev["composite_score"] == 0.85
        assert ev["theory_score"] == 0.9
        assert ev["practical_score"] == 0.8
        assert ev["edge_case_score"] == 0.85
        assert ev["verdict"] == "VERIFIED"
        assert ev["rule_fired"] == "R03"
        assert "test-misconception" in ev["misconception_tags"]

    def test_report_nonexistent_user_404(self):
        """GET /api/report/{bad_id} returns 404 for unknown user."""
        fake_id = uuid.uuid4()
        response = client.get(f"/api/report/{fake_id}")
        assert response.status_code == 404

    def test_report_invalid_uuid_400(self):
        """GET /api/report/not-a-uuid returns 400."""
        response = client.get("/api/report/not-a-uuid")
        assert response.status_code == 400
