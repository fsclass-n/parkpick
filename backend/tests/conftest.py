import os
import tempfile

import pytest

_db = os.path.join(tempfile.mkdtemp(), "test.db")
os.environ.update({
    "DATABASE_URL": f"sqlite:///{_db}",
    "SIMULATOR_ENABLED": "false",
    "ADMIN_SECRET_KEY": "test-admin-secret",
    "AI_INGEST_TOKEN": "test-ingest-token",
    "GEMINI_API_KEY": "",
    "JWT_SECRET_KEY": "test-jwt-secret",
})

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as c:
        yield c


def _token(client, path, body):
    res = client.post(path, json=body)
    assert res.status_code == 200, res.text
    return {"Authorization": f"Bearer {res.json()['access_token']}"}


@pytest.fixture(scope="session")
def user_headers(client):
    return _token(client, "/api/auth/test-login", {"kind": "user"})


@pytest.fixture(scope="session")
def test_admin_headers(client):
    return _token(client, "/api/auth/test-login", {"kind": "test_admin"})


@pytest.fixture(scope="session")
def admin_headers(client):
    return _token(client, "/api/auth/admin-key-login", {"admin_key": "test-admin-secret"})
