"""Local prototype authentication: hashed passwords + opaque bearer sessions."""
from __future__ import annotations

from fastapi import APIRouter, Depends, Header, HTTPException

from app.deps import current_user, public_user
from app.schemas import LoginRequest, RegisterRequest
from app.services import store
from app.services.security import hash_password, verify_password

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register")
def register(req: RegisterRequest):
    email = (req.email or "").strip().lower()
    if "@" not in email or "." not in email.split("@")[-1]:
        raise HTTPException(400, "a valid email address is required")
    user = store.create_user(email, hash_password(req.password), req.name or email.split("@")[0])
    if not user:
        raise HTTPException(409, "an account with that email already exists")
    token = store.create_session(user["id"])
    return {"user": public_user(user), "token": token}


@router.post("/login")
def login(req: LoginRequest):
    user = store.get_user_by_email(req.email)
    if not user or not verify_password(req.password, user["password_hash"]):
        raise HTTPException(401, "invalid email or password")
    token = store.create_session(user["id"])
    return {"user": public_user(user), "token": token}


@router.post("/logout")
def logout(authorization: str | None = Header(default=None)):
    # Idempotent: logging out without a valid token is still a successful no-op.
    if authorization:
        parts = authorization.split(None, 1)
        if len(parts) == 2 and parts[0].lower() == "bearer":
            store.revoke_session(parts[1].strip())
    return {"ok": True}


@router.get("/me")
def me(user: dict = Depends(current_user)):
    return {"user": public_user(user)}
