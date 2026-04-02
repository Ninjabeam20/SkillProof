"""
test_scoring.py — Deterministic verdict-rule tests

Tests the pure functions that compute composite scores and fire verdict rules
R03 (VERIFIED), R04 (PARTIAL), and R05 (OVERCLAIM).

These are isolated unit tests — no database, no HTTP required.
"""

import sys
from pathlib import Path

# Make the backend package importable from the tests directory
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from routers.evaluation import _compute_type_score, _fire_verdict_rules, AnswerDetail


# ---------------------------------------------------------------------------
# Helper to build AnswerDetail objects quickly
# ---------------------------------------------------------------------------
def _make_detail(question_type: str, is_correct: bool) -> AnswerDetail:
    return AnswerDetail(
        question_id="test_q",
        question_type=question_type,
        selected_option_id="a",
        correct_option_id="a" if is_correct else "b",
        is_correct=is_correct,
    )


# ===========================================================================
# Test: R03 — Tier 1, composite >= 0.70 → VERIFIED
# ===========================================================================
class TestR03Verified:
    """All correct → composite = 1.0 → VERIFIED."""

    def test_all_correct_expert(self):
        details = [
            _make_detail("THEORY", True),
            _make_detail("PRACTICAL", True),
            _make_detail("EDGE_CASE", True),
        ]
        theory = _compute_type_score(details, "THEORY")
        practical = _compute_type_score(details, "PRACTICAL")
        edge_case = _compute_type_score(details, "EDGE_CASE")
        composite = (theory * 0.3) + (practical * 0.4) + (edge_case * 0.3)

        assert theory == 1.0
        assert practical == 1.0
        assert edge_case == 1.0
        assert composite == 1.0

        verdict, rule = _fire_verdict_rules(tier=1, claimed_level="EXPERT", composite=composite)
        assert verdict == "VERIFIED"
        assert rule == "R03"

    def test_threshold_exactly_070(self):
        """composite = 0.70 exactly should still be VERIFIED."""
        verdict, rule = _fire_verdict_rules(tier=1, claimed_level="INTERMEDIATE", composite=0.70)
        assert verdict == "VERIFIED"
        assert rule == "R03"


# ===========================================================================
# Test: R04 — Tier 1, composite between 0.50 and 0.69 → PARTIAL
# ===========================================================================
class TestR04Partial:
    """Composite in [0.50, 0.69] for non-overclaim → PARTIAL."""

    def test_partial_intermediate(self):
        verdict, rule = _fire_verdict_rules(tier=1, claimed_level="INTERMEDIATE", composite=0.55)
        assert verdict == "PARTIAL"
        assert rule == "R04"

    def test_partial_at_boundary_050(self):
        verdict, rule = _fire_verdict_rules(tier=1, claimed_level="INTERMEDIATE", composite=0.50)
        assert verdict == "PARTIAL"
        assert rule == "R04"

    def test_partial_composite_math(self):
        """1 theory correct, 0 practical, 1 edge case correct → composite = 0.6."""
        details = [
            _make_detail("THEORY", True),
            _make_detail("PRACTICAL", False),
            _make_detail("EDGE_CASE", True),
        ]
        theory = _compute_type_score(details, "THEORY")
        practical = _compute_type_score(details, "PRACTICAL")
        edge_case = _compute_type_score(details, "EDGE_CASE")
        composite = (theory * 0.3) + (practical * 0.4) + (edge_case * 0.3)

        assert theory == 1.0
        assert practical == 0.0
        assert edge_case == 1.0
        assert composite == 0.6

        verdict, rule = _fire_verdict_rules(tier=1, claimed_level="INTERMEDIATE", composite=composite)
        assert verdict == "PARTIAL"
        assert rule == "R04"


# ===========================================================================
# Test: R05 — Tier 1, claimed EXPERT, composite < 0.60 → OVERCLAIM
# ===========================================================================
class TestR05Overclaim:
    """Claimed EXPERT but composite < 0.60 → OVERCLAIM."""

    def test_all_wrong_expert(self):
        details = [
            _make_detail("THEORY", False),
            _make_detail("PRACTICAL", False),
            _make_detail("EDGE_CASE", False),
        ]
        theory = _compute_type_score(details, "THEORY")
        practical = _compute_type_score(details, "PRACTICAL")
        edge_case = _compute_type_score(details, "EDGE_CASE")
        composite = (theory * 0.3) + (practical * 0.4) + (edge_case * 0.3)

        assert composite == 0.0

        verdict, rule = _fire_verdict_rules(tier=1, claimed_level="EXPERT", composite=composite)
        assert verdict == "OVERCLAIM"
        assert rule == "R05"

    def test_expert_just_below_threshold(self):
        """composite = 0.59 with EXPERT claim → OVERCLAIM via R05."""
        verdict, rule = _fire_verdict_rules(tier=1, claimed_level="EXPERT", composite=0.59)
        assert verdict == "OVERCLAIM"
        assert rule == "R05"

    def test_expert_at_threshold_passes(self):
        """composite = 0.60 with EXPERT claim → NOT overclaim (R04 PARTIAL or R03 VERIFIED)."""
        verdict, rule = _fire_verdict_rules(tier=1, claimed_level="EXPERT", composite=0.60)
        assert verdict == "PARTIAL"
        assert rule == "R04"
