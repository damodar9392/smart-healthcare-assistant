"""Generate a reproducible synthetic symptom dataset for MVP training.

Labels are specialty categories only. Rows wrap 1-4 symptoms from the
specialty's keyword bank in natural sentence phrasing so the classifier
learns to generalise beyond bare keyword lists, sometimes with a noise
symptom, a random duration, and a severity with a mild-leaning mix.
"""

import csv
import random
from pathlib import Path

random.seed(42)

SPECIALTY_BANKS = {
    "General Physician": [
        "fatigue", "tiredness", "weakness", "body ache", "loss of appetite",
        "malaise", "weight loss", "chills", "sweating", "low energy",
        "feeling feverish", "constant tiredness", "general weakness",
    ],
    "Dermatologist": [
        "rash", "itching", "redness", "skin peeling", "acne", "hives",
        "dry skin", "blisters", "eczema", "skin pigmentation", "scaly patches",
        "itchy bumps", "flaky skin", "red patches on skin",
    ],
    "Dentist": [
        "toothache", "gum bleeding", "tooth sensitivity", "bad breath",
        "mouth ulcer", "jaw pain", "loose tooth", "swollen gums",
        "tooth pain", "bleeding gums while brushing",
    ],
    "Cardiologist": [
        "chest pain", "chest tightness", "palpitations", "shortness of breath",
        "irregular heartbeat", "swelling in legs", "high blood pressure",
        "dizziness on exertion", "racing heart", "pressure in chest",
    ],
    "Neurologist": [
        "headache", "migraine", "dizziness", "vertigo", "numbness", "tingling",
        "seizures", "tremors", "memory loss", "blurred vision", "balance problems",
        "throbbing headache", "numb hands", "frequent migraines",
    ],
    "Orthopedic Specialist": [
        "back pain", "joint pain", "knee pain", "shoulder pain", "muscle pain",
        "fracture", "sprain", "stiffness", "neck pain", "hip pain",
        "lower back stiffness", "ankle sprain", "aching knees",
    ],
    "ENT Specialist": [
        "ear pain", "hearing loss", "sore throat", "nasal congestion",
        "runny nose", "sinus pain", "tonsillitis", "ear discharge",
        "hoarseness", "blocked nose", "ringing in ear", "scratchy throat",
    ],
    "Gastroenterologist": [
        "abdominal pain", "nausea", "vomiting", "diarrhea", "constipation",
        "bloating", "heartburn", "indigestion", "stomach cramps", "blood in stool",
        "stomach upset", "loose stools", "burning in stomach",
    ],
    "Ophthalmologist": [
        "eye pain", "red eye", "blurry vision", "blurred vision", "itchy eyes",
        "dry eyes", "watery eyes", "eye discharge", "swollen eyelid",
        "floaters", "sensitivity to light", "burning eyes", "eyestrain",
        "double vision",
    ],
    "Pulmonologist": [
        "persistent cough", "dry cough", "wheezing", "chest congestion",
        "breathlessness", "coughing up phlegm", "noisy breathing",
        "chronic cough", "asthma symptom", "tight chest with cough",
        "rattling cough", "difficulty breathing on exertion",
    ],
    "Gynecologist": [
        "irregular periods", "painful periods", "missed period",
        "vaginal itching", "vaginal discharge", "pelvic pain",
        "heavy periods", "spotting between periods", "breast pain",
        "menopause symptoms", "pregnancy concern",
    ],
    "Pediatrician": [
        "high fever in child", "baby cough", "infant feeding problem",
        "child rash", "toddler fever", "colic", "vomiting in child",
        "measles symptoms", "child diarrhea", "teething discomfort",
        "ear infection in child", "child growth concern",
    ],
    "Psychiatrist": [
        "anxiety", "panic attack", "depression", "low mood", "stress",
        "insomnia", "difficulty sleeping", "mood swings", "racing thoughts",
        "constant worry", "lack of interest", "restlessness",
        "overthinking", "nervousness",
    ],
    "Endocrinologist": [
        "excessive thirst", "frequent urination", "unexplained weight loss",
        "unexplained weight gain", "excessive hunger", "tingling in feet",
        "tingling in hands", "thyroid swelling", "goiter",
        "cold intolerance", "heat intolerance", "hair thinning",
    ],
    "Urologist": [
        "painful urination", "burning during urination", "blood in urine",
        "kidney stone pain", "flank pain", "difficulty urinating",
        "weak urine stream", "urge to urinate at night", "prostate problem",
        "kidney pain",
    ],
}

GENERIC_NOISE = [
    "mild discomfort", "occasional pain", "feeling unwell",
    "lack of energy", "sleep problems", "loss of appetite",
]

SENTENCE_TEMPLATES = [
    "i have {s}",
    "i am having {s}",
    "suffering from {s}",
    "feeling {s}",
    "my {s} is bothering me",
    "started getting {s}",
    "i have been dealing with {s}",
    "{s} since a few days",
    "{s} since morning",
    "what should i do about {s}",
    "i keep getting {s}",
]

ROWS_PER_SPECIALTY = 300
OUT_PATH = Path(__file__).resolve().parents[1] / "data" / "dataset.csv"


def pick_symptoms(bank):
    count = random.randint(1, 4)
    symptoms = random.sample(bank, min(count, len(bank)))
    if random.random() < 0.15:
        symptoms.append(random.choice(GENERIC_NOISE))
    random.shuffle(symptoms)
    return symptoms


def build_sentence(bank):
    symptoms = pick_symptoms(bank)
    if len(symptoms) == 1:
        symptom_text = symptoms[0]
        return symptoms, random.choice(SENTENCE_TEMPLATES).format(s=symptom_text)
    joined = " and ".join(symptoms)
    template = random.choice(SENTENCE_TEMPLATES)
    return symptoms, template.format(s=joined)


def main():
    rows = []
    for specialty, bank in SPECIALTY_BANKS.items():
        for _ in range(ROWS_PER_SPECIALTY):
            symptoms, sentence = build_sentence(bank)
            duration = random.randint(1, 30)
            severity = random.choices(["mild", "moderate", "severe"], weights=[0.45, 0.4, 0.15])[0]
            rows.append({
                "symptoms": sentence,
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