from unittest.mock import patch

import pytest


MOCK_TRANSLATE_SUCCESS = ("Hello, I have a headache", "es")
MOCK_TRANSLATE_ENGLISH = ("Hello", "en")
MOCK_RETRANSLATE = ("Hola, tengo dolor de cabeza", "es")


@patch("app.routers.assistant.to_english", return_value=MOCK_TRANSLATE_SUCCESS)
def test_assistant_greeting_in_foreign_language(mock_translate, client):
    response = client.post("/assistant", json={"message": "Hola, tengo dolor de cabeza"})
    assert response.status_code == 200
    body = response.json()
    assert body["detectedLanguage"] == "es"
    assert body["translatedMessage"] == "Hello, I have a headache"


@patch("app.routers.assistant.to_english", return_value=MOCK_TRANSLATE_ENGLISH)
def test_assistant_greeting_english(mock_translate, client):
    response = client.post("/assistant", json={"message": "hello"})
    assert response.status_code == 200
    body = response.json()
    assert body["intent"] == "greeting"
    assert body["detectedLanguage"] == "en"
    assert "health assistant" in body["reply"].lower()


@patch("app.routers.assistant.to_english", return_value=("I have chest pain and cannot breathe", "en"))
def test_assistant_emergency_intent(mock_translate, client):
    response = client.post("/assistant", json={"message": "I have chest pain and cannot breathe"})
    assert response.status_code == 200
    body = response.json()
    assert body["intent"] == "emergency"
    assert "emergency" in body["reply"].lower()


@patch("app.routers.assistant.to_english", return_value=("I want to book an appointment", "en"))
def test_assistant_book_appointment_intent(mock_translate, client):
    response = client.post("/assistant", json={"message": "I want to book an appointment"})
    assert response.status_code == 200
    body = response.json()
    assert body["intent"] == "book_appointment"
    assert "book" in body["reply"].lower()


@patch("app.routers.assistant.to_english", return_value=("find a doctor near me", "en"))
def test_assistant_find_doctor_intent(mock_translate, client):
    response = client.post("/assistant", json={"message": "find a doctor near me"})
    assert response.status_code == 200
    body = response.json()
    assert body["intent"] == "find_doctor"


@patch("app.routers.assistant.to_english", return_value=("I have a persistent headache and fever", "en"))
def test_assistant_health_intent_returns_specialty(mock_translate, client):
    response = client.post("/assistant", json={"message": "I have a persistent headache and fever"})
    assert response.status_code == 200
    body = response.json()
    assert body["intent"] == "health"
    if body["recommendedSpecialty"] is not None:
        assert isinstance(body["confidenceScore"], float)
        assert body["urgencyLevel"] is not None


@patch("app.routers.assistant.to_english", return_value=(None, None))
def test_assistant_translation_failure_returns_503(mock_translate, client):
    response = client.post("/assistant", json={"message": "hello"})
    assert response.status_code == 503


def test_assistant_rejects_empty_message(client):
    response = client.post("/assistant", json={"message": ""})
    assert response.status_code == 422


def test_assistant_rejects_long_message(client):
    response = client.post("/assistant", json={"message": "a" * 501})
    assert response.status_code == 422


@patch("app.routers.assistant.to_english", return_value=("what can you do", "en"))
def test_assistant_greeting_pattern(mock_translate, client):
    response = client.post("/assistant", json={"message": "what can you do"})
    assert response.status_code == 200
    body = response.json()
    assert body["intent"] == "greeting"


@patch("app.routers.assistant.to_english", return_value=("hello", "en"))
def test_assistant_includes_voice_metadata_english(mock_translate, client):
    response = client.post("/assistant", json={"message": "hello", "name": "Riya"})
    assert response.status_code == 200
    body = response.json()
    assert body["voice"]["gender"] == "female"
    assert body["voice"]["lang"] == "en-GB"
    assert body["voice"]["pitch"] == 1.05
    assert body["spokenIntro"] is not None
    assert "Riya" in body["spokenIntro"]
    assert "kindly" in body["spokenIntro"].lower()


@patch("app.routers.assistant.to_english", return_value=("hello", "te"))
def test_assistant_includes_voice_metadata_telugu(mock_translate, client):
    response = client.post("/assistant", json={"message": "నమస్కారం", "name": "Riya"})
    assert response.status_code == 200
    body = response.json()
    assert body["voice"]["gender"] == "female"
    assert body["voice"]["lang"] == "te-IN"
    assert body["spokenIntro"] is not None
    assert "Riya" in body["spokenIntro"]


@patch("app.routers.assistant.to_english", return_value=("hello", "hi"))
def test_assistant_includes_voice_metadata_hindi(mock_translate, client):
    response = client.post("/assistant", json={"message": "नमस्ते", "name": "Riya"})
    assert response.status_code == 200
    body = response.json()
    assert body["voice"]["gender"] == "female"
    assert body["voice"]["lang"] == "hi-IN"
    assert "Riya" in body["spokenIntro"]


@patch("app.routers.assistant.to_english", return_value=("hello", "ta"))
def test_assistant_includes_voice_metadata_tamil(mock_translate, client):
    response = client.post("/assistant", json={"message": "வணக்கம்", "name": "Riya"})
    assert response.status_code == 200
    body = response.json()
    assert body["voice"]["gender"] == "female"
    assert body["voice"]["lang"] == "ta-IN"


@patch("app.routers.assistant.to_english", return_value=("hello", "bn"))
def test_assistant_includes_voice_metadata_bengali(mock_translate, client):
    response = client.post("/assistant", json={"message": "নমস্কার", "name": "Riya"})
    assert response.status_code == 200
    body = response.json()
    assert body["voice"]["gender"] == "female"
    assert body["voice"]["lang"] == "bn-IN"


@patch("app.routers.assistant.to_english", return_value=("hello", "mr"))
def test_assistant_includes_voice_metadata_marathi(mock_translate, client):
    response = client.post("/assistant", json={"message": "नमस्कार", "name": "Riya"})
    assert response.status_code == 200
    body = response.json()
    assert body["voice"]["gender"] == "female"
    assert body["voice"]["lang"] == "mr-IN"


@patch("app.routers.assistant.to_english", return_value=("hello", "es"))
def test_assistant_local_spanish_greeting(mock_translate, client):
    response = client.post("/assistant", json={"message": "hola"})
    assert response.status_code == 200
    body = response.json()
    assert body["intent"] == "greeting"
    assert body["detectedLanguage"] == "es"
    assert "asistente de salud" in body["reply"].lower()
    assert body["supportedLanguages"]["es"] == "Spanish"


@patch("app.routers.assistant.to_english", return_value=("hello", "fr"))
def test_assistant_local_french_greeting(mock_translate, client):
    response = client.post("/assistant", json={"message": "bonjour"})
    assert response.status_code == 200
    body = response.json()
    assert body["intent"] == "greeting"
    assert "assistant de santé" in body["reply"].lower()


@patch("app.routers.assistant.to_english", return_value=("hello", "ar"))
def test_assistant_local_arabic_greeting(mock_translate, client):
    response = client.post("/assistant", json={"message": "مرحبا"})
    assert response.status_code == 200
    body = response.json()
    assert body["intent"] == "greeting"
    assert "مساعدك الصحي" in body["reply"]


@patch("app.routers.assistant.to_english", return_value=("hello", "hi"))
def test_assistant_local_hindi_greeting(mock_translate, client):
    response = client.post("/assistant", json={"message": "नमस्ते"})
    assert response.status_code == 200
    body = response.json()
    assert body["intent"] == "greeting"
    assert "स्वास्थ्य सहायक" in body["reply"]


@patch("app.routers.assistant.to_english", return_value=("hello", "zh"))
def test_assistant_local_chinese_greeting(mock_translate, client):
    response = client.post("/assistant", json={"message": "你好"})
    assert response.status_code == 200
    body = response.json()
    assert body["intent"] == "greeting"
    assert "AI健康助手" in body["reply"]


@patch("app.routers.assistant.to_english", return_value=("hello", "ja"))
def test_assistant_local_japanese_greeting(mock_translate, client):
    response = client.post("/assistant", json={"message": "こんにちは"})
    assert response.status_code == 200
    body = response.json()
    assert body["intent"] == "greeting"
    assert "AI健康アシスタント" in body["reply"]


@patch("app.routers.assistant.to_english", return_value=("hello", "de"))
def test_assistant_local_german_greeting(mock_translate, client):
    response = client.post("/assistant", json={"message": "hallo"})
    assert response.status_code == 200
    body = response.json()
    assert body["intent"] == "greeting"
    assert "KI-Gesundheitsassistent" in body["reply"]


@patch("app.routers.assistant.to_english", return_value=("hello", "ru"))
def test_assistant_local_russian_greeting(mock_translate, client):
    response = client.post("/assistant", json={"message": "привет"})
    assert response.status_code == 200
    body = response.json()
    assert body["intent"] == "greeting"
    assert "ИИ-помощник" in body["reply"]


@patch("app.routers.assistant.to_english", return_value=("hello", "pt"))
def test_assistant_local_portuguese_greeting(mock_translate, client):
    response = client.post("/assistant", json={"message": "olá"})
    assert response.status_code == 200
    body = response.json()
    assert body["intent"] == "greeting"
    assert "assistente de saúde" in body["reply"].lower()


@patch("app.routers.assistant.to_english", return_value=("hello", "tr"))
def test_assistant_local_turkish_greeting(mock_translate, client):
    response = client.post("/assistant", json={"message": "merhaba"})
    assert response.status_code == 200
    body = response.json()
    assert body["intent"] == "greeting"
    assert "sağlık asistanınız" in body["reply"].lower()


@patch("app.routers.assistant.to_english", return_value=("hello", "ko"))
def test_assistant_local_korean_greeting(mock_translate, client):
    response = client.post("/assistant", json={"message": "안녕하세요"})
    assert response.status_code == 200
    body = response.json()
    assert body["intent"] == "greeting"
    assert "AI 건강 어시스턴트" in body["reply"]


@patch("app.routers.assistant.to_english", return_value=("hello", "ur"))
def test_assistant_local_urdu_greeting(mock_translate, client):
    response = client.post("/assistant", json={"message": "السلام علیکم"})
    assert response.status_code == 200
    body = response.json()
    assert body["intent"] == "greeting"
    assert "AI صحت معاون" in body["reply"]


@patch("app.routers.assistant.to_english", return_value=("I want to book an appointment", "es"))
def test_assistant_local_spanish_book_intent(mock_translate, client):
    response = client.post("/assistant", json={"message": "quiero reservar una cita"})
    assert response.status_code == 200
    body = response.json()
    assert body["intent"] == "book_appointment"
    assert "reservar" in body["reply"].lower()


@patch("app.routers.assistant.to_english", return_value=("find a doctor near me", "fr"))
def test_assistant_local_french_find_doctor_intent(mock_translate, client):
    response = client.post("/assistant", json={"message": "trouver un médecin"})
    assert response.status_code == 200
    body = response.json()
    assert body["intent"] == "find_doctor"
    assert "médecins vérifiés" in body["reply"].lower()


@patch("app.routers.assistant.to_english", return_value=("I have chest pain", "es"))
def test_assistant_local_spanish_emergency(mock_translate, client):
    response = client.post("/assistant", json={"message": "tengo dolor en el pecho"})
    assert response.status_code == 200
    body = response.json()
    assert body["intent"] == "emergency"
    assert "emergencia médica" in body["reply"].lower()


@patch("app.routers.assistant.to_english", return_value=("I have a headache", "fr"))
def test_assistant_local_french_health_intent(mock_translate, client):
    response = client.post("/assistant", json={"message": "j'ai mal à la tête"})
    assert response.status_code == 200
    body = response.json()
    assert body["intent"] == "health"
    if body["recommendedSpecialty"] is not None:
        assert body["urgencyLevel"] is not None


@patch("app.routers.assistant.from_english", return_value="สวัสดี! นี่คือผู้ช่วยสุขภาพ AI ของคุณ")
@patch("app.routers.assistant.to_english", return_value=("hello", "th"))
def test_assistant_unsupported_language_falls_back_to_google_translate(mock_to, mock_from, client):
    response = client.post("/assistant", json={"message": "สวัสดี"})
    assert response.status_code == 200
    body = response.json()
    assert body["intent"] == "greeting"
    assert body["detectedLanguage"] == "th"
    assert mock_from.call_count >= 1
    assert "health assistant" in body["reply"].lower() or "ผู้ช่วยสุขภาพ" in body["reply"]


@patch("app.routers.assistant.to_english", return_value=("hello", "es"))
def test_assistant_supported_languages_field_included(mock_translate, client):
    response = client.post("/assistant", json={"message": "hola"})
    assert response.status_code == 200
    body = response.json()
    assert "supportedLanguages" in body
    supported = body["supportedLanguages"]
    assert isinstance(supported, dict)
    assert len(supported) == 16
    assert "es" in supported
    assert "fr" in supported
    assert "ar" in supported
    assert "hi" in supported
    assert "zh" in supported
    assert "ja" in supported
    assert "ko" in supported
    assert "de" in supported
    assert "ru" in supported
    assert "pt" in supported
    assert "tr" in supported
    assert "ur" in supported
    assert "te" in supported
    assert "mr" in supported
    assert "ta" in supported
    assert "bn" in supported


@patch("app.routers.assistant.to_english", return_value=("hello", "te"))
def test_assistant_local_telugu_greeting(mock_translate, client):
    response = client.post("/assistant", json={"message": "నమస్కారం"})
    assert response.status_code == 200
    body = response.json()
    assert body["intent"] == "greeting"
    assert "AI ఆరోగ్య సహాయక" in body["reply"]


@patch("app.routers.assistant.to_english", return_value=("hello", "mr"))
def test_assistant_local_marathi_greeting(mock_translate, client):
    response = client.post("/assistant", json={"message": "नमस्कार"})
    assert response.status_code == 200
    body = response.json()
    assert body["intent"] == "greeting"
    assert "AI आरोग्य सहाय्यक" in body["reply"]


@patch("app.routers.assistant.to_english", return_value=("hello", "ta"))
def test_assistant_local_tamil_greeting(mock_translate, client):
    response = client.post("/assistant", json={"message": "வணக்கம்"})
    assert response.status_code == 200
    body = response.json()
    assert body["intent"] == "greeting"
    assert "AI சுகாதார உதவியாளர்" in body["reply"]


@patch("app.routers.assistant.to_english", return_value=("hello", "bn"))
def test_assistant_local_bengali_greeting(mock_translate, client):
    response = client.post("/assistant", json={"message": "নমস্কার"})
    assert response.status_code == 200
    body = response.json()
    assert body["intent"] == "greeting"
    assert "AI স্বাস্থ্য সহকারী" in body["reply"]


@patch("app.routers.assistant.from_english")
@patch("app.routers.assistant.to_english", return_value=("hello", "zh-CN"))
def test_assistant_normalizes_region_suffixed_lang_to_supported(mock_to, mock_from, client):
    response = client.post("/assistant", json={"message": "你好"})
    assert response.status_code == 200
    body = response.json()
    assert body["detectedLanguage"] == "zh"
    assert body["intent"] == "greeting"
    assert "AI健康助手" in body["reply"]
    mock_from.assert_not_called()
