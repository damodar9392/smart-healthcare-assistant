from fastapi import APIRouter, HTTPException

from app.ml.engine import get_engine

router = APIRouter()


@router.get("/model/metrics")
def model_metrics():
    engine = get_engine()
    if not engine.ready or not engine.meta:
        raise HTTPException(status_code=503, detail="Model metrics are not available. Train the model first.")
    meta = engine.meta
    return {
        "model_name": meta.get("model_name"),
        "trained_at": meta.get("trained_at"),
        "holdout_metrics": meta.get("metrics"),
        "cross_validation": meta.get("cv"),
        "dataset": meta.get("dataset"),
        "vectorizer": meta.get("vectorizer"),
        "comparison": meta.get("comparison", []),
    }
