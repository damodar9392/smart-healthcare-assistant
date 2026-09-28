import pytest

import app.ml.engine as engine_module


def test_health_reports_model(client):
    response = client.get("/health")
    if response.status_code == 503:
        pytest.skip("Model artifacts are not trained")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["model"], "health must name the loaded model"


def test_health_reports_503_when_model_missing(client, monkeypatch):
    monkeypatch.setattr(engine_module, "_engine", None)
    monkeypatch.setattr(engine_module, "_retry_after", float("inf"))
    monkeypatch.setattr(engine_module, "MODELS_DIR", engine_module.Path("/nonexistent"))
    response = client.get("/health")
    assert response.status_code == 503
    assert "not loaded" in response.json()["detail"]


def test_get_engine_retries_after_failure(monkeypatch):
    monkeypatch.setattr(engine_module, "_engine", None)
    monkeypatch.setattr(engine_module, "_retry_after", 0.0)
    monkeypatch.setattr(engine_module, "LOAD_RETRY_SECONDS", 0.0)
    monkeypatch.setattr(engine_module, "MODELS_DIR", engine_module.Path("/nonexistent"))
    assert engine_module.get_engine().ready is False
    assert engine_module._engine is None


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


def test_ai_endpoints_require_internal_token(client):
    from fastapi.testclient import TestClient

    from main import app

    anonymous = TestClient(app)
    for path, method in (
        ("/predict", "post"),
        ("/analyze", "post"),
        ("/model/metrics", "get"),
    ):
        call = getattr(anonymous, method)
        response = call(path, json={}) if method == "post" else call(path)
        assert response.status_code == 401, f"{method.upper()} {path} must require the token"

    bad = TestClient(app, headers={"X-Internal-Token": "wrong"})
    assert bad.get("/model/metrics").status_code == 401


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
