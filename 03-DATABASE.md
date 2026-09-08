# Database Schema — Firestore

Referenced but never written when the original plan was drafted (see 09-PLAN.md, "Day 3: Firestore database setup"). Written now, alongside the actual data-layer API — see `backend/app/org_repo.py` for the code this describes.

## Design principles

- **The backend is the only Firestore client.** The frontend never talks to Firestore directly — every read and write goes through the FastAPI backend, which resolves the caller's identity and access tier (`backend/app/access.py`) before touching data. This means Firestore security rules can be simple and strict (deny all direct client access; only the backend's service account may read/write) — access control lives in one place, not duplicated between security rules and application code.
- **Org chart data is small and rarely written** (12 units, ~50 roles, ~34 people) — kept as flat top-level collections, no subcollections needed.
- **Worker data has both bounded and unbounded parts.** A worker's document checklist is bounded (6-9 fixed items) and stays embedded on the worker document. Everything that grows indefinitely over a career — attendance, clock-in sessions, notes, reviews, feedback, goals, project history — is a subcollection, so a worker's core record never approaches Firestore's 1 MiB document limit and adding one attendance record never rewrites years of history.
- **Audit logs are append-only.** Nothing in this schema allows update/delete on an audit collection — only create.

## Collections

### `org_people`
Doc id: `person_id` (e.g. `person_akshat`). Mirrors `orgModel.ts`'s `Person`.
```
{ display_name: string, aliases: string[], email: string }
```

### `org_units`
Doc id: `unit_id`.
```
{ name: string, parent_id: string | null }
```

### `org_roles`
Doc id: `role_id`.
```
{ person_id: string | null, unit_id: string, level: 0-4, title: string, is_primary: boolean }
```

### `org_edges`
Doc id: auto-generated.
```
{ from_role_id: string, to_role_id: string, type: 'reports_to' | 'accountable_to' | 'dotted' }
```

### `org_audit_log`
Doc id: auto-generated. **Create only** — see security rules below.
```
{ actor: string, summary: string, before: string | null, after: string | null, created_at: timestamp }
```

### `users`
Doc id: the user's email. Login activity, not identity — `org_people` + the email-matching in `access.py` is the actual identity source.
```
{ email: string, name: string, picture: string | null, last_login: timestamp }
```

### `workers`
Doc id: `worker_id` (e.g. `w-akshat`, derived the same way as today: `w-` + the org person id's suffix).
```
{
  first_name, last_name, name: string
  gender: string, dob: string | null, about: string | null
  personal_email, professional_email, phone: string
  country, state, address, pincode, timezone: string
  type: 'Employee' | 'Contractor' | 'Intern'
  contractor_mode: string | null
  employment_type, designation, department: string
  hr_lead: string, team_lead_ids: string[]
  location: string
  status: 'active' | 'inactive'
  date_of_joining: string, date_of_exit: string | null, work_experience: string | null
  created_at, expires_at: timestamp
  stage: string, account_created: boolean
  documents: WorkerDoc[]   -- embedded: bounded, rarely restructured
}
```

Subcollections under `workers/{worker_id}/`:
| Subcollection | Doc id | Why not embedded |
|---|---|---|
| `attendance` | date (`YYYY-MM-DD`) | One record per day, indefinitely |
| `time_sessions` | auto | Multiple per day, indefinitely |
| `goals` | auto | Added/completed continuously |
| `notes` | auto | Grows without bound |
| `projects` | auto | Accumulates over a career |
| `reviews` | auto | Permanent record, never pruned |
| `feedback` | auto | Permanent record, never pruned |

## Indexes

Firestore auto-indexes single-field equality and ascending-order queries. These composite indexes are needed for the app's actual query patterns (declare in `firestore.indexes.json` before relying on them — a missing composite index fails at query time with a link to auto-create it, not silently):

| Collection | Fields | Used by |
|---|---|---|
| `workers` | `status` ASC, `department` ASC | Departments & People, filtered by active status |
| `workers` | `status` ASC, `stage` ASC | Dashboard onboarding-pipeline counts |
| `org_roles` | `unit_id` ASC, `level` ASC | Org chart / Departments & People, grouped by department then seniority |

## Security rules (sketch)

```
service cloud.firestore {
  match /databases/{database}/documents {
    // No collection is client-writable or client-readable directly — the backend
    // service account (Cloud Run's default identity, or a dedicated one) is the only
    // caller. Firestore rules exist as a second layer, not the primary boundary;
    // access.py is the actual enforcement point.
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

The backend authenticates to Firestore via Application Default Credentials (a service account, not a per-user token), so it isn't subject to these rules at all — they only matter if something *other* than the backend ever tries to reach Firestore directly, which this architecture doesn't do.

## Status

**Org chart** — `backend/app/org_repo.py` implements everything above and is tested
working end-to-end against the Firestore emulator (no GCP project needed — see
backend/README.md), exposed as `/api/org/*` with founder/hr enforced server-side.
The frontend is wired too: `orgStore.tsx` has two implementations behind the same
interface — a real session uses the live API, no session (demo login, or
Firestore/GCP not set up) falls back to the original localStorage behavior
unchanged. `backend/app/org_data.py` remains as the static fallback for
login/access resolution with zero Firestore, and as the one-time seed
`org_repo.seed_if_empty()` bootstraps real Firestore from.

**Workers + documents** — `backend/app/worker_repo.py` / `app/workers.py` implement
the core worker record, document verification, and the account-creation gate,
tested end-to-end against the emulator (duplicate-email on create *and* edit, the
hrLead rename cascade, and the mandatory-documents gate all confirmed working).
Access-scoped by `visible_person_ids` via an `org_person_id` link field. **Not**
built: goals/attendance/notes/projects/reviews/feedback/leave (separate slice), the
worker-side document *upload* flow (needs the separate token-auth mechanism, not
built), and the frontend wiring (`workforceStore.tsx` still localStorage-only,
same as `orgStore.tsx` was before its own wiring pass).
