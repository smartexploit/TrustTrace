from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def login(email, password):
    response = client.post(
        "/auth/login",
        json={
            "email": email,
            "password": password
        }
    )

    assert response.status_code == 200

    return response.json()["access_token"]


def test_users_endpoint_requires_authentication():
    response = client.get("/auth/users")

    assert response.status_code in (401, 403)


def test_staff_cannot_access_user_management():
    token = login(
        "backend-test@trusttrace.com",
        "BackendTest123!"
    )

    response = client.get(
        "/auth/users",
        headers={
            "Authorization": f"Bearer {token}"
        }
    )

    assert response.status_code == 403


def test_staff_cannot_review_scan():
    token = login(
        "backend-test@trusttrace.com",
        "BackendTest123!"
    )

    response = client.patch(
        "/scan/24/review",
        headers={
            "Authorization": f"Bearer {token}"
        },
        json={
            "review_status": "DISMISSED",
            "review_note": "RBAC test"
        }
    )

    assert response.status_code == 403
