from pathlib import Path
import threading
import time

import joblib
import numpy as np

from app.ml.preprocess import clean_text

MODELS_DIR = Path(__file__).resolve().parents[2] / "models"
LOAD_RETRY_SECONDS = 30.0

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
_engine_lock = threading.Lock()
_retry_after = 0.0


def get_engine():
    global _engine, _retry_after
    if _engine is not None:
        return _engine
    with _engine_lock:
        if _engine is not None:
            return _engine
        now = time.monotonic()
        if now < _retry_after:
            return ModelEngine()
        candidate = ModelEngine()
        try:
            candidate.load()
        except Exception as exc:
            _retry_after = now + LOAD_RETRY_SECONDS
            print(f"[engine] Model artifacts unavailable: {exc}", flush=True)
            return candidate
        _engine = candidate
        print(
            f"[engine] Loaded model: {candidate.meta.get('model_name', 'unknown')}",
            flush=True,
        )
        return _engine