# Deploying without billing — exact steps

## Read this first: GCP free tier does not avoid billing

"Always Free" on Google Cloud means free *usage allowances*, not *no billing
account*. Every service in W1-06 → W1-13 refuses to enable until a billing
account is linked to the project, and **Cloud SQL has no free tier at all** —
there is no configuration of it that costs nothing.

So W1-06 → W1-13 cannot be done without billing. What follows is the same
architecture on providers whose free tiers need **no credit card**, mapped
item-for-item so the tracker still lines up.

| Your item | Free-tier equivalent | Card needed |
|---|---|---|
| W1-06 project + APIs | Neon + Render + Vercel accounts (GitHub sign-in) | No |
| W1-07 Cloud SQL private IP | **Neon** Postgres 17 — no public port at all, TLS only | No |
| W1-08 Auth Proxy for local dev | Not needed — connect directly over TLS | No |
| W1-09 Secret Manager | Render + Vercel encrypted environment variables | No |
| W1-10 VPC connector | Not needed — managed TLS replaces it | No |
| W1-11 Dockerfile + standalone | **Already done.** Render builds the same Dockerfile | No |
| W1-12 Cloud Run + Cloud Build trigger | **Render** (API) + **Vercel** (web), both auto-deploy on push | No |
| W1-13 env docs | **Already done** — `deploy/README.md` | No |

Nothing is wasted: the Dockerfiles, schema, migrations and `cloudbuild.yaml`
all still apply when billing is approved. Only the hosting changes.

**The one real drawback:** Render's free tier spins the API down after 15
minutes idle, and the next request takes ~50 seconds to wake it. Open the URL a
minute before any demo.

---

## Step 0 — Push the code (5 min)

Render and Vercel deploy from GitHub, so the current work has to be on `main`.

```bash
cd ~/Desktop/katbotz-workforce/Workforce
git status                     # look at what you are about to commit
git add -A
git commit -m "PostgreSQL schema, API, onboarding, deploy configs"
git push origin main
```

---

## Step 1 (≙ W1-07) — Create the database on Neon (5 min)

1. **neon.com** → *Sign up* → **Continue with GitHub**. No card.
2. *Create project*:
   - Name `workforce`
   - Postgres version **17**
   - Region **AWS ap-southeast-1 (Singapore)** — closest free region to India
3. Copy the connection string it shows. It looks like:
   ```
   postgresql://neondb_owner:PASSWORD@ep-xxx-yyy.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
   ```
4. **Change the scheme** for SQLAlchemy — insert `+psycopg`:
   ```
   postgresql+psycopg://neondb_owner:PASSWORD@ep-xxx.../neondb?sslmode=require
   ```

Keep both forms. The `postgresql://` one is for `psql`; the
`postgresql+psycopg://` one is for the app.

Neon has no public port to lock down and no VPC to configure — it only accepts
TLS connections authenticated by role. That is what W1-07's private IP and
W1-10's connector were for, achieved by the platform instead.

---

## Step 2 (≙ W1-08) — Apply the schema (5 min)

No Auth Proxy needed; connect straight over TLS.

```bash
cd ~/Desktop/katbotz-workforce/Workforce
WF_DB="postgresql://neondb_owner:PASSWORD@ep-xxx.../neondb?sslmode=require" \
  ./db/migrate-remote.sh
```

It asks for confirmation, applies the files in order, then prints the counts.
Expect **37 tables / 269 columns / 54 foreign keys**.

Add the demo engagements so the roster is not empty:

```bash
psql "postgresql://neondb_owner:PASSWORD@ep-xxx.../neondb?sslmode=require" \
  -f db/demo/98_demo_engagements.sql
```

### Then fix the append-only guarantee

`80_security.sql` prints a **warning** if the `wf_app` role could not be
created, because Neon's owner role may not be allowed to create roles in SQL.
If you saw that warning, the audit tables are *not* tamper-proof yet. Fix it in
the Neon console:

1. Neon project → **Roles** → *Add role* → name `wf_app` → copy its password
2. Back in your terminal, re-run just the grants:
   ```bash
   psql "postgresql://neondb_owner:PASSWORD@ep-xxx.../neondb?sslmode=require" \
     -f db/migrations/80_security.sql
   ```
   It should now say `Grants applied; audit tables are append-only for wf_app.`
3. Use the **`wf_app`** credentials in the app's `DATABASE_URL`, not the owner's.
   Connecting as the owner would let the app grant itself back the permissions
   the whole guarantee depends on.

---

## Step 3 (≙ W1-12, part 1) — Deploy the API on Render (10 min)

1. **render.com** → *Get Started* → **GitHub**. No card.
2. *New* → **Web Service** → connect `KATBOTZ-LLC/Workforce`
3. Render reads `render.yaml`, so most fields are pre-filled. Confirm:
   - Name `wf-api`, Region **Singapore**, Instance type **Free**
   - Runtime **Docker**, Dockerfile path `./backend/Dockerfile`
4. **Environment** — add these (this is W1-09):

   | Key | Value |
   |---|---|
   | `DATABASE_URL` | the `postgresql+psycopg://wf_app:...?sslmode=require` string |
   | `SESSION_SECRET` | click **Generate** |
   | `GOOGLE_CLIENT_ID` | your OAuth client id (or leave blank for now) |
   | `ALLOWED_DOMAIN` | `katbotz.com` |
   | `FRONTEND_ORIGIN` | leave blank — filled in step 5 |

5. *Create Web Service*. First build takes 5–10 minutes.
6. Check it:
   ```bash
   curl https://wf-api-XXXX.onrender.com/api/health
   ```
   Expect `{"status":"ok"}`. Copy that base URL.

---

## Step 4 (≙ W1-12, part 2) — Deploy the web app on Vercel (5 min)

1. **vercel.com** → *Sign up* → **GitHub**. No card.
2. *Add New* → **Project** → import `KATBOTZ-LLC/Workforce`
3. **Root Directory** → set to **`frontend`**. This matters — the repo root is
   not the Next.js app.
4. **Environment Variables**:

   | Key | Value |
   |---|---|
   | `API_PROXY_TARGET` | `https://wf-api-XXXX.onrender.com` |
   | `NEXT_PUBLIC_API_BASE_URL` | *(leave empty)* |
   | `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | your OAuth client id, or empty |

5. *Deploy*. You get `https://workforce-xxxx.vercel.app`.

`API_PROXY_TARGET` makes Vercel serve `/api/*` from Render on the **same
origin**, so there is no CORS and one URL serves everything. It is read when
`next.config.js` is evaluated at build time, so **changing it needs a redeploy**,
not just a restart.

---

## Step 5 — Close the loop (2 min)

1. In **Render** → `wf-api` → Environment, set
   `FRONTEND_ORIGIN=https://workforce-xxxx.vercel.app` and save. It redeploys.
2. In the **Google Cloud console** (this part is free and needs no billing) →
   APIs & Services → Credentials → your OAuth Web client → **Authorized
   JavaScript origins** → add `https://workforce-xxxx.vercel.app`.

Then open `https://workforce-xxxx.vercel.app/live`.

---

## If you want sign-in working before the OAuth client exists

The dev-only sign-in can carry the demo, but it is a real exposure on a public
URL: without a passcode, anyone with the link can sign in as the founder and
read all 34 names and addresses.

On Render, set **both**:

```
WF_DEV_LOGIN=1
WF_DEV_LOGIN_PASSCODE=<something long>
```

With the passcode set, the address list is withheld until it is entered, and
sign-in returns 401 without it. **Remove both variables the moment real Google
sign-in works.**

---

## Cost, honestly

| | Free tier | Limit that will bite first |
|---|---|---|
| Neon | 0.5 GB storage, autosuspends when idle | Storage, eventually. Wakes in about a second |
| Render | 750 instance-hours/month | **Spins down after 15 min idle; ~50s cold start** |
| Vercel | 100 GB bandwidth/month | Nothing, at this scale |

Total: **$0**, no card. Good enough for a demo and for internal use by a
handful of people. If it becomes the real HR system, revisit Cloud SQL — the
$18–25/month buys no cold starts, backups you control, and everything in one
provider.

## Faster path, if the demo is imminent

Skip all of the above and expose your laptop for the length of the call:

```bash
./demo.sh --public
```

It rebuilds the database with demo data, starts both servers, generates a
passcode, asks you to confirm, then prints a public URL. `./demo.sh --stop`
ends it. Nothing is left running and nothing is hosted anywhere.
