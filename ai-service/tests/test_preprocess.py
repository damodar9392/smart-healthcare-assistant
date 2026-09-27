from app.ml.preprocess import clean_text


def test_clean_text_lowercases_and_strips_punctuation():
    assert clean_text("Severe HEADACHE!") == "severe headache"


def test_clean_text_removes_digits_and_stopwords():
    assert clean_text("I have 3 days of pain since Monday") == "days pain monday"


def test_clean_text_removes_single_character_tokens():
    assert clean_text("a b cough and i") == "cough"


def test_clean_text_handles_non_string_input():
    assert clean_text(123) == ""
