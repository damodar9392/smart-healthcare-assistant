import os

import pytest
from fastapi.testclient import TestClient

os.environ.setdefault("TRANSLATE_ENABLED", "true")
os.environ.setdefault("AI_INTERNAL_TOKEN", "test-internal-token")

from main import app

INTERNAL_HEADERS = {"X-Internal-Token": os.environ["AI_INTERNAL_TOKEN"]}


@pytest.fixture(scope="session")
def client():
    return TestClient(app, headers=INTERNAL_HEADERS)
