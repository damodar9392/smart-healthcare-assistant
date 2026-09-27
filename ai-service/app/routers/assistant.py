import logging
import re

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.ml.engine import get_engine
from app.services.llm_chat import ask_llm, llm_enabled
from app.services.rag import format_context, retrieve_context
from app.services.translate import from_english, to_english, translation_enabled
from app.services.translations import (
    SUPPORTED_LANGUAGES,
    get_local_health_reply,
    get_local_reply,
)
from app.services.voice import get_speaking_frame, get_voice

router = APIRouter()

logger = logging.getLogger(__name__)

MAX_MESSAGE_CHARS = 500

EMERGENCY_KEYWORDS = [
    "chest pain",
    "can't breathe",
    "cannot breathe",
    "shortness of breath",
    "breathing difficulty",
    "trouble breathing",
    "unconscious",
    "severe bleeding",
    "bleeding heavily",
    "stroke",
    "paralysis",
    "seizure",
    "suicide",
    "kill myself",
    "overdose",
]

SYMPTOM_HINTS = [
    "pain", "ache", "aching", "fever", "temperature", "cough", "cold", "flu",
    "headache", "migraine", "nausea", "vomit", "diarrhea", "diarrhoea",
    "constipation", "dizzy", "dizziness", "vertigo", "rash", "itch", "itchy",
    "tired", "fatigue", "weakness", "bleed", "sore", "throat", "breath",
    "wheeze", "stomach", "abdominal", "chest", "heart", "hurt", "hurts",
    "hurting", "sick", "ill", "unwell", "symptom", "swelling", "swollen",
    "burn", "injury", "injured", "sprain", "fracture", "numb", "tingling",
    "anxiety", "anxious", "depress", "depressed", "stress", "insomnia",
    "sleep", "vision", "blurred", "ear", "hearing", "skin", "joint", "knee",
    "back pain", "neck", "tooth", "teeth", "gum", "urine", "urination",
    "thirst", "weight loss", "weight gain", "bloating", "gas", "acne",
    "hair loss", "allergy", "allergic", "infection", "pus", "lump", "swollen gland",
]

APP_INTENTS = [
    ("book_appointment", [
        "book", "booking", "make an appointment", "schedule an appointment",
        "appointment slot", "available slot",
    ]),
    ("find_doctor", [
        "find a doctor", "find doctor", "search doctor", "doctor near me",
        "nearby doctor", "specialist near", "which doctor", "looking for a doctor",
    ]),
    ("medicine", [
        "medicine", "medication", "dosage", "tablet", "pill", "drug",
        "prescription", "paracetamol", "ibuprofen", "which medicine",
        "how many tablets", "painkiller", "antibiotic",
    ]),
    ("hours", [
        "working hours", "opening hours", "clinic timing", "what time do",
        "open on saturday", "open on sunday", "appointment timing",
        "consultation hours", "when is the doctor available", "office hours",
    ]),
    ("payment", [
        "payment", "pay", "fees", "how much", "credit card", "upi", "cash",
        "insurance claim", "reimbursement", "consultation fee", "charges",
    ]),
    ("privacy", [
        "privacy", "is my data safe", "data safe", "data secure", "health data",
        "encrypted", "confidential", "who can see", "my information safe",
        "secure my information",
    ]),
    ("about", [
        "what is this app", "how does this work", "what is smart healthcare",
        "about this platform", "what are the features", "what does this site do",
    ]),
    ("register", [
        "register", "sign up", "create account", "new account", "registration",
    ]),
    ("login", [
        "log in", "login", "sign in", "password", "forgot password", "can't access my account",
    ]),
    ("cancel_reschedule", [
        "cancel my appointment", "reschedule", "change my appointment",
        "cancel booking", "postpone",
    ]),
    ("notifications", [
        "notification", "reminder", "email alert", "remind me",
    ]),
    ("reviews", [
        "review", "rating", "leave feedback", "rate a doctor",
    ]),
    ("services", [
        "service", "lab test", "ambulance", "nursing", "physiotherapy",
        "home care", "pharmacy",
    ]),
    ("dashboard", [
        "dashboard", "my appointments page", "where do i see my appointment",
        "my profile", "medical record", "saved doctor",
    ]),
]

GREETING_PATTERN = re.compile(
    r"^(hi|hello|hey|good (morning|afternoon|evening)|namaste|salaam|"
    r"how are you|what can you do|who are you|help)\b[\s!.?]*$"
)

THANKS_PATTERN = re.compile(
    r"^(thank(s| you)?|thx|thanks a lot|thank you so much|appreciated|appreciate it)\b(?!\w)"
)

FAREWELL_PATTERN = re.compile(
    r"^(bye( bye)?|goodbye|see you( later)?|good night|g'night|take care|see you soon)\b(?!\w)"
)

REPLIES = {
    "emergency": (
        "This may be a medical emergency. Please call your local emergency number "
        "or go to the nearest hospital immediately. Do not wait for an online advice."
    ),
    "greeting": (
        "Hello! I am your AI health assistant. I can answer health questions in any language, "
        "suggest which medical specialty may help, and guide you through booking doctors on this site. "
        "How can I help you today?"
    ),
    "book_appointment": (
        "To book an appointment: open the Doctors page, search by city or specialty, open a verified "
        "doctor's profile, pick a free slot that suits you and confirm the booking. You will get a "
        "confirmation notification, and you can reschedule or cancel any time from your dashboard."
    ),
    "find_doctor": (
        "You can find verified doctors on the Doctors page — filter by city or specialty, check their "
        "profile, availability slots and patient reviews before booking. If you tell me your symptoms, "
        "I can also suggest which specialty to look for."
    ),
    "medicine": (
        "I can't prescribe or recommend a specific medicine. The right medicine depends on your full "
        "medical history and should be decided by a qualified doctor. Please book a verified doctor to "
        "discuss this safely — never start or stop medication on your own."
    ),
    "hours": (
        "Each doctor sets their own availability days and times. Open a doctor's profile on the Doctors "
        "page and book from the available slots listed there — those are the exact times the doctor has "
        "opened for appointments."
    ),
    "payment": (
        "Consultation charges are shown on each doctor's profile. This platform arranges the booking; "
        "payment is handled directly by the doctor's clinic, so please check their accepted modes of "
        "payment (cash, UPI, card) when you visit."
    ),
    "privacy": (
        "Your health data is protected here. Chat messages are stored encrypted, and your symptom "
        "analyses, bookings and records are only visible to you and the relevant doctor or admin."
    ),
    "about": (
        "I am the Smart Healthcare Assistant — a 24/7 AI helper that gives safe, temporary symptom "
        "guidance, recommends which specialty may help, and helps you find and book verified doctors "
        "near you. Describe your symptoms or ask me how to book, register or manage your account."
    ),
    "register": (
        "To create an account, click Register in the top menu, enter your name, email, phone number "
        "and a password with at least one letter and one number. You can join as a patient or a doctor."
    ),
    "login": (
        "Click Log In at the top, then enter your email and password. If you forgot your password or "
        "cannot access your account, please contact the site administrator for help."
    ),
    "cancel_reschedule": (
        "Open your dashboard, go to Appointments, and use the Reschedule or Cancel buttons next to the "
        "appointment. Cancellation rules (like minimum notice) apply, and you can rebook another slot right away."
    ),
    "notifications": (
        "You will receive email confirmations and reminders about upcoming appointments (check the console "
        "preview in development). All notifications also appear in the bell inbox inside your dashboard."
    ),
    "reviews": (
        "After visiting a doctor you can leave a star rating and written review from the doctor's profile "
        "or your dashboard. Reviews help other patients choose verified doctors with confidence."
    ),
    "services": (
        "The Services page lists healthcare services like lab tests, nursing and home care near you. "
        "Each service shows its category and distance so you can compare options quickly."
    ),
    "dashboard": (
        "Your dashboard is the main hub: patients see upcoming appointments, saved doctors, past symptom "
        "searches and notifications; doctors manage availability and today's schedule; admins handle "
        "verifications. Open it from the menu after logging in."
    ),
    "thanks": (
        "You're welcome! If you need anything else — checking a symptom, finding a doctor, booking an "
        "appointment or understanding the services — just ask."
    ),
    "farewell": (
        "Take care and stay healthy! You can come back anytime. Remember, if your symptoms worsen or "
        "become urgent, please see a doctor or contact emergency services immediately."
    ),
    "fallback": (
        "I can help you in any language: describe your symptoms and I will suggest a suitable medical "
        "specialty, or ask me how to register, find a verified doctor, book an appointment, or manage "
        "your bookings. What would you like to do?"
    ),
}

HEALTH_REPLY_TEMPLATE = (
    "Based on what you described, consider consulting a {specialty} specialist. {urgency_line} "
    "For a detailed assessment, use the Symptom Analysis page, then book a verified doctor nearby. "
    "Remember: this is general guidance, not a medical diagnosis."
)

FALLBACK_SPECIALTY_RULES = [
    ("Cardiologist", ["chest", "heart", "palpitation", "blood pressure", "breath"]),
    ("Neurologist", ["headache", "migraine", "dizzy", "dizziness", "vertigo", "numb", "tingling", "seizure"]),
    ("Pulmonologist", ["cough", "wheeze", "asthma", "cold", "flu", "lungs"]),
    ("Gastroenterologist", ["stomach", "abdominal", "nausea", "vomit", "diarrhea", "diarrhoea", "constipation", "bloating", "gas", "indigestion"]),
    ("Orthopedic Specialist", ["back", "joint", "knee", "muscle", "sprain", "fracture", "neck", "bone", "ankle"]),
    ("Dermatologist", ["rash", "itch", "itchy", "skin", "acne", "hair loss", "pimple"]),
    ("Ophthalmologist", ["eye pain", "eye", "vision", "blurred", "red eye"]),
    ("ENT Specialist", ["ear", "hearing", "throat", "sinus", "nose", "tonsil"]),
    ("Psychiatrist", ["anxiety", "anxious", "depress", "depressed", "stress", "insomnia", "sleep", "mood"]),
    ("Gynecologist", ["period", "menstrual", "pregnancy", "vaginal", "cramps"]),
    ("Pediatrician", ["child", "baby", "infant", "kid", "toddler"]),
    ("Urologist", ["urine", "urination", "kidney", "bladder", "urinary"]),
    ("Endocrinologist", ["thyroid", "diabetes", "sugar", "hormone", "weight gain", "weight loss"]),
]

_engine_warned = False


def _rule_specialty(text_lower):
    for specialty, keywords in FALLBACK_SPECIALTY_RULES:
        if any(keyword in text_lower for keyword in keywords):
            return specialty
    return "General Physician"


def _rule_urgency(text_lower, severity, duration_days):
    if any(keyword in text_lower for keyword in EMERGENCY_KEYWORDS):
        return "emergency"
    if severity == "severe" or duration_days > 14:
        return "high"
    if severity == "moderate" or duration_days > 7:
        return "medium"
    return "low"

URGENCY_LINES = {
    "low": "At the moment this does not look urgent, but monitor how you feel.",
    "medium": "It would be wise to see a doctor within the next few days.",
    "high": "Please try to see a doctor as soon as possible — within 24 hours.",
    "emergency": "This needs urgent attention — seek medical care immediately.",
}


class AssistantInput(BaseModel):
    message: str = Field(min_length=1, max_length=MAX_MESSAGE_CHARS)
    name: str = Field(default="", max_length=60)
    history: list[dict] = Field(default_factory=list, max_length=20)


class AssistantOutput(BaseModel):
    reply: str
    intent: str
    detectedLanguage: str | None = None
    translatedMessage: str | None = None
    recommendedSpecialty: str | None = None
    urgencyLevel: str | None = None
    confidenceScore: float | None = None
    supportedLanguages: dict[str, str] = Field(default_factory=lambda: SUPPORTED_LANGUAGES)
    voice: dict = Field(
        default_factory=lambda: {
            "name": "Google UK English Female",
            "lang": "en-GB",
            "pitch": 1.05,
            "rate": 1.0,
            "gender": "female",
        }
    )
    spokenIntro: str | None = None


def _base_lang(code):
    """Reduce a language tag like 'zh-CN' or 'pt-BR' to its base 'zh'/'pt'.

    Google's detection returns region-suffixed tags for some languages, which
    would otherwise miss the SUPPORTED_LANGUAGES / VOICE_CONFIG exact-key lookup.
    """
    if not code:
        return None
    return code.split("-")[0].split("_")[0].lower()


def _detect_intent(text_lower):
    if any(keyword in text_lower for keyword in EMERGENCY_KEYWORDS):
        return "emergency"
    if THANKS_PATTERN.match(text_lower.strip()):
        return "thanks"
    if FAREWELL_PATTERN.match(text_lower.strip()):
        return "farewell"
    if GREETING_PATTERN.match(text_lower.strip()):
        return "greeting"
    for intent, phrases in APP_INTENTS:
        if any(phrase in text_lower for phrase in phrases):
            return intent
    if any(hint in text_lower for hint in SYMPTOM_HINTS):
        return "health"
    return "fallback"


SEVERITY_KEYWORDS = {
    "severe": ["severe", "unbearable", "excruciating", "extreme", "very bad", "worst", "terrible"],
    "mild": ["mild", "slight", "little", "minor", "a bit"],
}

NUMBER_WORDS = {
    "one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
    "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10,
    "a couple": 2, "a few": 3, "few": 3,
}


def _estimate_severity(text_lower):
    for level in ("severe", "mild"):
        if any(kw in text_lower for kw in SEVERITY_KEYWORDS[level]):
            return level
    return "moderate"


def _estimate_duration_days(text_lower):
    match = re.search(r"\b(\d{1,2})\s*(day|days|week|weeks|month|months|year|years)", text_lower)
    if match:
        number = int(match.group(1))
        unit = match.group(2)
        if unit.startswith("day"):
            return number
        if unit.startswith("week"):
            return number * 7
        if unit.startswith("month"):
            return number * 30
        return number * 365
    for word, value in NUMBER_WORDS.items():
        if f"{word} " in text_lower or word in ("a couple", "a few", "few"):
            if f"{word} day" in text_lower or f"{word} week" in text_lower or f"{word} month" in text_lower:
                if "week" in text_lower:
                    return value * 7
                return value
    if "week" in text_lower and ("since" in text_lower or "for" in text_lower):
        return 7
    return 1


def _health_reply(text, lang_code=None, name=""):
    global _engine_warned
    engine = get_engine()
    result = {"specialty": None, "urgency": None, "confidence": None}

    text_lower = text.lower()
    severity = _estimate_severity(text_lower)
    duration_days = _estimate_duration_days(text_lower)

    if engine.ready:
        try:
            prediction = engine.predict([text], duration_days=duration_days, severity=severity)
            result = {
                "specialty": prediction["recommended_specialty"],
                "urgency": prediction["urgency"],
                "confidence": prediction["confidence"],
            }
        except Exception as exc:  # noqa: BLE001 - never let a model failure break the chat
            if not _engine_warned:
                _engine_warned = True
                logger.warning("Engine prediction failed (%s); using rule-based fallback", exc)

    if not result.get("specialty"):
        result = {
            "specialty": _rule_specialty(text_lower),
            "urgency": result.get("urgency") or _rule_urgency(text_lower, severity, duration_days),
            "confidence": result.get("confidence"),
        }

    urgency = result["urgency"] or "medium"
    specialty = result["specialty"] or "General Physician"

    intro = get_speaking_frame(lang_code or "en", name or "dear")

    if lang_code and lang_code != "en":
        local_reply = get_local_health_reply(lang_code, specialty, urgency)
        if local_reply:
            return local_reply, result, intro

    reply = HEALTH_REPLY_TEMPLATE.format(
        specialty=specialty,
        urgency_line=URGENCY_LINES.get(urgency, URGENCY_LINES["medium"]),
    )

    try:
        context = retrieve_context(text)
        if context:
            guidance_lines = [
                f"• {entry['title']}: {entry['content']}"
                for entry in context
            ]
            reply += (
                "\n\nQuick approved guidance you may find useful:\n"
                + "\n".join(guidance_lines)
            )
    except Exception:  # noqa: BLE001 - RAG failure must never break the chat
        logger.warning("RAG retrieval failed; continuing without context", exc_info=True)

    return reply, result, intro


def _build_reply(intent, message, lang_code=None, name=""):
    if intent == "health":
        return _health_reply(message, lang_code, name)
    if intent == "emergency":
        extra = {"specialty": "Emergency Medicine", "urgency": "emergency", "confidence": 0.9}
        intro = get_speaking_frame(lang_code or "en", name or "dear")
        if lang_code and lang_code != "en":
            local_reply = get_local_reply(intent, lang_code)
            if local_reply:
                return local_reply, extra, intro
        return REPLIES.get(intent, REPLIES["fallback"]), extra, intro
    intro = get_speaking_frame(lang_code or "en", name or "dear")
    if lang_code and lang_code != "en":
        local_reply = get_local_reply(intent, lang_code)
        if local_reply:
            return local_reply, {}, intro
    return REPLIES.get(intent, REPLIES["fallback"]), {}, intro


@router.post("/assistant", response_model=AssistantOutput)
def assistant(payload: AssistantInput):
    translate = translation_enabled()

    english_text, detected_language = to_english(payload.message) if translate else (None, None)
    if translate and not english_text:
        raise HTTPException(
            status_code=503,
            detail="Translation service is unreachable. Please try again shortly.",
        )

    work_text = english_text or payload.message
    detected_language = _base_lang(detected_language)
    intent = _detect_intent(work_text.lower())
    emergency = intent == "emergency"

    llm_result = None
    if not emergency and llm_enabled():
        try:
            context = None
            if intent in ("health", "medicine"):
                try:
                    context = format_context(retrieve_context(work_text, top_k=3))
                except Exception as exc:  # noqa: BLE001 - never let RAG break chat
                    logger.warning("RAG retrieval failed (%s); continuing without context", exc)
                    context = None
            llm_result = ask_llm(work_text, payload.history, context)
        except Exception as exc:  # noqa: BLE001 - any LLM failure falls back to the offline engine
            logger.warning("LLM chat unavailable (%s); using offline rule engine", exc)
            llm_result = None

    if llm_result and llm_result.get("reply"):
        result_lang = llm_result.get("detectedLanguage") or detected_language
        result_intent = llm_result.get("intent") or intent or "fallback"
        voice = get_voice(result_lang) if result_lang else get_voice("en")
        spoken_intro = get_speaking_frame(result_lang or "en", payload.name or "dear")
        return AssistantOutput(
            reply=llm_result.get("reply"),
            intent=result_intent,
            detectedLanguage=result_lang,
            translatedMessage=english_text,
            recommendedSpecialty=llm_result.get("recommendedSpecialty"),
            urgencyLevel=llm_result.get("urgencyLevel"),
            confidenceScore=llm_result.get("confidenceScore"),
            voice=voice,
            spokenIntro=spoken_intro,
        )

    reply, extra, intro = _build_reply(intent, work_text, detected_language, payload.name)

    localized = None
    if translate and detected_language and detected_language != "en" and detected_language not in SUPPORTED_LANGUAGES:
        localized = from_english(reply, detected_language)
        if localized and intro:
            from_english_intro = from_english(intro, detected_language)
            intro = from_english_intro or intro
    final_reply = localized or reply

    voice = get_voice(detected_language) if detected_language else get_voice("en")

    return AssistantOutput(
        reply=final_reply,
        intent=intent,
        detectedLanguage=detected_language,
        translatedMessage=english_text,
        recommendedSpecialty=extra.get("specialty"),
        urgencyLevel=extra.get("urgency"),
        confidenceScore=extra.get("confidence"),
        voice=voice,
        spokenIntro=intro,
    )
