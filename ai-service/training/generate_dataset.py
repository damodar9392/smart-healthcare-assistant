"""Generate a reproducible synthetic symptom dataset for MVP training.

Labels are specialty categories only. Rows combine 1-4 symptoms from the
specialty's keyword bank, sometimes with a noise symptom, a random duration,
and a severity drawn with a mild-leaning distribution.
"""

import csv
import random
from pathlib import Path

random.seed(42)

SPECIALTY_BANKS = {
    "General Physician": [
        "fatigue", "tiredness", "weakness", "body ache", "loss of appetite",
        "malaise", "weight loss", "chills", "sweating", "low energy",
    ],
    "Dermatologist": [
        "rash", "itching", "redness", "skin peeling", "acne", "hives",
        "dry skin", "blisters", "eczema", "skin pigmentation", "scaly patches",
    ],
    "Dentist": [
        "toothache", "gum bleeding", "tooth sensitivity", "bad breath",
        "mouth ulcer", "jaw pain", "loose tooth", "swollen gums",
    ],
    "Cardiologist": [
        "chest pain", "chest tightness", "palpitations", "shortness of breath",
        "irregular heartbeat", "swelling in legs", "high blood pressure",
        "dizziness on exertion",
    ],
    "Neurologist": [
        "headache", "migraine", "dizziness", "vertigo", "numbness", "tingling",
        "seizures", "tremors", "memory loss", "blurred vision", "balance problems",
    ],
    "Orthopedic Specialist": [
        "back pain", "joint pain", "knee pain", "shoulder pain", "muscle pain",
        "fracture", "sprain", "stiffness", "neck pain", "hip pain",
    ],
    "ENT Specialist": [
        "ear pain", "hearing loss", "sore throat", "nasal congestion",
        "runny nose", "sinus pain", "tonsillitis", "ear discharge",
        "hoarseness", "blocked nose",
    ],
    "Gastroenterologist": [
        "abdominal pain", "nausea", "vomiting", "diarrhea", "constipation",
        "bloating", "heartburn", "indigestion", "stomach cramps", "blood in stool",
    ],
}

GENERIC_NOISE = [
    "mild discomfort", "occasional pain", "feeling unwell",
    "lack of energy", "sleep problems", "loss of appetite",
]

ROWS_PER_SPECIALTY = 250
OUT_PATH = Path(__file__).resolve().parents[1] / "data" / "dataset.csv"


def pick_symptoms(bank):
    count = random.randint(1, 4)
    symptoms = random.sample(bank, min(count, len(bank)))
    if random.random() < 0.15:
        symptoms.append(random.choice(GENERIC_NOISE))
    random.shuffle(symptoms)
    return symptoms


def main():
    rows = []
    for specialty, bank in SPECIALTY_BANKS.items():
        for _ in range(ROWS_PER_SPECIALTY):
            symptoms = pick_symptoms(bank)
            duration = random.randint(1, 30)
            severity = random.choices(["mild", "moderate", "severe"], weights=[0.45, 0.4, 0.15])[0]
            rows.append({
                "symptoms": ", ".join(symptoms),
                "duration_days": duration,
                "severity": severity,
                "specialty": specialty,
            })

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUT_PATH, "w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=["symptoms", "duration_days", "severity", "specialty"])
        writer.writeheader()
        writer.writerows(rows)
    print(f"Generated {len(rows)} rows -> {OUT_PATH}")


if __name__ == "__main__":
    main()