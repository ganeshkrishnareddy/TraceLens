"""Shared FastAPI dependencies for bearer-token authentication."""
from __future__ import annotations

from fastapi import Header, HTTPException

from app.services import store


def bearer_token(authorization: str | None = Header(default=None)) -> str:
    if not authorization:
        raise HTTPException(401, "authentication required")
    parts = authorization.split(None, 1)
    if len(parts) != 2 or parts[0].lower() != "bearer" or not parts[1].strip():
        raise HTTPException(401, "invalid authorization header")
    return parts[1].strip()


def current_user(authorization: str | None = Header(default=None)) -> dict:
    token = bearer_token(authorization)
    user = store.get_session_user(token)
    if not user:
        raise HTTPException(401, "invalid or expired session")
    return user


def public_user(user: dict) -> dict:
    return {
        "id": user["id"],
        "email": user["email"],
        "name": user.get("name"),
        "role": user.get("role"),
        "is_demo": bool(user.get("is_demo")),
    }
