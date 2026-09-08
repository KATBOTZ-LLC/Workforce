# Workforce API (backend)

FastAPI service backing the Workforce frontend. Talks to Firestore and verifies
Google Sign-In for `@katbotz.com` accounts — this replaces the frontend's old
`?role=admin` / `?role=employee` URL param, which had no real authentication at all.

## Local setup

1. `cd backend`
2. `python3 -m venv venv && source venv/bin/activate`
3. `pip install -r requirements.txt`
4. `cp .env.example .env` and fill in the real values (see comments in that file for
   where each one comes from — most require the GCP project to exist first).
5. `uvicorn app.main:app --reload --port 8000`
6. Check it's alive: `curl http://localhost:8000/api/health` → `{"status":"ok"}`

## What exists so far

- `POST /api/auth/google` — verifies a Google Identity Services ID token from the
  frontend, rejects anything outside the `katbotz.com` domain, and issues our own
  8-hour session token (a signed JWT, not a Google token).
- `GET /api/me` — given a valid session, resolves the caller's org-chart identity and
  returns their access tier (`founder` / `hr` / `employee` / `intern`) and visibility
  scope (`visible_person_ids`). Computed fresh on every call — see `app/access.py`.
- `GET /api/org`, plus `POST`/`PATCH`/`DELETE` on `/api/org/people`, `/roles`,
  `/units`, `/edges`, and `POST /api/org/reset` — the real org-chart data layer
  (`app/org_repo.py`), Firestore-backed, replacing the frontend's `orgStore.tsx` +
  localStorage. Every mutating route requires `can_edit_structure` (founder/hr),
  checked server-side via `resolve_access` — not a client-supplied role. Returns `503`
  if Firestore isn't configured (see below).
- `GET /api/org/audit-log` — the real audit trail for every org mutation.
- `GET /api/workers` (scoped to the caller's `visible_person_ids` — an employee/intern
  only sees themselves or their reports; founder/hr see everyone), `GET/PATCH
  /api/workers/{id}`, `POST /api/workers` — the worker + document data layer
  (`app/worker_repo.py`), replacing the relevant slice of `workforceStore.tsx` +
  localStorage. **Not** yet covered: goals, attendance, notes, projects, reviews,
  feedback, leave — a separate, not-yet-built slice (see 03-DATABASE.md). Document
  *upload* (the worker's own token-authenticated `/onboard/[token]` flow) is also not
  built — only the HR-side actions below are.
  - `POST /api/workers/{id}/documents/{key}/verify` and `.../reject` — document
    verification.
  - `POST /api/workers/{id}/create-account` — **the real enforcement point** for the
    mandatory-documents gate the original audit flagged: a worker with any unapproved
    mandatory document can never be activated through this endpoint, independent of
    whatever the frontend's UI state claims.
  - `POST /api/workers/{id}/status` — mark active/inactive.
  - Create and edit both re-enforce duplicate-email prevention server-side (the
    original fix was frontend-only, i.e. advisory), and rename cascades to every
    other worker's `hr_lead` field that pointed at the old name — same fixes as the
    frontend audit, now at the real boundary.
  - All mutations require founder/hr; `GET`/creation both need Firestore configured.
- `GET /api/health` — liveness check for Cloud Run.

See **03-DATABASE.md** (repo root) for the full Firestore schema and the reasoning
behind what's a top-level collection vs. a subcollection.

**Two data sources, same access rules either way** (`app/access.py` picks automatically):
- Firestore configured → the real, live, editable org chart (`app/org_repo.py`).
- Firestore not configured → the static seed (`app/org_data.py`), so login and access
  resolution keep working with zero GCP/billing. `app/org.py`'s mutating routes need
  Firestore though — there's nothing to persist a mutation to otherwise.

`app/org_data.py` is also what `org_repo.seed_if_empty()` bootstraps Firestore from on
first run — a one-time migration, not a second copy that needs to stay in sync. Once
Firestore has any data in it, `org_data.py` is only read again by `POST /api/org/reset`.
Real email addresses are still an open item — see that file's docstring; the inferred
`firstname@katbotz.com` convention is what `org_repo.seed_if_empty()` writes into each
person's `email` field, and from then on the live Firestore field is what matters, not
the convention function.

Worker/document records and Drive integration are not built yet — 09-PLAN.md /
06-TIMELINE.md order this as auth → org chart & worker data → Google Drive. The org
data layer above is the first half of "org chart & worker data"; worker records
(contact info, documents, goals, attendance, etc.) are the other half, not started.

## Testing against a real Firestore, with zero GCP project or billing

The Firestore emulator runs entirely locally — no GCP project, no billing, no
network calls to Google at all. One-time setup:

```bash
brew install openjdk   # the emulator is a JVM binary
```

Each time you want to test against it:
```bash
# Terminal 1 — the emulator itself
export PATH="/opt/homebrew/opt/openjdk/bin:$PATH"
cd backend/firebase-emulator
npx --yes firebase-tools@latest emulators:start --project demo-katbotz --only firestore

# Terminal 2 — the backend, pointed at the emulator instead of real GCP
cd backend && source venv/bin/activate
FIRESTORE_EMULATOR_HOST=localhost:8080 uvicorn app.main:app --reload --port 8000
```
Set `FIRESTORE_PROJECT_ID=demo-katbotz` in `.env` (any string works — the emulator
never checks it against a real project). The first `GET /api/org` call auto-seeds the
emulator from `org_data.py`. Data lives only in the emulator's memory — restarting it
gives you a clean slate, which is usually what you want between test runs.

## Deploying

Not yet deployed. Once a GCP project exists, this becomes a Cloud Run service —
`gcloud run deploy` from this directory with a `Dockerfile` (not written yet — worth
doing once the worker data layer exists too, so one deploy covers both).
