from pathlib import Path

import joblib
import numpy as np

from app.ml.preprocess import clean_text

MODELS_DIR = Path(__file__).resolve().parents[2] / "models"

EMERGENCY_KEYWORDS = [
    "chest pain",
    "shortness of breath",
    "breathing difficulty",
    "unconscious",
    "severe bleeding",
    "stroke",
    "paralysis",
    "seizure",
    "high fever",
]

DISCLAIMER = "This result is a specialist recommendation and not a medical diagnosis."


class ModelEngine:
    """Loads the trained artifacts once and serves predictions."""

    def __init__(self):
        self.vectorizer = None
        self.model = None
        self.label_encoder = None
        self.meta = {}

    def load(self):
        self.vectorizer = joblib.load(MODELS_DIR / "vectorizer.joblib")
        self.model = joblib.load(MODELS_DIR / "model.joblib")
        self.label_encoder = joblib.load(MODELS_DIR / "label_encoder.joblib")
        meta_path = MODELS_DIR / "meta.joblib"
        if meta_path.exists():
            self.meta = joblib.load(meta_path)
        return self

    @property
    def ready(self):
        return self.model is not None

    def predict(self, symptoms, duration_days, severity):
        if not self.ready:
            raise RuntimeError("Model artifacts are not loaded")
        text = " ".join(clean_text(symptom) for symptom in symptoms)
        vector = self.vectorizer.transform([text])
        probabilities = self.model.predict_proba(vector)[0]
        best_index = int(np.argmax(probabilities))
        specialty = self.label_encoder.inverse_transform([best_index])[0]
        confidence = round(float(probabilities[best_index]), 3)
        urgency = self._urgency(symptoms, duration_days, severity)
        return {
            "recommended_specialty": specialty,
            "urgency": urgency,
            "confidence": confidence,
            "disclaimer": DISCLAIMER,
        }

    @staticmethod
    def _urgency(symptoms, duration_days, severity):
        text = " ".join(symptoms).lower()
        if any(keyword in text for keyword in EMERGENCY_KEYWORDS):
            return "emergency"
        if severity == "severe" or duration_days > 14:
            return "high"
        if severity == "moderate" or duration_days > 7:
            return "medium"
        return "low"


_engine = None


def get_engine():
    global _engine
    if _engine is None:
        _engine = ModelEngine()
        try:
            _engine.load()
            print(f"[engine] Loaded model: {_engine.meta.get('model_name', 'unknown')}")
        except Exception as exc:
            print(f"[engine] Model artifacts unavailable: {exc}")
    return _engine