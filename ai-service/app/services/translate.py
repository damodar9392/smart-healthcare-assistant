import json
import os
from urllib.parse import quote
from urllib.request import Request, urlopen

TRANSLATE_URL = "https://translate.googleapis.com/translate_a/single"
TIMEOUT_SECONDS = 8
USER_AGENT = "Mozilla/5.0 (SmartHealthcareAssistant)"


def translation_enabled():
    """Whether third-party (Google) translation is allowed.

    Defaults to OFF for privacy: user messages may contain health data and
    must not leave the system unless the operator explicitly opts in.
    """
    return os.getenv("TRANSLATE_ENABLED", "false").strip().lower() in ("1", "true", "yes", "on")


def translate_text(text, target="en", source="auto"):
    """Translate text via Google's free endpoint.

    Returns (translated_text, detected_language); (None, None) on failure.
    """
    if not text or not text.strip():
        return None, None
    url = f"{TRANSLATE_URL}?client=gtx&sl={source}&tl={target}&dt=t&q={quote(text)}"
    request = Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urlopen(request, timeout=TIMEOUT_SECONDS) as response:
            data = json.loads(response.read().decode("utf-8"))
    except Exception:
        return None, None

    segments = data[0] or []
    translated = "".join(segment[0] for segment in segments if segment and segment[0]).strip()
    detected = data[2] if len(data) > 2 and isinstance(data[2], str) else None
    return (translated or None), detected


def to_english(text):
    """Detect language and translate to English. Returns (english_text, detected_lang)."""
    if not translation_enabled():
        return None, None
    return translate_text(text, target="en", source="auto")


def from_english(text, target):
    """Translate English text back to the target language. Returns text or None."""
    if not translation_enabled():
        return None
    if not target or target == "en":
        return None
    translated, _ = translate_text(text, target=target, source="en")
    return translated
