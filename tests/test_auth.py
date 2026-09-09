import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_login_requires_valid_credentials():
    response = client.post(
        "/auth/login",
        json={
            "email": "admin@trusttrace.com",
            "password": "wrong-password"
        }
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid email or password"


def test_protected_endpoint_requires_token():
    response = client.get("/auth/me")

    assert response.status_code in (401, 403)


def test_login_returns_access_token():
    response = client.post(
        "/auth/login",
        json={
            "email": "admin@trusttrace.com",
            "password": "TrustTraceAdmin123!"
        }
    )

    assert response.status_code == 200

    data = response.json()

    assert "access_token" in data
    assert data["token_type"] == "bearer"
