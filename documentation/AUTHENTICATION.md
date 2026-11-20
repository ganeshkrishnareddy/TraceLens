# TraceLens — Authentication

> **Status note.** Authentication is a **transformation target** defined in
> `TRANSFORMATION_CONTRACT.md` §6. The current local build has no auth (see
> `documentation/LIMITATIONS.md` and `KNOWN_LIMITATIONS.md`); it is a single-process,
> local workbench. This document specifies the target so the frontend, backend and
> docs stay aligned, and records the honest current baseline.

## Model

- **Local prototype auth** — no external identity provider.
- Passwords are **hashed** at rest (never stored in plain text).
- A successful login or registration returns an **opaque session token**.
- The token is sent on protected requests as `Authorization: Bearer <token>`.
- Sessions are stored server-side (users + sessions tables in `tracelens.db`) and can
  be ended with logout.
- This is a competition demo control, not a production identity system. No
  multi-user authorisation model or rate limiting is claimed.

## Endpoints (target)

| Method | Path | Body | Response | Purpose |
|---|---|---|---|---|
| POST | `/api/auth/register` | `{email, password, name}` | `{user, token}` | Create a local account |
| POST | `/api/auth/login` | `{email, password}` | `{user, token}` | Sign in, receive token |
| POST | `/api/auth/logout` | — | `{ok:true}` | End the session |
| GET | `/api/auth/me` | — | `{user}` | Resolve current token → user |

Invalid credentials, duplicate registration or an unknown/expired token should
return a normal API error (4xx) that the UI surfaces as a real error message — not a
silent failure.

## Demo account

| Field | Value |
|---|---|
| Email | `demo@tracelens.local` |
| Password | `TraceLens2026!` |

The demo account is documented in the root `README.md` and is used by acceptance
journey **J2** (`USER_JOURNEYS.md`). It is a local fixture, not a real person.

## Protected surface

Public (no auth): `/` · `/about` · `/technology` · `/how-it-works` · `/research` ·
`/demo` · `/login` · `/register` · `/forgot-password` · `/judge`.

Analyst app (auth required, except an explicit demo session): `/app/overview` ·
`/app/data` · `/app/detect` · `/app/investigate` · `/app/explain` · `/app/experiments`
· `/app/reports` · `/app/settings`.

The explicit demo session lets Judges reach the analyst workflows through `/demo`
or `/judge` without creating an account, while still using the real detection
pipeline (contract §7–§8).

## Session behaviour

- The token persists across analyst page refreshes (session persistence is part of
  the contract's quality bar, §10).
- Navigating away and back keeps the user signed in until logout or token expiry.
- Legacy paths (`/data`, `/detect`, …) redirect to `/app/*` and therefore inherit
  the same auth rule.

## Security notes

- CORS in the current backend is development-permissive, fixed to the Vite origins
  (`http://localhost:5173`, `127.0.0.1:5173`, `4173` variants) with credentials
  allowed (see `backend/app/main.py`).
- Pickled model bundles assume a trusted local filesystem.
- Do not log tokens or passwords. Keep secrets out of the repository (`.env.example`
  is the template).
- No password-reset backend is specified by the contract; `/forgot-password` is a
  public page that must not claim a real reset flow that does not exist.

## Current baseline (verified in this repository)

- `backend/app/main.py` registers only health, datasets, models, detection,
  incidents, experiments and reports routers — no auth router.
- `backend/app/schemas.py` has no auth request models.
- `backend/app/services/store.py` has no users or sessions tables.

The target tables are listed in `DATABASE_SCHEMA.md`; migrations must extend
`tracelens.db` without resetting existing data.
