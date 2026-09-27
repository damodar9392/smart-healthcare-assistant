# AI/ML Service — Symptom → Specialty Classification

## Overview

The `ai-service/` runs a FastAPI app that classifies user-reported symptoms into one of
eight specialist categories and a rule-based urgency level. The model never claims to
diagnose diseases — its output is a **specialist recommendation** plus a disclaimer.

Labels (MVP): `General Physician`, `Dermatologist`, `Dentist`, `Cardiologist`,
`Neurologist`, `Orthopedic Specialist`, `ENT Specialist`, `Gastroenterologist`.

```
ai-service/
├── app/
│   ├── ml/
│   │   ├── preprocess.py     # text cleaning (shared by training + serving)
│   │   └── engine.py         # lazy artifact loading + predict/urgency logic
│   └── routers/
│       ├── predict.py        # POST /predict  (new contract)
│       ├── analysis.py       # POST /analyze  (legacy contract for the Node backend)
│       ├── assistant.py      # POST /assistant (multilingual chat)
│       └── metrics.py        # GET /model/metrics
├── training/
│   ├── generate_dataset.py   # synthetic dataset generator (seeded, reproducible)
│   └── train.py              # TF-IDF + 3 models + holdout & CV metrics + joblib persistence
├── tests/                    # pytest: preprocess, engine urgency/predict, API endpoints
├── data/dataset.csv          # 2000 labeled rows (8 x 250)
├── models/                   # joblib artifacts (gitignored)
│   ├── vectorizer.joblib     # fitted TF-IDF
│   ├── model.joblib          # best classifier
│   ├── label_encoder.joblib  # specialty labels
│   ├── meta.joblib           # model name, metrics, dataset info
│   └── comparison.json       # full metrics table
└── main.py
```

## 1. Dataset structure

`data/dataset.csv` — one row per symptom report:

```csv
symptoms,duration_days,severity,specialty
"itchy rash, redness, dry skin",5,moderate,Dermatologist
"headache, dizziness, blurred vision",3,moderate,Neurologist
"chest pain, shortness of breath",1,severe,Cardiologist
```

- `symptoms` — comma-separated symptom phrases (raw text, preprocessed at train time).
- `duration_days` / `severity` — used for urgency, not for specialty classification.
- `specialty` — the target label (one of the 8 categories).

The generator builds 250 rows per specialty (1-4 symptoms from a keyword bank, 15% chance
of a noise symptom, random duration 1-30, severity weighted toward mild). Seeded with
`random.seed(42)` so runs are reproducible.

## 2. How the real dataset should be collected and labeled

Synthetic data is only a starter. Production data needs:

- **Sources**: anonymized clinic triage logs, doctor-reviewed remedy submissions, curated
  symptom catalogs, and public medical symptom-to-specialty references.
- **Labeling**: each record must be labeled by a qualified doctor ("which specialist would
  you refer this patient to?"). Two or more independent labels per record with agreement
  check (kappa) resolve ambiguity; disagreements go to a senior reviewer.
- **Quality rules**: never label "diagnosis" — label only referral category; keep
  severity/duration in separate columns (they drive urgency); deduplicate and normalize
  phrasing; strip PHI/PII before storage.
- **Balance**: keep the 8 classes roughly balanced; collect harder cases (overlapping
  symptoms like "chest pain" vs "heartburn") deliberately.
- **Splits**: fixed stratified 80/20 train/test (see `train.py`); a held-out validation
  set for threshold tuning.

> Because the synthetic data is keyword-separable, models reach ~1.0 F1 here. On real
> collected data expect meaningfully lower scores — the pipeline, not the number, is the
> deliverable of this phase.

## 3. Preprocessing

`app/ml/preprocess.py` — applied identically at train and serve time:

- lowercase, strip punctuation/digits (regex `[^a-z\s]`)
- remove stopwords and single-character tokens
- join into one whitespace-separated string per row

## 4. TF-IDF vectorization

`TfidfVectorizer(ngram_range=(1, 2), min_df=2, max_features=3000)` — unigram + bigram
counts weighted by inverse document frequency, fitted on the training split only
(no leakage from the test set).

## 5-7. Model comparison and selection

Run: `python -m training.train` (results in `models/comparison.json`).

Each candidate is evaluated two ways:

- **Holdout** — fixed stratified 80/20 split, vectorizer fitted on the train part only.
- **Cross-validation** — `StratifiedKFold(n_splits=5, shuffle=True, random_state=42)` with a
  fresh `Pipeline(TfidfVectorizer + classifier)` per fold, so the vectorizer is refit inside
  every fold (no leakage). Mean ± std across folds is stored under each model's `"cv"` key.

| Model               | Holdout F1 | CV F1 (5-fold)   |
| ------------------- | ---------- | ---------------- |
| logistic_regression | 1.0000     | 0.9985 ± 0.0012  |
| random_forest       | 1.0000     | 0.9980 ± 0.0019  |
| naive_bayes         | 0.9925     | 0.9955 ± 0.0010  |

Selection rule: highest weighted F1 with a preference for the simpler model on ties.
**Logistic Regression was selected** — it matches Random Forest here, trains instantly,
generalizes well on small text data, and exposes calibrated-ish probabilities.

## 8. Persistence

```python
joblib.dump(vectorizer, "models/vectorizer.joblib")
joblib.dump(model, "models/model.joblib")
joblib.dump(label_encoder, "models/label_encoder.joblib")
joblib.dump(meta, "models/meta.joblib")
```

`app/ml/engine.py` loads them once (lazy singleton) and serves
`predict(symptoms, duration_days, severity)`.

## 9. FastAPI endpoint

### POST /predict

```json
// request
{
  "symptoms": ["headache", "dizziness"],
  "duration_days": 3,
  "severity": "moderate"
}

// response
{
  "recommended_specialty": "Neurologist",
  "urgency": "medium",
  "confidence": 0.82,
  "disclaimer": "This result is a specialist recommendation and not a medical diagnosis."
}
```

- Validation via Pydantic: `symptoms` non-empty, `duration_days` 1-365,
  `severity` in mild|moderate|severe. Invalid input → 422.
- `urgency` is rule-based, not modeled: emergency keywords → `emergency`;
  `severe` or >14 days → `high`; `moderate` or >7 days → `medium`; else `low`.
- `confidence` is the model's top-class probability, rounded to 3 decimals.
- If artifacts are missing → `503 { "detail": "Model is not available..." }`.
- `GET /health` reports `{ status, model }` (loaded model name).
- `GET /model/metrics` reports the trained model's evaluation data:
  `{ model_name, trained_at, holdout_metrics, cross_validation, dataset, vectorizer, comparison }`
  (sourced from `meta.joblib`; `503` when the model is untrained).

POST /analyze keeps the legacy contract (camelCase, `urgencyLevel`, `confidenceScore`,
`summary`) used by the Node backend, mapped from the same engine.

## 10. How Node.js communicates with this service

The Express backend (`backend/src/services/aiService.js`) is the only Node caller.
It uses the global `fetch` with a 3-second timeout:

```js
const response = await fetch(`${process.env.AI_SERVICE_URL}/predict`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    symptoms: [...payload.symptoms, ...payload.additionalSymptoms],
    duration_days: payload.durationInDays,
    severity: payload.severity,
  }),
  signal: controller.signal, // AbortController -> 3s timeout
});
```

It maps snake_case → camelCase for the frontend contract:

| AI service            | Backend response (to frontend) |
| --------------------- | ------------------------------ |
| `recommended_specialty` | `recommendedSpecialty`         |
| `urgency`             | `urgencyLevel` (low→routine, medium→soon, high→urgent, emergency→emergency) |
| `confidence`          | `confidenceScore`              |
| `disclaimer`          | appended disclaimer in controller |

On network error / non-2xx / timeout, `aiService.js` falls back to an in-Node rule-based
mock so the patient flow never breaks. The AI service is a private layer: the frontend
never talks to it directly.

## Running

```sh
cd ai-service
python -m venv .venv && .venv\Scripts\activate   # Windows
pip install -r requirements.txt
python -m training.generate_dataset              # (re)build data/dataset.csv
python -m training.train                         # train + save artifacts (holdout + 5-fold CV)
python -m pytest tests                           # model + API tests
uvicorn main:app --reload --port 8000
```

Tests live in `tests/` (`test_preprocess.py`, `test_engine.py`, `test_api.py`) and use the
FastAPI `TestClient`; API tests skip cleanly when `models/` artifacts are absent.

## Next phase ideas

- Replace synthetic data with doctor-labeled real records; retrain and compare.
- Persist urgency as a second model or calibrated thresholds.