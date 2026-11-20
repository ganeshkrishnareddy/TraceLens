"""Local prototype authentication helpers.

Passwords are hashed with bcrypt over a SHA-256 digest (keeps input inside
bcrypt's 72-byte limit) and session tokens are opaque random strings; only a
SHA-256 digest of a token is stored in the database. No plaintext password or
usable bearer token is ever persisted.
"""
from __future__ import annotations

import hashlib
import secrets
from datetime import datetime, timedelta, timezone

import bcrypt

PREFIX = "bcrypt_sha256$"
SESSION_TTL_HOURS = 24


def _digest(password: str) -> bytes:
    return hashlib.sha256(password.encode("utf-8")).hexdigest().encode("ascii")


def hash_password(password: str) -> str:
    salt = bcrypt.gensalt(rounds=12)
    return PREFIX + bcrypt.hashpw(_digest(password), salt).decode("ascii")


def verify_password(password: str, stored: str) -> bool:
    if not stored or not stored.startswith(PREFIX):
        return False
    try:
        return bcrypt.checkpw(_digest(password), stored[len(PREFIX):].encode("ascii"))
    except (ValueError, TypeError):
        return False


def new_token() -> str:
    return secrets.token_urlsafe(32)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def utc_after_hours(hours: int = SESSION_TTL_HOURS) -> str:
    return (datetime.now(timezone.utc) + timedelta(hours=hours)).isoformat()


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()
