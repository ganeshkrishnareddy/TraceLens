"""Auth tests: hashing, opaque sessions and the documented demo account."""
import uuid

from fastapi.testclient import TestClient

from app.main import app
from app.services import store
from app.services.security import verify_password

client = TestClient(app)


def test_demo_account_login_and_me():
    r = client.post("/api/auth/login", json={
        "email": "demo@tracelens.local", "password": "TraceLens2026!",
    })
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["user"]["email"] == "demo@tracelens.local"
    assert body["user"]["is_demo"] is True
    assert body["token"] and "." in body["token"]

    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {body['token']}"})
    assert me.status_code == 200
    assert me.json()["user"]["email"] == "demo@tracelens.local"

    stored = store.get_user_by_email("demo@tracelens.local")
    assert stored["password_hash"] != "TraceLens2026!"
    assert verify_password("TraceLens2026!", stored["password_hash"])


def test_register_login_logout_flow():
    email = f"test-{uuid.uuid4().hex[:10]}@tracelens.local"
    password = "TestPass2026!"

    reg = client.post("/api/auth/register", json={
        "email": email, "password": password, "name": "Test Analyst",
    })
    assert reg.status_code == 200, reg.text
    token = reg.json()["token"]
    assert reg.json()["user"]["name"] == "Test Analyst"
    assert reg.json()["user"]["is_demo"] is False

    user = store.get_user_by_email(email)
    assert user is not None
    assert user["password_hash"] != password
    assert verify_password(password, user["password_hash"])

    wrong = client.post("/api/auth/login", json={"email": email, "password": "wrong-password"})
    assert wrong.status_code == 401

    login = client.post("/api/auth/login", json={"email": email, "password": password})
    assert login.status_code == 200
    assert login.json()["token"] != token

    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200

    out = client.post("/api/auth/logout", headers={"Authorization": f"Bearer {token}"})
    assert out.status_code == 200
    assert out.json() == {"ok": True}
    assert client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"}).status_code == 401


def test_auth_rejects_bad_tokens_and_duplicate_registration():
    email = f"dup-{uuid.uuid4().hex[:10]}@tracelens.local"
    payload = {"email": email, "password": "AnotherPass2026!"}
    assert client.post("/api/auth/register", json=payload).status_code == 200
    assert client.post("/api/auth/register", json=payload).status_code == 409

    assert client.get("/api/auth/me").status_code == 401
    assert client.get("/api/auth/me", headers={"Authorization": "Bearer not-a-token"}).status_code == 401
    assert client.get("/api/auth/me", headers={"Authorization": "Basic abc"}).status_code == 401
