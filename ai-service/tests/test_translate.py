from unittest.mock import MagicMock, patch

from app.services.translate import (
    from_english,
    to_english,
    translate_text,
    translation_enabled,
)


def _mock_response(data):
    mock = MagicMock()
    mock.read.return_value = __import__("json").dumps(data).encode("utf-8")
    mock.__enter__ = MagicMock(return_value=mock)
    mock.__exit__ = MagicMock(return_value=False)
    return mock


GOOGLE_RESPONSE_EN = [
    [["Hello, how are you?", "Hello, how are you?", None, None, None]],
    None,
    "es",
]

GOOGLE_RESPONSE_EMPTY = [[], None, "en"]


@patch("app.services.translate.urlopen")
def test_translate_text_returns_translation(mock_urlopen):
    mock_urlopen.return_value = _mock_response(GOOGLE_RESPONSE_EN)
    text, lang = translate_text("Hola, como estas", target="en", source="es")
    assert text == "Hello, how are you?"
    assert lang == "es"


@patch("app.services.translate.urlopen")
def test_translate_text_empty_input_returns_none(mock_urlopen):
    text, lang = translate_text("")
    assert text is None
    assert lang is None
    text, lang = translate_text("   ")
    assert text is None
    assert lang is None


@patch("app.services.translate.urlopen")
def test_translate_text_api_failure_returns_none(mock_urlopen):
    mock_urlopen.side_effect = Exception("network error")
    text, lang = translate_text("hello")
    assert text is None
    assert lang is None


@patch("app.services.translate.urlopen")
def test_to_english_delegates_to_translate(mock_urlopen):
    mock_urlopen.return_value = _mock_response(GOOGLE_RESPONSE_EN)
    text, lang = to_english("Hola")
    assert text == "Hello, how are you?"
    assert lang == "es"


@patch("app.services.translate.urlopen")
def test_from_english_english_target_returns_none(mock_urlopen):
    result = from_english("hello", "en")
    assert result is None
    mock_urlopen.assert_not_called()


@patch("app.services.translate.urlopen")
def test_from_english_none_target_returns_none(mock_urlopen):
    result = from_english("hello", None)
    assert result is None
    mock_urlopen.assert_not_called()


@patch("app.services.translate.urlopen")
def test_from_english_translates_to_target(mock_urlopen):
    mock_urlopen.return_value = _mock_response(
        [[["Hola", "Hola", None, None, None]], None, "en"]
    )
    result = from_english("Hello", "es")
    assert result == "Hola"


def test_translation_enabled_defaults_to_false(monkeypatch):
    monkeypatch.delenv("TRANSLATE_ENABLED", raising=False)
    assert translation_enabled() is False


def test_translation_enabled_true_values(monkeypatch):
    for value in ("true", "1", "yes", "on", "TRUE"):
        monkeypatch.setenv("TRANSLATE_ENABLED", value)
        assert translation_enabled() is True


@patch("app.services.translate.urlopen")
def test_to_english_returns_none_when_disabled(mock_urlopen, monkeypatch):
    monkeypatch.setenv("TRANSLATE_ENABLED", "false")
    text, lang = to_english("hola")
    assert text is None
    assert lang is None
    mock_urlopen.assert_not_called()


@patch("app.services.translate.urlopen")
def test_from_english_returns_none_when_disabled(mock_urlopen, monkeypatch):
    monkeypatch.setenv("TRANSLATE_ENABLED", "false")
    assert from_english("Hello", "es") is None
    mock_urlopen.assert_not_called()
