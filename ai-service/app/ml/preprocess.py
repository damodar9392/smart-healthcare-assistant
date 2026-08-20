import re

STOPWORDS = {
    "the", "a", "an", "and", "or", "with", "for", "my", "i", "me", "is", "are",
    "was", "in", "on", "of", "to", "at", "have", "has", "had", "feeling",
    "feel", "having", "since", "very", "been", "being", "it", "that", "this",
    "am", "not", "but", "so", "too",
}


def clean_text(text):
    """Lowercase, strip punctuation/digits, remove stopwords and single chars."""
    if not isinstance(text, str):
        text = str(text)
    text = text.lower()
    text = re.sub(r"[^a-z\s]", " ", text)
    tokens = [token for token in text.split() if token not in STOPWORDS and len(token) > 1]
    return " ".join(tokens)