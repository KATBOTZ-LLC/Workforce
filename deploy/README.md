# Deploying to Google Cloud — W1-06 to W1-13

## Project: `katbotz-hr-and-vendor-portal`, NOT `workforce-503018`

`workforce-503018` has no billing account and this account cannot link one.
`katbotz-hr-and-vendor-portal` already has billing
(`billingAccounts/017391-1C00E4-16772C`) and `aayushi111@katbotz.com` holds
`roles/editor` there. `deploy/config.sh` defaults to it.

That is a real company billing account, not trial credit.

## What roles/editor cannot do here, and what was done instead

Editor is enough for most of this, but three things are denied. Each has a
working substitute, and each substitute is a real deviation worth knowing about.

| Denied permission | Consequence | What was done instead |
|---|---|---|
| `servicenetworking.services.addPeering` | **Cloud SQL private IP is impossible** | Public interface with **no authorized networks**, so every direct connection is refused and the IAM-authenticated Auth Proxy is the only route in. Cloud Run uses the platform's built-in proxy (`--add-cloudsql-instances`) — no VPC, no connector, nothing extra billed. **W1-10 is therefore satisfied by configuration and costs $0.** |
| `secretmanager.versions.access` | Secrets can be created but never read | `DATABASE_URL` / `SESSION_SECRET` are set as Cloud Run env vars |
| `secretmanager.secrets.setIamPolicy` | Cloud Run cannot be granted secret access either | same |

Env vars are weaker than Secret Manager: anyone with project Viewer can read
them with `gcloud run services describe`. Everyone who can see this project
already has Editor, so the practical gap is small — but it is a gap. One IAM
grant closes it:

```bash
gcloud projects add-iam-policy-binding katbotz-hr-and-vendor-portal \
  --member=user:aayushi111@katbotz.com --role=roles/secretmanager.admin
```

Then switch the two `--set-env-vars` in `w1-12-deploy.sh` back to `--set-secrets`.

## Three things that will bite anyone repeating this

1. **`--edition=ENTERPRISE` is mandatory.** This organisation defaults new
   Cloud SQL instances to Enterprise Plus, whose smallest tier is
   `db-perf-optimized-N-2` — several times the cost — and which rejects
   `db-f1-micro` outright.
2. **`cloud-sql-proxy` needs `--token "$(gcloud auth print-access-token)"`.**
   Application Default Credentials are not configured, and
   `gcloud auth application-default login` needs a browser.
3. **`concat_ws` cannot be used in an index expression.** It is only STABLE.
   Cloud SQL refuses it; local PostgreSQL accepted it, which is how it got in.
   The trigram index and the query in `backend/app/directory.py` both use
   `coalesce(a,'') || ' ' || coalesce(b,'')` and must stay byte-identical, or
   the planner silently stops using the index.


One script per work item. Each prints what it will create and asks before
anything billable.

| Item | Script | Creates | Billable | Status |
|---|---|---|---|---|
| W1-06 | `w1-06-project-apis-storage.sh` | 10 APIs, Artifact Registry repo, documents bucket | Storage only | Ready — blocked on billing |
| W1-07 | `w1-07-cloudsql-private-ip.sh` | Peering range, VPC peering, Cloud SQL 17 (**private IP**), db, app user | **~$10-15/mo** | Ready — blocked on billing |
| W1-08 | `w1-08-proxy.sh` | Nothing — runs the Auth Proxy locally | No | Ready. `cloud-sql-proxy` installed |
| W1-09 | `w1-09-secrets.sh` | `wf-database-url`, `wf-session-secret`, `wf-documents-bucket`, OAuth values + IAM | Negligible | Ready — blocked on billing |
| W1-10 | `w1-10-vpc-connector.sh` | Serverless VPC Access connector | **~$8-10/mo** | Ready — blocked on billing |
| W1-11 | — | `backend/Dockerfile`, `frontend/Dockerfile`, `output: 'standalone'` | No | **Done** |
| W1-12 | `w1-12-deploy.sh` + `cloudbuild.yaml` | Both Cloud Run services, `wf-staging` push trigger | Build minutes; Run scales to zero | Ready — blocked on billing |
| W1-13 | — | `.env.local`, `.env.example`, this table | No | **Done** |

## Order

```bash
export PATH="/opt/homebrew/share/google-cloud-sdk/bin:$PATH"
gcloud auth login                      # you, in a browser

./deploy/w1-06-project-apis-storage.sh
./deploy/w1-07-cloudsql-private-ip.sh  # 5-10 min
./deploy/w1-09-secrets.sh
./deploy/w1-10-vpc-connector.sh        # 3-5 min
GOOGLE_CLIENT_ID=...apps.googleusercontent.com ./deploy/w1-12-deploy.sh
```

W1-08 is a separate, long-running terminal, used whenever you want local code
talking to Cloud SQL:

```bash
./deploy/w1-08-proxy.sh                # leave it open
# then, elsewhere:
PW=$(gcloud secrets versions access latest --secret=wf-db-password)
WF_DB="postgresql://wf_app:$PW@127.0.0.1:5433/workforce" ./db/migrate-remote.sh
```

## Two manual steps that cannot be scripted

1. **OAuth client** — APIs & Services > Credentials > Create > OAuth client ID >
   Web application. Authorized **JavaScript origins**: `http://localhost:3000`
   and, after W1-12, the `wf-web` URL. Leave redirect URIs empty; the sign-in
   button flow does not use them.
2. **Connect GitHub to Cloud Build** — needed only for the push trigger, once:
   console.cloud.google.com/cloud-build/repositories > Connect repository >
   `KATBOTZ-LLC/Workforce`. The manual deploy in W1-12 works without it.

## Google sign-in (W2-02)

Configured 2026-09-09. Client ID lives in `backend/.env` and
`frontend/.env.local`, both gitignored.

### How it is set up

* **Audience: Internal.** The project sits in the katbotz.com Workspace org, so
  Internal restricts sign-in to company accounts and avoids Google's app
  verification process entirely. External would have meant a review.
* **Authorized JavaScript origins** — both of these, exactly:
  ```
  http://localhost:3000
  https://wf-web-nkec6huiaq-el.a.run.app
  ```
  No trailing slash. `https` for the deployed one. A mismatch fails silently
  with a generic Google error rather than anything that names the cause.
* **Authorized redirect URIs: EMPTY.** The Google Identity Services button flow
  posts an ID token to our own endpoint; it never uses a redirect URI. Adding
  one does nothing, and its absence is not the cause of any error you hit.
* **The client secret is not used and not stored.** The browser flow needs only
  the client ID, which is a public identifier that ships inside the page. If a
  secret is ever exposed, reset it — nothing depends on it.

### How it works in the code

1. `frontend/app/page.tsx` loads Google Identity Services and renders the button
2. Google returns an ID token to the browser
3. The browser posts it to `POST /api/auth/google`
4. `backend/app/auth.py` verifies it with Google's own library, checks the email
   is verified and the domain matches `ALLOWED_DOMAIN`, then issues our session
5. `access.py` resolves tier and visibility from the org chart, per request

The session token is stored under `wop-session-token`, the same key the
passcode sign-in uses — so once Google sign-in works, every page that reads
that key works too, with no page-level changes.

### The failure you will actually hit

**"<email> is signed in but isn't recognized as a KATBOTZ org member" (403).**

Google authenticated the person correctly; the lookup in `PERSON_EMAIL` found
nothing. Every seeded address is a **convention guess**
(`firstname@katbotz.com`, disambiguated on collision), and real addresses often
differ — `aayushi111@katbotz.com` versus the seeded `ayushi@katbotz.com`, for
instance.

`PERSON_EMAIL` holds several addresses per person by design, so the fix is to
add the real one rather than replace the guess:

```sql
INSERT INTO person_email (person_id, email_type, email)
SELECT p.person_id, 'professional', 'real.address@katbotz.com'
  FROM person p
  JOIN person_email e ON e.person_id = p.person_id
 WHERE lower(e.email) = 'guessed.address@katbotz.com';
```

**Google sign-in cannot work org-wide until HR confirms the real addresses.**
Do not commit real addresses to this repository — it is public.

### Before making the services public

`WF_DEV_LOGIN=1` is currently set on the deployed `wf-api`, so the passcode
sign-in exists in the cloud. It is harmless while the services return 403, but
it must be removed **in the same change** that grants public access, not after:

```
gcloud run services update wf-api --region=asia-south1 \
  --remove-env-vars WF_DEV_LOGIN,WF_DEV_LOGIN_PASSCODE
```

## Read this before running W1-07: private IP vs local development

W1-07 (private IP) and W1-08 (local Auth Proxy) conflict, and the plan does not
say how to resolve it.

A private-IP-only instance has **no address reachable from outside the VPC**.
The Auth Proxy does not change that — with `--private-ip` it dials the private
address, and a laptop has no route to it. Three honest options:

1. **Add a public IP with no authorized networks.** Direct connections are still
   refused; the only way in is the Auth Proxy, authenticated with your Google
   IAM identity over TLS. Google's own documented local-dev pattern, and the
   default `w1-08-proxy.sh` suggests. Cloud Run still uses the private address.
2. **Stay private-only, tunnel through a Compute Engine VM using IAP.** More
   secure, another billable resource to run.
3. **Stay private-only, use Cloud SQL Studio** in the console for queries. No
   local app development against the real database.

`w1-08-proxy.sh` detects which state the instance is in and tells you the exact
command for option 1. Nothing is changed without you running it.

## Architecture

```
browser ──► Cloud Run: wf-web (Next.js standalone)
                │  NEXT_PUBLIC_API_BASE_URL compiled in at BUILD time
                ▼
            Cloud Run: wf-api (FastAPI)
                │  VPC connector, private-ranges-only egress
                ▼
            Cloud SQL: PostgreSQL 17 — PRIVATE IP, no public interface
                +
            Cloud Storage: gs://<project>-wf-documents
                           private, versioned, public access prevented
```

## Environment variables (W1-13)

### Backend — `backend/.env` locally, Secret Manager + Cloud Run in production

| Variable | Local | Production | Notes |
|---|---|---|---|
| `DATABASE_URL` | `.env` | secret `wf-database-url` | Private IP in production. Unset ⇒ falls back to the hardcoded org seed |
| `SESSION_SECRET` | `.env` | secret `wf-session-secret` | Signs session tokens. Rotating signs everyone out |
| `DOCUMENTS_BUCKET` | unset | secret `wf-documents-bucket` | Holds `DOCUMENT_FILE.file_storage_key` objects |
| `GOOGLE_CLIENT_ID` | `.env` | env var | Public identifier, not a secret |
| `ALLOWED_DOMAIN` | default `katbotz.com` | env var | Only this domain may sign in |
| `FRONTEND_ORIGIN` | `http://localhost:3000` | env var, set by `link-cors` | CORS. Must match the web URL exactly |
| `FIRESTORE_PROJECT_ID` | blank | unset | Legacy, unused once `DATABASE_URL` is set |
| `WF_DEV_LOGIN` | `1` when needed | **never** | Exposes `/api/dev/login`. `cloudbuild.yaml` never sets it |

### Frontend — `frontend/.env.local` locally, `--build-arg` in production

| Variable | Notes |
|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | Compiled into the browser bundle at build time. A change needs a rebuild |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Same. Public identifier |

Neither `NEXT_PUBLIC_*` value can be a secret — both ship to the browser.

## Cost control

Cloud Run scales to zero. Cloud SQL and the VPC connector do not — together
roughly **$18-25/month** running continuously. Stop the database between demos:

```bash
gcloud sql instances patch wf-postgres --activation-policy=NEVER   # stop
gcloud sql instances patch wf-postgres --activation-policy=ALWAYS  # start
```

The connector cannot be stopped, only deleted and recreated. Cloud Run's Direct
VPC egress would remove that cost entirely — worth revisiting if the ~$9/month
matters.
