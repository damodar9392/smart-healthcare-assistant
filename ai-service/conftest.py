import os

import pytest
from fastapi.testclient import TestClient

os.environ.setdefault("TRANSLATE_ENABLED", "true")

from main import app


@pytest.fixture(scope="session")
def client():
    return TestClient(app)
