"""Incident lifecycle rules shared by routes and tests.

Canonical chain (contract section 6):
    detected -> triaged -> investigating -> escalated -> mitigating -> resolved -> closed

A legacy incident created by the original app has status ``open``; it is
normalised to ``detected`` so the new lifecycle works on existing rows without
a data rewrite. Forward moves are allowed (so a resolved incident can skip a
purely administrative stage such as ``mitigating``); backward moves, repeats
and moves from a terminal state are rejected.
"""
from __future__ import annotations

LIFECYCLE = (
    "detected", "triaged", "investigating", "escalated",
    "mitigating", "resolved", "closed",
)
ALIASES = {"open": "detected", "new": "detected"}
TERMINAL = {"resolved", "closed"}
ESCALATION_SOURCES = {"detected", "triaged", "investigating"}
RESOLUTION_SOURCES = {"detected", "triaged", "investigating", "escalated", "mitigating"}


def normalize(status: str | None) -> str:
    value = (status or "detected").strip().lower()
    return ALIASES.get(value, value)


def index_of(status: str | None) -> int:
    value = normalize(status)
    if value in LIFECYCLE:
        return LIFECYCLE.index(value)
    return -1


def is_known(status: str | None) -> bool:
    return index_of(status) >= 0


def is_terminal(status: str | None) -> bool:
    return normalize(status) in TERMINAL


def can_transition(current: str | None, target: str | None) -> bool:
    """True for a known forward transition between two known statuses."""
    ci, ti = index_of(current), index_of(target)
    return ci >= 0 and ti > ci


def can_escalate(current: str | None) -> bool:
    return normalize(current) in ESCALATION_SOURCES


def can_resolve(current: str | None) -> bool:
    return normalize(current) in RESOLUTION_SOURCES
