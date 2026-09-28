from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.ml.engine import get_engine

router = APIRouter()

MAX_SYMPTOMS = 50
MAX_SYMPTOM_LENGTH = 300


class PredictInput(BaseModel):
    symptoms: list[str] = Field(min_length=1, max_length=MAX_SYMPTOMS)
    duration_days: int = Field(ge=1, le=365)
    severity: str = Field(pattern="^(mild|moderate|severe)$")


class PredictOutput(BaseModel):
    recommended_specialty: str
    urgency: str
    confidence: float
    disclaimer: str


@router.post("/predict", response_model=PredictOutput)
def predict(payload: PredictInput):
    engine = get_engine()
    if not engine.ready:
        raise HTTPException(status_code=503, detail="Model is not available. Train the model first.")
    if any(len(symptom) > MAX_SYMPTOM_LENGTH for symptom in payload.symptoms):
        raise HTTPException(
            status_code=422,
            detail=f"Each symptom must be at most {MAX_SYMPTOM_LENGTH} characters.",
        )
    try:
        return engine.predict(payload.symptoms, payload.duration_days, payload.severity)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Prediction failed.") from exc
