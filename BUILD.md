# Workforce Platform — build status

The schema in `WF-001_Schema_Blueprint.docx` is now a running PostgreSQL
database, and the frontend reads it through the API. Everything below is
verified, not planned.

## Run it

Three commands, in three terminals.

```bash
# 1. database. --demo adds four engagements so the roster is not empty;
#    a rebuild DROPS everything created through the app.
./db/migrate.sh --demo

# 2. API
cd backend && WF_DEV_LOGIN=1 ./venv/bin/uvicorn app.main:app --reload --port 8000

# 3. web
cd frontend && npm run dev
```

Then open **http://localhost:3000/live**.

Prove the rules bite:

```bash
./db/migrate.sh --test                        # 20 schema/rule checks, throwaway database
cd backend && ./onboarding_lifecycle_test.sh  # 20 checks, Invited -> Active (needs the API running)
```

## What is built

| Layer | State |
|---|---|
| Schema | **37 tables, 268 columns, 54 foreign keys, 47 checks, 67 indexes.** Matches the blueprint exactly, plus `role.level` (see below). |
| Business rules | 20 enforced-and-tested, including append-only audit via revoked permissions. |
| Seed data | The real KATBOTZ org: 12 departments, 34 people, 50 seats, 43 holdings, 7 open positions. |
| Document checklists | **66 requirements across 8 checklists** (worker type x region x contractor mode), from your real onboarding lists. |
| API | FastAPI + SQLAlchemy on PostgreSQL. Directory, headcount, fuzzy search, form options, roster, and transactional onboarding. |
| Onboarding | **Working end to end.** Create → worker uploads by link → HR approves/rejects → activation gate → Active. 20/20 lifecycle checks. |
| Document storage | Opaque keys. Local directory today; set `DOCUMENTS_BUCKET` and it becomes Cloud Storage with no schema change. |
| Real roster import | `db/import/roster_template.csv` (34 real people pre-filled) + `import_roster.py`. Dry-run by default. |
| Frontend | `/live` reads all of the above and can create a worker. Access tier changes what the database returns. |
| GCP W1-06..W1-13 | One script per work item, plus `cloudbuild.yaml`. W1-11 and W1-13 **done**; the rest **blocked: no billing account linked to `workforce-503018`**. See `deploy/README.md`. |

## Layout

```
db/migrations/     00 extensions · 01-09 tables by module · 50 foreign keys
                   60 constraints · 70 indexes · 80 security · 90/96 seed
                   65_vocabularies_TO_CONFIRM.sql   not applied — needs sign-off
                   95_additions_beyond_blueprint.sql every departure, in one place
db/migrate.sh      rebuild local, --test to run the rule suite
db/migrate-remote.sh  apply to Cloud SQL (never drops)
deploy/            see deploy/README.md
schema/            SUPERSEDED 40-table design, kept for reference only
```

## Decisions that need a business owner

1. **`role.level` was added** beyond the approved 267 columns. The org chart
   lays seats out by band and the schema had nowhere to hold it; reporting
   lines would be the alternative but zero are recorded. See
   `95_additions_beyond_blueprint.sql`.
2. **Visa types and leave categories are free text.** The blueprint says both
   are controlled vocabularies; the FSD never enumerates either, so no list was
   invented. See `65_vocabularies_TO_CONFIRM.sql`.
3. **`base_tier` per seat** mirrors the rules confirmed with the founder on
   2026-08-25: founder is the CEO seat only, Recruiting is not HR. Result today
   is 1 founder, 4 HR, 2 interns, 43 employee.
4. **Email addresses are convention, not confirmed** —
   `firstname@katbotz.com`, disambiguated on collision. Sign-in depends on them.
5. **`last_name` is nullable.** 20+ people in the real org matrix have one
   name. Directory search uses `concat_ws` for exactly this reason.
6. **No EMPLOYMENT rows are seeded.** The org matrix records no join dates or
   worker types and both are NOT NULL. Engagements arrive through onboarding
   rather than being invented here.

## Onboarding, verified end to end

Creating a worker writes PERSON, PERSON_EMAIL, EMPLOYMENT, EMPLOYMENT_ASSIGNMENT,
the whole WORKER_DOCUMENT checklist and an ONBOARDING_TOKEN in **one transaction**.

| Check | Result |
|---|---|
| India C2C contractor | 12 documents, 9 mandatory |
| US C2C contractor | 6 documents, 6 mandatory |
| US intern | 9 documents, 5 mandatory |
| India employee | 6 documents, 6 mandatory |
| Duplicate email, different case | 409, rejected by `uq_person_email_lower` |
| Invalid department id | 422, rejected |
| People count after 2 failed creates | Unchanged. Zero orphans. |
| Raw onboarding link recoverable from the DB | No — only a 64-char SHA-256 hash is stored |

Same worker type and engagement mode in a different region gets a different
checklist. That is the defect from the circulated design, now fixed: region
comes from the engagement's WORK_LOCATION.

## GCP is blocked, and not on anything I can do

`workforce-503018` is active and I am authenticated as aayushi111@katbotz.com,
but `gcloud billing projects describe` returns `False` and
`gcloud billing accounts list` returns zero accounts. Only `iam.googleapis.com`
could be enabled; everything else failed with `UREQ_PROJECT_BILLING_NOT_FOUND`.

Someone with billing rights must link a billing account to the project. After
that, `./deploy/01-enable-apis.sh` onward runs unchanged.

## Not done yet

* Google Sign-In — needs an OAuth client id from the KATBOTZ cloud console.
  Until then `/live` uses `dev_login.py`, which requires `WF_DEV_LOGIN=1` and
  does not exist otherwise.
* The other 18 frontend pages still read `localStorage` via `workforceStore.tsx`.
  `/live` is the first page on real data.
* **The `/onboard/[token]` page and the HR verification screen are API-less.**
  The endpoints work and are tested, but the two pages still read the browser
  store, so nobody can use this without curl yet. That is the next job.
* **Real employment data.** The database holds 34 real people and zero
  engagements. Worker type, join date and work location are not recorded
  anywhere and cannot be inferred — fill
  `db/import/roster_template.csv` and run the importer.
* Modules 3, 4, 6, 8 (immigration, eligibility, performance, tasks) have tables
  and constraints but no endpoints.
