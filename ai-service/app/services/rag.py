"""Lightweight retrieval-augmented generation (RAG) for the assistant.

Searches a small, curated, human-approved knowledge base and returns the most
relevant passages for a user query. The assistant uses these passages to ground
its replies instead of inventing facts. No external vector database is needed;
scoring is a simple TF-IDF-style overlap that stays fast and offline.
"""

import json
import math
import os
import re

KB_PATH = os.path.join(os.path.dirname(__file__), "knowledge_base.json")

_STOPWORDS = {
    "a", "an", "the", "i", "me", "my", "you", "your", "it", "its", "is", "are",
    "was", "were", "be", "been", "have", "has", "had", "do", "does", "did",
    "will", "would", "can", "could", "should", "may", "might", "must", "of",
    "in", "on", "at", "to", "for", "from", "with", "about", "and", "or", "but",
    "if", "than", "so", "what", "which", "when", "where", "why", "how", "not",
    "no", "very", "just", "please", "help", "feeling", "feel", "feels",
    "getting", "got", "get", "since", "some", "any", "all", "more", "much",
    "too", "been", "am",
}

_TOKEN_RE = re.compile(r"[a-z]+")


def _tokens(text):
    if not text:
        return []
    return [
        token
        for token in _TOKEN_RE.findall(str(text).lower())
        if token not in _STOPWORDS
    ]


def _load():
    with open(KB_PATH, "r", encoding="utf-8") as handle:
        return json.load(handle)


def _corpus():
    kb = _load()
    for entry in kb:
        yield [*_tokens(entry.get("title", "")), *_tokens(" ".join(entry.get("keywords", [])))]


def _idf(document_frequencies, total_documents):
    return {
        term: math.log(1.0 + (total_documents / (df + 1.0)))
        for term, df in document_frequencies.items()
    }


def retrieve_context(query, top_k=3, min_score=0.1):
    """Return the most relevant knowledge-base entries for a query.

    Each returned entry has: id, title, content, source and a match score.
    """
    query_tokens = _tokens(query)
    if not query_tokens:
        return []

    kb = _load()
    documents = list(_corpus())
    total = len(documents)

    df = {}
    for doc_tokens in documents:
        for term in set(doc_tokens):
            df[term] = df.get(term, 0) + 1

    weights = _idf(df, total)

    scored = []
    for entry in kb:
        content_tokens = _tokens(entry.get("content", ""))
        content_freq = {}
        for token in content_tokens:
            content_freq[token] = content_freq.get(token, 0) + 1
        content_max = max(content_freq.values(), default=1)

        query_freq = {}
        for token in query_tokens:
            query_freq[token] = query_freq.get(token, 0) + 1

        score = 0.0
        for term, count in query_freq.items():
            if term in content_tokens:
                score += count * math.sqrt(content_freq[term] / content_max) * weights.get(term, 0.5)

        keyword_hits = [
            keyword
            for keyword in entry.get("keywords", [])
            if keyword.lower() in str(query).lower()
        ]
        phrase_boost = 1.5 * len(keyword_hits)
        if phrase_boost:
            score += phrase_boost

        if score > 0:
            scored.append((score, keyword_hits, entry))

    scored.sort(key=lambda item: item[0], reverse=True)

    results = []
    for score, hits, entry in scored[:top_k]:
        if score < min_score:
            continue
        results.append(
            {
                "id": entry.get("id"),
                "title": entry.get("title"),
                "content": entry.get("content"),
                "source": entry.get("source"),
                "score": round(score, 3),
                "keywords": hits,
            }
        )
    return results


def format_context(results):
    """Format retrieved passages into a compact block for prompt injection."""
    if not results:
        return ""
    blocks = []
    for entry in results:
        blocks.append(f"- {entry['title']}: {entry['content']}")
    return "\n".join(blocks)