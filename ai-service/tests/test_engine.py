import pytest

from app.ml.engine import DISCLAIMER, ModelEngine


def _ready_engine():
    engine = ModelEngine()
    try:
        engine.load()
    except Exception:
        pytest.skip("Model artifacts are not trained")
    if not engine.ready:
        pytest.skip("Model artifacts are not trained")
    return engine


def test_urgency_emergency_keyword_wins():
    assert ModelEngine._urgency(["mild rash and chest pain"], 1, "mild") == "emergency"


def test_urgency_high_for_severe_or_long_duration():
    assert ModelEngine._urgency(["back pain"], 3, "severe") == "high"
    assert ModelEngine._urgency(["back pain"], 15, "mild") == "high"


def test_urgency_medium_for_moderate_or_over_a_week():
    assert ModelEngine._urgency(["cough"], 2, "moderate") == "medium"
    assert ModelEngine._urgency(["cough"], 8, "mild") == "medium"


def test_urgency_low_otherwise():
    assert ModelEngine._urgency(["sneezing"], 2, "mild") == "low"


def test_predict_returns_full_contract():
    engine = _ready_engine()
    result = engine.predict(["itchy rash", "redness"], duration_days=5, severity="moderate")
    assert set(result) == {"recommended_specialty", "urgency", "confidence", "disclaimer"}
    assert isinstance(result["recommended_specialty"], str)
    assert 0.0 <= result["confidence"] <= 1.0
    assert result["disclaimer"] == DISCLAIMER
