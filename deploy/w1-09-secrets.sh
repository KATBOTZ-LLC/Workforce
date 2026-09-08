#!/usr/bin/env bash
# W1-09  Secret Manager — DATABASE_URL and the OAuth values.
#
# Cloud Run reads these at start-up as environment variables. Nothing secret is
# written to this repository, baked into an image, or printed by this script.
set -euo pipefail
. "$(dirname "$0")/config.sh"; require

put_secret () {  # put_secret NAME VALUE
  if gcloud secrets describe "$1" >/dev/null 2>&1; then
    printf '%s' "$2" | gcloud secrets versions add "$1" --data-file=- >/dev/null
    echo "  $1  new version added"
  else
    printf '%s' "$2" | gcloud secrets create "$1" --data-file=- --replication-policy=automatic >/dev/null
    echo "  $1  created"
  fi
}

PRIVATE_IP="$(gcloud sql instances describe "$SQL_INSTANCE" --format='value(ipAddresses[0].ipAddress)')"
[ -n "$PRIVATE_IP" ] || { echo "Could not read the instance's private IP. Run W1-07 first."; exit 1; }

DB_PW="$(gcloud secrets versions access latest --secret=wf-db-password 2>/dev/null || true)"
[ -n "$DB_PW" ] || { echo "wf-db-password is missing. Run W1-07 first."; exit 1; }

echo "Writing secrets:"

# Cloud Run reaches the PRIVATE address through the VPC connector, so the host
# here is the private IP, not a Unix socket and not a public address.
put_secret wf-database-url \
  "postgresql+psycopg://$DB_APP_USER:$DB_PW@$PRIVATE_IP:5432/$DB_NAME"

if ! gcloud secrets describe wf-session-secret >/dev/null 2>&1; then
  put_secret wf-session-secret "$(python3 -c 'import secrets;print(secrets.token_urlsafe(48),end="")')"
else
  echo "  wf-session-secret  already exists (left alone — rotating it signs everyone out)"
fi

# The browser sign-in flow (Google Identity Services) needs only the client ID,
# which is a public identifier. The client SECRET is stored only if you have one
# and intend to add a server-side code exchange later.
if [ -n "${GOOGLE_CLIENT_ID:-}" ]; then
  put_secret wf-google-client-id "$GOOGLE_CLIENT_ID"
else
  echo "  wf-google-client-id  SKIPPED — set GOOGLE_CLIENT_ID and re-run"
fi
if [ -n "${GOOGLE_CLIENT_SECRET:-}" ]; then
  put_secret wf-google-client-secret "$GOOGLE_CLIENT_SECRET"
else
  echo "  wf-google-client-secret  skipped (not needed for the browser flow)"
fi

put_secret wf-documents-bucket "$BUCKET"

# Cloud Run's runtime identity must be allowed to read them.
SA="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')-compute@developer.gserviceaccount.com"
echo
echo "Granting secret access to $SA:"
for s in wf-database-url wf-session-secret wf-documents-bucket wf-google-client-id; do
  gcloud secrets describe "$s" >/dev/null 2>&1 || continue
  gcloud secrets add-iam-policy-binding "$s" \
    --member="serviceAccount:$SA" --role=roles/secretmanager.secretAccessor \
    --quiet >/dev/null && echo "  $s  ok"
done

# The API writes and reads uploaded documents.
gcloud storage buckets add-iam-policy-binding "gs://$BUCKET" \
  --member="serviceAccount:$SA" --role=roles/storage.objectAdmin --quiet >/dev/null
echo "  gs://$BUCKET  objectAdmin granted"

echo
echo "W1-09 done. Inspect a value with:"
echo "  gcloud secrets versions access latest --secret=wf-database-url"
