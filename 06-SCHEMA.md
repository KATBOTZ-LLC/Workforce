# Database Schema — Workforce Platform

## Document control

| Field | Detail |
|---|---|
| Project / Initiative | Workforce — Employee & Organization Management Platform |
| Object / Work item | WF-001 — Workforce Platform |
| Document | Database Schema Design (PostgreSQL) |
| Plan reference | High Level Plan, activity 1.4 — "PostgreSQL schema, constraints and index design" |
| Parent documents | Functional Specification WF-001; Technology Stack (Revised) WF-001 |
| Supersedes | The Firestore collection design in the earlier database note |
| Owner | Akshat Mishra — Chief of Staff, Global HR Lead |
| Technical owner | Aayushi Pandey |
| Version / Date | V1 — 1 September 2026 |
| Status | Draft — for technical review |

---

## 1. Purpose and how to read this document

This document is the database design for WF-001. It accompanies runnable DDL in the `schema/` directory: fourteen numbered files applied in order, each one an Alembic-ready migration.

The design principle throughout: **a rule the specification calls un-bypassable is enforced by the database, not by application code.** Where the Functional Specification says an action must be refused on the server regardless of what the interface shows, that refusal is a constraint, a trigger or a grant — something that holds even when a handler forgets to check. Section 7 maps every such rule to the object that enforces it.

| Measure | Count |
|---|---|
| Tables | 40 |
| Enumerated types | 20 |
| Indexes | 43 |
| Named constraints | 30 |
| Triggers | 8 |
| Row-level security policies | 13 |
| Functions and views | 10 |

---

## 2. Design principles

| Principle | What it means here |
|---|---|
| Rules live in the database | Uniqueness, sequencing, overlap, cycles and append-only behaviour are constraints and triggers, not conventions. Application code cannot forget them and a second code path cannot bypass them |
| References are keys, never names | A person is referenced by surrogate key everywhere. Renaming someone is one UPDATE of one row and no reference has to cascade — the rename problem is designed away rather than solved |
| History is never overwritten | Visa records, work authorizations, document versions and reviews supersede rather than update. The prior row and its trail are retained |
| Append-only means the grant says so | Audit tables have UPDATE and DELETE revoked from the application role and a trigger that raises. The claim "append-only for every user including the founder" is then true of the engine, not of the code |
| Derived values are never stored | Access tier, visible-person scope and leave balance are computed on read. Storing them creates a second source of truth that drifts from the organization chart |
| Sensitive data is separated | Immigration records sit in their own tables behind their own policies, so an ordinary directory lookup cannot reach them |
| Configuration is data | Document requirements, leave types and eligibility rules are rows. Adding a country or a leave category needs no release |

---

## 3. Module map

| Module | Tables |
|---|---|
| Organization and identity | `person`, `org_unit`, `org_role`, `org_edge`, `app_user` |
| Worker record | `worker`, `worker_email`, `worker_team_lead` |
| Documents | `document_requirement`, `worker_document`, `document_version`, `document_decision`, `document_access_log` |
| Onboarding | `onboarding_token` |
| Attendance and leave | `holiday_calendar`, `leave_type`, `leave_request`, `attendance`, `time_session` |
| Performance | `review_period`, `review_stage` |
| Tasks and notes | `goal`, `task`, `note` |
| Immigration and eligibility | `visa_record`, `work_authorization`, `education_record`, `eligibility_rule_set`, `eligibility_rule`, `eligibility_decision`, `eligibility_decision_reason`, `eligibility_override`, `expiry_alert`, `compliance_exception`, `scan_run` |
| Messaging and operations | `notification`, `outbox`, `otp_challenge`, `rate_limit`, `audit_log` |

---

## 4. Entity relationships

Everything hangs off two anchors: **`person`** for identity and access, **`worker`** for employment data. They are linked one-to-one by `worker.org_person_id`, which is what lets access be computed from the organization chart while employment data lives separately.

| Parent | Child | Cardinality | On delete |
|---|---|---|---|
| `person` | `org_role` | one to many | role's person set to NULL — the position becomes vacant |
| `org_unit` | `org_unit` | self, one to many | restricted |
| `org_unit` | `org_role` | one to many | role moves to the company root |
| `org_role` | `org_edge` (from / to) | one to many | cascade |
| `person` | `worker` | one to one | restricted |
| `worker` | `worker_email` | one to two (personal, professional) | cascade |
| `worker` | `worker_document` | one to many (6–12) | cascade |
| `worker_document` | `document_version` | one to many | cascade |
| `worker_document` | `document_decision` | one to many | cascade |
| `worker` | `onboarding_token` | one to many, one live | cascade |
| `worker` | `attendance` | one per day | cascade |
| `worker` | `time_session` | one to many, one open | cascade |
| `leave_type` | `leave_request` | one to many | restricted |
| `worker` | `leave_request` | one to many, no approved overlap | cascade |
| `worker` | `review_period` | one live per month | cascade |
| `review_period` | `review_stage` | one per stage | cascade |
| `worker` | `visa_record` | one to many, one live | cascade |
| `worker` | `work_authorization` | one to many, one live | cascade |
| `eligibility_rule_set` | `eligibility_rule` | one to many | cascade |
| `eligibility_decision` | `eligibility_decision_reason` | one to many | cascade |
| `eligibility_decision` | `eligibility_override` | one to one | restricted |

---

## 5. Table reference

### Organization and identity

| Table | Purpose | Key constraints and indexes |
|---|---|---|
| `person` | A human being. The referent for every name in the system | `email` is `citext`, so uniqueness is case-insensitive by type |
| `org_unit` | Department. Self-referencing tree | Exactly one root, enforced by a partial unique index; the root cannot be deleted (trigger) |
| `org_role` | A position, held by one person or vacant | One primary role per person (partial unique index); `unit_id` defaults to the root so deleting a department preserves its roles |
| `org_edge` | Reporting relationship | No self-link (CHECK); no duplicate relationship (UNIQUE); no cycle (constraint trigger) |
| `app_user` | Sign-in activity, not identity | `session_version` is bumped to invalidate every issued session at once |

### Worker record

| Table | Purpose | Key constraints and indexes |
|---|---|---|
| `worker` | The employment record | Contractor mode only for contractors; exit not before joining; an account only from Verified onward; `retention_due_on` is a generated column three years past exit; trigram index for directory search |
| `worker_email` | Personal and professional addresses | **`UNIQUE (email)` on a `citext` column** — one constraint delivering case-insensitive, both-fields, org-wide uniqueness under concurrency |
| `worker_team_lead` | Several team leads per worker | Composite primary key |

### Documents

| Table | Purpose | Key constraints and indexes |
|---|---|---|
| `document_requirement` | The checklist catalogue, branching on type, region and contractor mode | Allowed content types and size limit held per requirement |
| `worker_document` | One row per required item | `is_mandatory` frozen at creation, so later configuration changes cannot move the gate under an in-flight worker; partial index on unapproved mandatory items powers the gate |
| `document_version` | Every uploaded file | Object key unique and carries no personal data; `scan_state` gates availability until malware scanning passes |
| `document_decision` | Every approve and reject | A rejection must carry a reason; reason `other` must carry a note |
| `document_access_log` | Who viewed or downloaded a document | Append-only |

### Attendance and leave

| Table | Purpose | Key constraints and indexes |
|---|---|---|
| `holiday_calendar` | Company holidays per region | Unique per region and date. A holiday is not leave and consumes no entitlement |
| `leave_type` | Paid categories and unpaid | Sick, Bereavement, PTO, Unpaid. Unpaid requires a remark. Entitlements are NULL pending Open Item 22 |
| `leave_request` | A request and its decision | End not before start; a decision carries both decider and timestamp or neither; **an EXCLUDE constraint makes two overlapping approved leaves physically impossible** |
| `attendance` | Daily status | Primary key on worker and date gives exactly one record per day |
| `time_session` | Clock in and out | End after start; a partial unique index allows only one running session per worker |

### Performance

| Table | Purpose | Key constraints and indexes |
|---|---|---|
| `review_period` | One review cycle per worker per month | Partial unique index on live rows, so a superseding review is a new row rather than an edit |
| `review_stage` | Self, team lead, HR, finalized | One row per stage; a submitted stage must be complete; sequence enforced by trigger; locked after submission by trigger |

### Immigration and eligibility

| Table | Purpose | Key constraints and indexes |
|---|---|---|
| `visa_record` | Visa held, never overwritten | EXCLUDE constraint permits only one live record per worker; encrypted number plus an HMAC column so lookup needs no decryption |
| `work_authorization` | Right to work and its restrictions | As above, plus `prohibits_unpaid` driving the unpaid-engagement rule; GIN index on restrictions |
| `education_record` | Graduation tracking for intern eligibility | Links to the evidence document |
| `eligibility_rule_set` / `eligibility_rule` | Versioned configuration per country | Priority unique within a set, so evaluation order is unambiguous |
| `eligibility_decision` | The recorded outcome | References the exact rule set evaluated and stores an immutable JSONB input snapshot; insert-only |
| `eligibility_override` | An authorised override | Requires a written reason and links to the one-time-code challenge that authorised it |
| `expiry_alert` | Alerts already sent | **`UNIQUE (subject_type, subject_id, threshold_days)`** — the constraint that makes the daily scan safe to re-run |
| `scan_run` | Observability for the scan | Records what each run examined and raised, so a scheduler that stops silently is detectable |

### Messaging and operations

| Table | Purpose | Key constraints and indexes |
|---|---|---|
| `notification` | In-app notifications | Partial index on unread |
| `outbox` | Transactional outbox | A message is enqueued in the same transaction as the change it announces, so "notified but not saved" cannot occur |
| `otp_challenge` | One-time codes | Hash stored, never the code; attempt counter and lockout held on the row |
| `rate_limit` | Fixed-window counters | Keyed by bucket and window |
| `audit_log` | Every sensitive action | Append-only by grant and trigger; before and after values as JSONB |

---

## 6. Enumerated types

| Type | Values |
|---|---|
| `worker_type` | Employee, Contractor, Intern |
| `worker_stage` | invited, documents_submitted, verifying, verified, active, inactive |
| `access_tier` | founder, hr, employee, intern |
| `edge_type` | reports_to, accountable_to, dotted |
| `document_status` | outstanding, pending, approved, rejected |
| `scan_status` | pending, clean, infected, failed |
| `rejection_reason` | unclear, expired, invalid, incomplete, damaged, wrong_document, illegible_signature, other |
| `attendance_status` | present, absent, leave, holiday |
| `punch_place` | in_office, remote, outside_geofence, location_off, hr_entered |
| `leave_status` | pending, approved, rejected, cancelled |
| `review_stage_kind` | self, team_lead, hr, finalized |
| `eligibility_effect` | eligible, ineligible, needs_review |

`documents_submitted` is retained only because Open Item 18 has not yet decided whether to remove it. Nothing sets it.

---

## 7. How each specification rule is enforced

This is the section to review most closely. Each row names the specification rule and the database object that makes it true.

| Specification rule | Enforced by |
|---|---|
| One email identifies one worker — case-insensitive, both fields, create and edit | `UNIQUE (email)` on `worker_email.email`, a `citext` column. Race-free by construction |
| Account creation refused if any mandatory document is unapproved | `activate_worker()` takes `FOR UPDATE` on the worker row, counts unapproved mandatory documents, and raises. Two concurrent activations cannot both succeed |
| Reporting cycles refused **before commit**, not flagged afterwards | Constraint trigger `org_edge_no_cycle` running a `WITH RECURSIVE … CYCLE` traversal inside the writing transaction |
| A role may not report to itself; duplicate relationships refused | `CHECK (from_role_id <> to_role_id)` and `UNIQUE (from_role_id, to_role_id, type)` |
| Deleting a department moves its roles to the company root; the root cannot be deleted | `ON DELETE SET DEFAULT` to `unit_root`, plus the `protect_root_unit` trigger |
| A name matching nobody is recorded as unresolved, never silently repointed | Nullable `hr_lead_person_id` beside `hr_lead_unresolved`, with a CHECK that both are never set |
| Renaming a person reaches every reference including a self-reference | No cascade needed — every reference is a foreign key to `person.id` |
| Audit entries append-only for every user including the highest tier | `REVOKE UPDATE, DELETE … FROM app_rw` and `FROM PUBLIC`, plus a `deny_change()` trigger |
| Access enforced server-side; a disabled control is not the control | Row-level security on 13 tables keyed to `current_person()` and `current_tier()`. A missing WHERE clause returns nothing, not other people's rows |
| Review stages strictly sequential | `assert_review_sequence()` trigger requiring the prior stage to be submitted |
| A submitted review is locked; a change means a superseding review | `lock_submitted_review()` trigger plus a partial unique index on live review periods |
| Visa and work-authorization records never overwritten; one current per person | EXCLUDE constraints using GiST over `daterange`, filtered to live rows |
| No two approved leaves cover the same day | EXCLUDE constraint over `worker_id` and the generated `span` range, filtered to approved |
| Unpaid leave requires a written remark | `leave_type.requires_remark` with application enforcement, and a CHECK on rejection notes for the analogous document case |
| One attendance record per worker per day | Composite primary key |
| Expiry alert sends once per threshold per record | `UNIQUE (subject_type, subject_id, threshold_days)` with `ON CONFLICT DO NOTHING`, which is what makes a repeat scan produce nothing |
| Eligibility decisions reproducible after the rules change | Decision references `eligibility_rule_set` by version and stores an immutable JSONB input snapshot; the table is insert-only |
| Overrides require permission, a written reason and step-up verification | `eligibility_override` requires a non-blank reason and a foreign key to the one-time-code challenge |
| Identifier-class fields encrypted at rest | Ciphertext plus an HMAC column, with a unique index on the HMAC so lookup never decrypts the table. The key is held outside the database |
| Documents never served from a public path | No public URL exists in the schema; `document_version.object_key` is a private storage key, and every grant of access writes to `document_access_log` |
| Retention: three years after exit, then deletion | `worker.retention_due_on` is a generated column; the deletion job selects on its index; `DELETE ON worker` is revoked from the application role so only the retention process can run it |
| A count can never disagree with the list beneath it | Both derive from one query using a window-function count over the same filtered set |
| No partial writes | Every multi-table change runs in one transaction; the audit entry is written inside the same transaction as the change it records |

---

## 8. Security model

| Layer | Mechanism |
|---|---|
| Roles | `app_rw` for the application, `app_migrate` for schema changes and retention, `app_readonly` for reporting |
| Grants | `app_rw` holds INSERT only on the four append-only tables, and cannot DELETE from `worker` |
| Row-level security | Enabled on 13 tables. Founder and HR see everyone; every other tier sees only their own records; immigration tables are privileged-only |
| Session context | The application sets `wf.person_id` and `wf.tier` per transaction with `SET LOCAL`. Nothing is read from the client |
| Encryption | Identifier-class fields encrypted by the application; the key never enters the database |

The application must set the session variables inside the transaction. A connection that does not is treated as tier `employee` with no person, which sees nothing — the design fails closed.

---

## 9. Indexing strategy

| Access pattern | Index |
|---|---|
| Directory filtered by status and department | `worker (status, department_unit_id)` |
| Dashboard onboarding pipeline counts | `worker (status, stage)` |
| HR verification queue | Partial index on `worker_document (status) WHERE status = 'pending'` |
| The account-creation gate | Partial index on unapproved mandatory documents per worker |
| Org chart grouped by department then seniority | `org_role (unit_id, level)` |
| Recursive scope and cycle checks | `org_edge (from_role_id)` and `(to_role_id)` |
| Fuzzy name search | GIN trigram index on the concatenated name |
| Expiring visas and authorizations | Partial indexes on `valid_to` for live records |
| Retention sweep | Partial index on `retention_due_on` |
| Identifier lookup without decryption | Unique index on the HMAC column |

Every index above exists because a stated access pattern needs it. None is speculative.

---

## 10. Deliberately not in the schema

| Not included | Why |
|---|---|
| A stored access tier or role column | Tier is derived from the organization chart on every request. Storing it creates a second source of truth |
| A stored leave balance | Derived by view from approved requests, so it cannot drift from the requests it summarises |
| Payroll, invoicing, contracts | Out of scope in the Functional Specification |
| Table partitioning on attendance | At 34–50 workers the volume does not justify it. The design does not prevent adding it later |
| A separate reporting database | A read-only replica of this schema answers every reporting need at this scale |

---

## 11. Applying the schema

| # | File | Contents |
|---|---|---|
| 001 | `001_extensions_roles.sql` | Extensions, database roles, schema |
| 002 | `002_enums.sql` | 20 enumerated types |
| 003 | `003_org.sql` | Organization structure and sign-in activity |
| 004 | `004_worker.sql` | Worker record, emails, team leads |
| 005 | `005_documents.sql` | Requirements, documents, versions, decisions, access log |
| 006 | `006_onboarding.sql` | Tokenized onboarding links |
| 007 | `007_attendance_leave.sql` | Holidays, leave types, requests, attendance, sessions |
| 008 | `008_performance.sql` | Review periods and stages |
| 009 | `009_tasks_notes.sql` | Goals, tasks, notes |
| 010 | `010_immigration_eligibility.sql` | Immigration, authorization, rules, decisions, alerts |
| 011 | `011_notifications_audit_ops.sql` | Notifications, outbox, one-time codes, rate limits, audit |
| 012 | `012_functions_triggers_views.sql` | The rules: triggers, the activation gate, scope and balance views |
| 013 | `013_rls_and_grants.sql` | Row-level security and least-privilege grants |
| 014 | `014_seed_reference_data.sql` | Root unit, leave types, document requirements |

Files are applied in numeric order. Every foreign key references a table created earlier, so the order is the dependency order. Reference data in 014 is configuration, not employee data — no personal data is seeded.

---

## 12. Open items affecting this schema

| Open item | Effect on the schema |
|---|---|
| 1 — which role model is authoritative | The `access_tier` enum and every row-level security policy predicate. The mechanism is built; the tier list is not final |
| 5 — default when no eligibility rule matches | The terminal case of the rules engine. No schema change, but the engine cannot be written without it |
| 7 — confirm document requirements | Rows in `document_requirement`, not structure |
| 18 — is `documents_submitted` intended | One value in the `worker_stage` enum, retained until decided |
| 22 — paid leave entitlements | `leave_type.entitlement_days`, `accrual` and `carry_over_days` are deliberately NULL until HR sets them |
| 23 — holiday calendar ownership | Rows in `holiday_calendar` per region |
| 12 — compliance regimes | The retention period, currently three years, and the scope of identifier encryption |
