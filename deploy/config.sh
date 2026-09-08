# Shared settings for the W1-06 .. W1-13 scripts. Edit this file, nothing else.

# katbotz-hr-and-vendor-portal, NOT workforce-503018.
#
# workforce-503018 has no billing account and nobody on this account can link
# one. katbotz-hr-and-vendor-portal already has billing
# (billingAccounts/017391-1C00E4-16772C) and aayushi111@katbotz.com holds
# roles/editor there, which covers every step from W1-06 to W1-12.
#
# That billing account is REAL SPEND, not trial credit. W1-07 and W1-10 commit
# roughly $18-25/month to it. Confirm that is authorised before running them.
export PROJECT_ID="${PROJECT_ID:-katbotz-hr-and-vendor-portal}"
export REGION="${REGION:-asia-south1}"

# --- W1-07 Cloud SQL (private IP) -----------------------------------------
export SQL_INSTANCE="${SQL_INSTANCE:-wf-postgres}"
export DB_NAME="${DB_NAME:-workforce}"
export DB_APP_USER="${DB_APP_USER:-wf_app}"
export SQL_TIER="${SQL_TIER:-db-f1-micro}"

# --- W1-07/W1-10 networking ------------------------------------------------
# Private IP means the instance has NO public address. Reaching it requires
# either the Auth Proxy (local dev, W1-08) or a VPC connector (Cloud Run, W1-10).
export NETWORK="${NETWORK:-default}"
export PEERING_RANGE="${PEERING_RANGE:-google-managed-services-$NETWORK}"
# Cloud Run uses Direct VPC egress rather than a Serverless VPC Access
# connector — same result, no always-on instances to pay for. See
# deploy/w1-10-vpc-connector.sh for why.
export SUBNET="${SUBNET:-default}"

# --- W1-06 Cloud Storage ---------------------------------------------------
# Holds uploaded documents. DOCUMENT_FILE.file_storage_key is the object name,
# which is why that column is deliberately opaque — see the schema blueprint.
export BUCKET="${BUCKET:-$PROJECT_ID-wf-documents}"

# --- W1-12 Cloud Run / Cloud Build ----------------------------------------
export REPO="${REPO:-workforce}"
export BACKEND_SERVICE="${BACKEND_SERVICE:-wf-api}"
export FRONTEND_SERVICE="${FRONTEND_SERVICE:-wf-web}"
export GITHUB_OWNER="${GITHUB_OWNER:-KATBOTZ-LLC}"
export GITHUB_REPO="${GITHUB_REPO:-Workforce}"
export DEPLOY_BRANCH="${DEPLOY_BRANCH:-main}"

export ALLOWED_DOMAIN="${ALLOWED_DOMAIN:-katbotz.com}"

# ---------------------------------------------------------------------------
export PATH="/opt/homebrew/share/google-cloud-sdk/bin:$PATH"

require () {
  command -v gcloud >/dev/null 2>&1 || { echo "gcloud is not on PATH."; exit 1; }
  if ! gcloud auth list --filter=status:ACTIVE --format='value(account)' 2>/dev/null | grep -q .; then
    echo "Not signed in. Run this yourself (it opens a browser):  gcloud auth login"; exit 1
  fi
  # An expired token looks like being signed in until the first real call.
  if ! gcloud projects describe "$PROJECT_ID" >/dev/null 2>&1; then
    echo "Cannot reach project $PROJECT_ID. Your token may have expired — run:"
    echo "  gcloud auth login"; exit 1
  fi
  if [ "$(gcloud billing projects describe "$PROJECT_ID" --format='value(billingEnabled)' 2>/dev/null)" != "True" ]; then
    echo
    echo "BLOCKED: project $PROJECT_ID has no billing account linked."
    echo "Everything from W1-06 onward needs it. Someone with billing rights must"
    echo "link one, and grant you the Billing Account User role."
    echo "  https://console.cloud.google.com/billing/linkedaccount?project=$PROJECT_ID"
    exit 2
  fi
  gcloud config set project "$PROJECT_ID" >/dev/null 2>&1
}

confirm () {
  # Non-interactive callers can pass AUTO_APPROVE=1, but never do that for the
  # scripts that create billable resources unless you have read them.
  [ "${AUTO_APPROVE:-}" = "1" ] && return 0
  echo; echo "$1"; echo
  printf 'Type yes to continue: '; read -r reply
  [ "$reply" = "yes" ] || { echo "Cancelled."; exit 1; }
}
