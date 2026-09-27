import pytest


def test_health_reports_model(client):
    response = client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"


def test_predict_returns_recommendation(client):
    response = client.post(
        "/predict",
        json={"symptoms": ["headache", "blurred vision"], "duration_days": 3, "severity": "moderate"},
    )
    if response.status_code == 503:
        pytest.skip("Model artifacts are not trained")
    assert response.status_code == 200
    body = response.json()
    assert set(body) == {"recommended_specialty", "urgency", "confidence", "disclaimer"}
    assert body["urgency"] == "medium"
    assert 0.0 <= body["confidence"] <= 1.0


def test_predict_rejects_invalid_payload(client):
    response = client.post(
        "/predict",
        json={"symptoms": [], "duration_days": 0, "severity": "extreme"},
    )
    assert response.status_code == 422


def test_analyze_maps_legacy_contract(client):
    response = client.post(
        "/analyze",
        json={
            "symptoms": ["itchy rash"],
            "additionalSymptoms": ["dry skin"],
            "durationInDays": 5,
            "severity": "mild",
        },
    )
    if response.status_code == 503:
        pytest.skip("Model artifacts are not trained")
    assert response.status_code == 200
    body = response.json()
    assert set(body) == {"recommendedSpecialty", "urgencyLevel", "confidenceScore", "summary"}
    assert body["urgencyLevel"] == "routine"


def test_model_metrics_exposes_comparison(client):
    response = client.get("/model/metrics")
    if response.status_code == 503:
        pytest.skip("Model artifacts are not trained")
    assert response.status_code == 200
    body = response.json()
    assert set(body) >= {
        "model_name",
        "trained_at",
        "holdout_metrics",
        "cross_validation",
        "comparison",
    }
    assert isinstance(body["comparison"], list)
    assert len(body["comparison"]) >= 1
