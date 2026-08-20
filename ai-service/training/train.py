"""Train candidate classifiers on symptom text (TF-IDF), compare metrics,
and persist the best model plus artifacts with joblib.

Run from the ai-service directory:
    python -m training.train
"""

import json
from datetime import datetime, timezone
from pathlib import Path

import joblib
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report, f1_score, precision_score, recall_score
from sklearn.model_selection import train_test_split
from sklearn.naive_bayes import MultinomialNB
from sklearn.preprocessing import LabelEncoder

from app.ml.preprocess import clean_text

ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "data" / "dataset.csv"
MODELS_DIR = ROOT / "models"

MODELS = {
    "logistic_regression": LogisticRegression(max_iter=1000, C=1.0, class_weight="balanced", random_state=42),
    "naive_bayes": MultinomialNB(alpha=0.5),
    "random_forest": RandomForestClassifier(n_estimators=200, class_weight="balanced", random_state=42, n_jobs=-1),
}


def evaluate(model, X_test_vec, y_test, label_encoder):
    predictions = model.predict(X_test_vec)
    return {
        "accuracy": accuracy_score(y_test, predictions),
        "precision": precision_score(y_test, predictions, average="weighted", zero_division=0),
        "recall": recall_score(y_test, predictions, average="weighted", zero_division=0),
        "f1": f1_score(y_test, predictions, average="weighted", zero_division=0),
    }, predictions


def main():
    if not DATA_PATH.exists():
        raise SystemExit(f"Dataset not found: {DATA_PATH}. Run generate_dataset.py first.")

    data = pd.read_csv(DATA_PATH)
    data["clean"] = data["symptoms"].apply(clean_text)

    label_encoder = LabelEncoder().fit(data["specialty"])
    y = label_encoder.transform(data["specialty"])

    X_train, X_test, y_train, y_test = train_test_split(
        data["clean"], y, test_size=0.2, random_state=42, stratify=y
    )

    vectorizer = TfidfVectorizer(ngram_range=(1, 2), min_df=2, max_features=3000)
    X_train_vec = vectorizer.fit_transform(X_train)
    X_test_vec = vectorizer.transform(X_test)

    comparison = []
    best = None
    for name, model in MODELS.items():
        model.fit(X_train_vec, y_train)
        metrics, predictions = evaluate(model, X_test_vec, y_test, label_encoder)
        comparison.append({"model": name, **metrics})
        print(f"\n=== {name} ===")
        print(
            f"Accuracy: {metrics['accuracy']:.4f} | Precision: {metrics['precision']:.4f} | "
            f"Recall: {metrics['recall']:.4f} | F1: {metrics['f1']:.4f}"
        )
        print(classification_report(y_test, predictions, target_names=label_encoder.classes_, zero_division=0))
        if best is None or metrics["f1"] > best["metrics"]["f1"]:
            best = {"name": name, "metrics": metrics, "estimator": model}

    comparison.sort(key=lambda row: row["f1"], reverse=True)

    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(vectorizer, MODELS_DIR / "vectorizer.joblib")
    joblib.dump(best["estimator"], MODELS_DIR / "model.joblib")
    joblib.dump(label_encoder, MODELS_DIR / "label_encoder.joblib")

    meta = {
        "model_name": best["name"],
        "metrics": best["metrics"],
        "comparison": comparison,
        "dataset": {
            "path": str(DATA_PATH),
            "rows": len(data),
            "specialties": sorted(label_encoder.classes_.tolist()),
        },
        "vectorizer": {"ngram_range": [1, 2], "min_df": 2, "max_features": 3000},
        "trained_at": datetime.now(timezone.utc).isoformat(),
    }
    joblib.dump(meta, MODELS_DIR / "meta.joblib")
    (MODELS_DIR / "comparison.json").write_text(json.dumps(comparison, indent=2), encoding="utf-8")

    print("\n--- Comparison (by weighted F1) ---")
    for row in comparison:
        print(f"{row['model']:<20} acc={row['accuracy']:.4f} prec={row['precision']:.4f} rec={row['recall']:.4f} f1={row['f1']:.4f}")
    print(f"\nBest model: {best['name']} (F1 {best['metrics']['f1']:.4f}) -> artifacts saved to {MODELS_DIR}")


if __name__ == "__main__":
    main()