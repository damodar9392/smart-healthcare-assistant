import os
from unittest.mock import patch, MagicMock

import pytest

from app.services.llm_chat import (
    llm_enabled,
    _parse_response,
    _normalise_history,
)


# ---------------------------------------------------------------------------
# llm_enabled()
# ---------------------------------------------------------------------------

def test_llm_disabled_when_no_key(monkeypatch):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    assert llm_enabled() is False


def test_llm_enabled_when_key_set(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "sk-fake")
    assert llm_enabled() is True


# ---------------------------------------------------------------------------
# _normalise_history()
# ---------------------------------------------------------------------------

def test_normalise_history_passes_recent_turns():
    history = [
        {"role": "user", "content": f"msg-{i}"}
        for i in range(15)
    ]
    result = _normalise_history(history)
    assert len(result) == 10
    assert result[0]["content"] == "msg-5"


def test_normalise_history_skips_bad_items():
    history = [
        {"role": "user", "content": "hello"},
        {"role": "bot", "content": "bad role"},
        {"role": "user"},  # missing content
        None,
        {"role": "assistant", "content": "hi"},
    ]
    result = _normalise_history(history)
    assert len(result) == 2
    assert result[0]["role"] == "user"
    assert result[1]["role"] == "assistant"


# ---------------------------------------------------------------------------
# _parse_response()
# ---------------------------------------------------------------------------

MOCK_LLM_JSON = {
    "reply": "Please rest and drink fluids.",
    "intent": "health",
    "detectedLanguage": "en",
    "recommendedSpecialty": "General Medicine",
    "urgencyLevel": "low",
    "confidenceScore": 0.9,
}


def test_parse_valid_json():
    result = _parse_response(MOCK_LLM_JSON)
    assert result["reply"] == "Please rest and drink fluids."
    assert result["intent"] == "health"
    assert result["urgencyLevel"] == "low"
    assert result["confidenceScore"] == 0.9


def test_parse_with_markdown_fences():
    text = "```json\n" + '{"reply":"Hi there","intent":"greeting","detectedLanguage":"en","recommendedSpecialty":null,"urgencyLevel":null,"confidenceScore":null}' + "\n```"
    result = _parse_response(text)
    assert result["reply"] == "Hi there"
    assert result["intent"] == "greeting"


def test_parse_invalid_json_returns_defaults():
    result = _parse_response("This is not JSON at all.")
    assert result["reply"] is None
    assert result["intent"] is None


def test_parse_normalises_invalid_intent_and_urgency():
    raw = {
        "reply": "hello",
        "intent": "not_a_real_intent",
        "urgencyLevel": "super_high",
        "detectedLanguage": "pt-BR",
        "confidenceScore": 2.0,
    }
    result = _parse_response(raw)
    assert result["intent"] is None
    assert result["urgencyLevel"] is None
    assert result["detectedLanguage"] == "pt"
    assert result["confidenceScore"] is None


def test_parse_none_or_empty():
    assert _parse_response(None)["reply"] is None
    assert _parse_response("")["reply"] is None


# ---------------------------------------------------------------------------
# ask_llm() with mocked OpenAI client
# ---------------------------------------------------------------------------

FAKE_REPLY_JSON = (
    '{"reply": "You should see a doctor.", "intent": "health", '
    '"detectedLanguage": "es", "recommendedSpecialty": "General Medicine", '
    '"urgencyLevel": "medium", "confidenceScore": 0.85}'
)


def _make_fake_openai(response_content):
    choice = MagicMock()
    choice.message.content = response_content
    response = MagicMock()
    response.choices = [choice]
    mock_cls = MagicMock(return_value=MagicMock())
    mock_cls.return_value.chat.completions.create.return_value = response
    return mock_cls


@patch.dict(os.environ, {"OPENAI_API_KEY": "sk-fake"})
@patch("app.services.llm_chat.llm_enabled", return_value=True)
def test_ask_llm_returns_parsed_fields(mock_enabled):
    from app.services.llm_chat import ask_llm

    mock_openai = _make_fake_openai(FAKE_REPLY_JSON)
    with patch("openai.OpenAI", mock_openai):
        result = ask_llm("tengo dolor de cabeza")
    assert result["reply"] == "You should see a doctor."
    assert result["detectedLanguage"] == "es"
    assert result["confidenceScore"] == 0.85
    mock_openai.return_value.chat.completions.create.assert_called_once()


@patch.dict(os.environ, {"OPENAI_API_KEY": "sk-fake"})
def test_ask_llm_raises_on_openai_failure():
    from app.services.llm_chat import ask_llm

    mock_openai = MagicMock(side_effect=RuntimeError("rate limited"))
    with patch("openai.OpenAI", mock_openai):
        with pytest.raises(RuntimeError, match="rate limited"):
            ask_llm("hello")


# ---------------------------------------------------------------------------
# Integration: assistant endpoint uses LLM when key is set
# ---------------------------------------------------------------------------

FAKE_GREETING_JSON = (
    '{"reply": "Hello! How can I help you today?", "intent": "greeting", '
    '"detectedLanguage": "en", "recommendedSpecialty": null, '
    '"urgencyLevel": null, "confidenceScore": null}'
)


@patch("app.routers.assistant.to_english", return_value=("hello", "en"))
@patch("app.routers.assistant.llm_enabled", return_value=True)
@patch("app.routers.assistant.ask_llm")
def test_assistant_uses_llm_reply(mock_ask_llm, mock_enabled, mock_translate, client):
    mock_ask_llm.return_value = {
        "reply": "Hello! How can I help you today?",
        "intent": "greeting",
        "detectedLanguage": "en",
        "recommendedSpecialty": None,
        "urgencyLevel": None,
        "confidenceScore": None,
    }
    response = client.post("/assistant", json={"message": "hello"})
    assert response.status_code == 200
    body = response.json()
    assert body["reply"] == "Hello! How can I help you today?"
    assert body["intent"] == "greeting"
    assert body["voice"]["gender"] == "female"
    assert body["spokenIntro"] is not None
    mock_ask_llm.assert_called_once()


@patch("app.routers.assistant.to_english", return_value=("hello", "en"))
@patch("app.routers.assistant.llm_enabled", return_value=True)
@patch("app.routers.assistant.ask_llm", side_effect=RuntimeError("API down"))
def test_assistant_falls_back_when_llm_fails(mock_ask_llm, mock_enabled, mock_translate, client):
    response = client.post("/assistant", json={"message": "hello"})
    assert response.status_code == 200
    body = response.json()
    assert "health assistant" in body["reply"].lower()
    assert body["intent"] == "greeting"


@patch("app.routers.assistant.to_english", return_value=("I have chest pain", "en"))
@patch("app.routers.assistant.llm_enabled", return_value=True)
@patch("app.routers.assistant.ask_llm")
def test_assistant_emergency_skips_llm(mock_ask_llm, mock_enabled, mock_translate, client):
    response = client.post("/assistant", json={"message": "I have chest pain"})
    assert response.status_code == 200
    body = response.json()
    assert body["intent"] == "emergency"
    assert "emergency" in body["reply"].lower()
    mock_ask_llm.assert_not_called()


@patch("app.routers.assistant.to_english", return_value=("hello", "en"))
@patch("app.routers.assistant.llm_enabled", return_value=True)
@patch("app.routers.assistant.ask_llm")
def test_assistant_passes_history_to_llm(mock_ask_llm, mock_enabled, mock_translate, client):
    mock_ask_llm.return_value = {
        "reply": "Still resting.",
        "intent": "health",
        "detectedLanguage": "en",
        "recommendedSpecialty": None,
        "urgencyLevel": None,
        "confidenceScore": None,
    }
    history = [{"role": "user", "content": "I have a fever"}]
    response = client.post("/assistant", json={"message": "hello", "history": history})
    assert response.status_code == 200
    args, _ = mock_ask_llm.call_args
    assert args[0] == "hello"
    assert args[1] == history
