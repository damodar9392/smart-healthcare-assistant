from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.ml.engine import get_engine

router = APIRouter()

URGENCY_MAP = {
    "low": "routine",
    "medium": "soon",
    "high": "urgent",
    "emergency": "emergency",
}


class SymptomInput(BaseModel):
    symptoms: list[str] = Field(min_length=1)
    additionalSymptoms: list[str] = Field(default_factory=list)
    durationInDays: int = Field(ge=1, le=365)
    severity: str = Field(pattern="^(mild|moderate|severe)$")
    description: str = ""


class AnalysisResult(BaseModel):
    recommendedSpecialty: str
    urgencyLevel: str
    confidenceScore: float
    summary: str


@router.post("/analyze", response_model=AnalysisResult)
def analyze(payload: SymptomInput):
    """Model-backed analysis in the legacy contract used by the Node.js backend."""
    engine = get_engine()
    if not engine.ready:
        raise HTTPException(status_code=503, detail="Model is not available. Train the model first.")
    all_symptoms = payload.symptoms + payload.additionalSymptoms
    result = engine.predict(all_symptoms, payload.durationInDays, payload.severity)
    return AnalysisResult(
        recommendedSpecialty=result["recommended_specialty"],
        urgencyLevel=URGENCY_MAP.get(result["urgency"], "routine"),
        confidenceScore=result["confidence"],
        summary=(
            f"Based on the reported symptoms, the probable condition category points to "
            f"{result['recommended_specialty']}. This is a category estimate, not a diagnosis."
        ),
    )