"""Optional OpenAI GPT-4o powered chat replies.

This integration is strictly opt-in: it only activates when OPENAI_API_KEY is
set. When the key is missing (or an OpenAI call fails) the assistant keeps
using the built-in offline rule engine, so the service never breaks.

PRIVACY: enabling OPENAI_API_KEY sends the user's messages (which may contain
health information) to OpenAI. Keep TRANSLATE_ENABLED=false so non-English
messages go to OpenAI as-is (GPT-4o is strongly multilingual) and are not
routed to a secondary translation provider.
"""

import json
import logging
import os

logger = logging.getLogger(__name__)

INTENTS = [
    "emergency",
    "greeting",
    "health",
    "book_appointment",
    "find_doctor",
    "medicine",
    "hours",
    "payment",
    "privacy",
    "about",
    "register",
    "login",
    "cancel_reschedule",
    "notifications",
    "reviews",
    "services",
    "dashboard",
    "thanks",
    "farewell",
    "fallback",
]

SPECIALTIES = [
    "General Medicine",
    "Cardiology",
    "Dermatology",
    "Gastroenterology",
    "Neurology",
    "Orthopedics",
    "Pediatrics",
    "ENT",
    "Ophthalmology",
    "Psychiatry",
    "Gynecology",
    "Emergency Medicine",
]

SYSTEM_PROMPT = (
    "You are the AI health assistant for the 'Smart Healthcare Assistant' platform. "
    "You give general, temporary health guidance and help patients use the platform.\n\n"
    "STRICT SAFETY RULES:\n"
    "- You are NOT a doctor and must never diagnose, prescribe, or give definitive medical advice.\n"
    "- If the user mentions anything that could be a medical emergency "
    "(e.g. chest pain, trouble breathing, severe bleeding, unconsciousness, stroke, "
    "seizure, suicidal thoughts, overdose), IMMEDIATELY tell them to call the local "
    "emergency number (112/911/108) or go to the nearest hospital now. Do not suggest self-care.\n"
    "- Set urgencyLevel to 'emergency' in exactly these cases.\n"
    "- Never invent doctors, hospitals, prices, or availability. Direct users to the site's "
    "Doctors page to book verified doctors.\n"
    "- Never recommend specific medicines or dosages.\n\n"
    "STYLE:\n"
    "- Warm, clear, concise (2-5 short sentences; use brief bullet points when helpful).\n"
    "- Reply in the SAME language the user used, and set detectedLanguage to the best "
    "ISO-639-1 guess of that language.\n"
    "- You can help with the platform: registering as a patient or doctor, finding/filtering "
    "verified doctors, booking/rescheduling/cancelling appointments (24h notice, max 2 "
    "reschedules), symptom analysis, doctor-verified guidance, reviews and ratings, the "
    "services directory (labs, home care, pharmacy), notifications/reminders, and the dashboard.\n\n"
    f"Allowed intent values: {', '.join(INTENTS)}.\n"
    f"Recommended specialty values (or null): {', '.join(SPECIALTIES)}.\n"
    "Allowed urgencyLevel values: low, medium, high, emergency (or null).\n\n"
    "Respond with ONLY a single valid JSON object of this exact shape:\n"
    '{"reply": "...", "intent": "...", "detectedLanguage": "en", '
    '"recommendedSpecialty": "Cardiology" or null, "urgencyLevel": "low" or null, '
    '"confidenceScore": 0.0-1.0 or null}\n'
    "The 'reply' must be your full answer, written in the user's language."
)


def llm_enabled() -> bool:
    return bool(os.getenv("OPENAI_API_KEY"))


def _normalise_history(history):
    if not history:
        return []
    cleaned = []
    for item in history[-10:]:
        if not isinstance(item, dict):
            continue
        role = item.get("role")
        content = item.get("content")
        if role not in ("user", "assistant") or not content:
            continue
        cleaned.append({"role": role, "content": str(content)[:2000]})
    return cleaned


def _parse_response(content):
    result = {
        "reply": None,
        "intent": None,
        "detectedLanguage": None,
        "recommendedSpecialty": None,
        "urgencyLevel": None,
        "confidenceScore": None,
    }
    if not content:
        return result
    if isinstance(content, dict):
        parsed = content
    else:
        text = str(content).strip()
        try:
            parsed = json.loads(text)
        except json.JSONDecodeError:
            start = text.find("{")
            end = text.rfind("}")
            if start == -1 or end <= start:
                logger.warning("LLM returned an unparseable reply: %.120s", text)
                return result
            try:
                parsed = json.loads(text[start : end + 1])
            except json.JSONDecodeError:
                logger.warning("LLM returned malformed JSON: %.120s", text)
                return result

    if isinstance(parsed, dict):
        result.update({key: parsed.get(key) for key in result})
    if result["intent"] not in INTENTS:
        result["intent"] = None
    if result["urgencyLevel"] not in ("low", "medium", "high", "emergency"):
        result["urgencyLevel"] = None
    detected = result["detectedLanguage"]
    if detected:
        result["detectedLanguage"] = str(detected).split("-")[0].split("_")[0].lower()
    confidence = result["confidenceScore"]
    result["confidenceScore"] = (
        float(confidence) if isinstance(confidence, (int, float)) and 0 <= float(confidence) <= 1 else None
    )
    return result


def ask_llm(message, history=None, context=None):
    """Ask GPT-4o for a structured reply. Raises on any failure so the caller
    can fall back to the offline rule engine.

    `context` is an optional grounding block retrieved by the local RAG layer
    (see app.services.rag) that the model is told to use as the source of truth
    for the topic while still obeying the safety rules."""
    from openai import OpenAI  # lazy import: rules mode needs no dependency

    client = OpenAI(
        api_key=os.getenv("OPENAI_API_KEY"),
        timeout=float(os.getenv("OPENAI_TIMEOUT_SECONDS", "30")),
    )
    model = os.getenv("OPENAI_MODEL", os.getenv("OPENAI_CHAT_MODEL", "gpt-4o"))
    max_tokens = int(os.getenv("OPENAI_MAX_TOKENS", "600"))

    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    if context:
        messages.append(
            {
                "role": "system",
                "content": (
                    "GROUNDING FACTS (use these as the source of truth where they "
                    "match the user's topic, and stay consistent with them):\n"
                    + context
                ),
            }
        )
    messages.extend(_normalise_history(history))
    messages.append(
        {
            "role": "user",
            "content": f"{message}\n(RESPOND ONLY WITH THE JSON OBJECT.)",
        }
    )

    response = client.chat.completions.create(
        model=model,
        messages=messages,
        temperature=0.4,
        max_tokens=max_tokens,
        response_format={"type": "json_object"},
    )
    content = response.choices[0].message.content
    return _parse_response(content)