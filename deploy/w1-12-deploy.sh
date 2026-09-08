#!/usr/bin/env bash
# W1-12  Cloud Run services + Cloud Build trigger, staging deploy.
#
# BILLABLE: Cloud Build minutes, and Cloud Run (which scales to zero, so idle
# costs nothing).
#
# ONE MANUAL STEP FIRST. Cloud Build cannot read a private GitHub repository
# until you authorise the connection once in the browser:
#
#   https://console.cloud.google.com/cloud-build/repositories
#   -> 1st gen -> Connect repository -> GitHub -> KATBOTZ-LLC/Workforce
#
# Without that, the trigger cannot be created. The manual deploy below works
# regardless, because it uploads the source directly.
set -euo pipefail
. "$(dirname "$0")/config.sh"; require

if [ -z "${GOOGLE_CLIENT_ID:-}" ]; then
  echo "GOOGLE_CLIENT_ID is not set — the deployed app would have no working sign-in."
  echo "Create an OAuth 2.0 Web client (APIs & Services > Credentials), then:"
  echo "  GOOGLE_CLIENT_ID=...apps.googleusercontent.com ./deploy/w1-12-deploy.sh"
  exit 1
fi

for s in wf-database-url wf-session-secret; do
  gcloud secrets describe "$s" >/dev/null 2>&1 || { echo "Missing secret $s — run W1-09 first."; exit 1; }
done
gcloud compute networks vpc-access connectors describe "$CONNECTOR" --region "$REGION" >/dev/null 2>&1 \
  || { echo "VPC connector $CONNECTOR not found — run W1-10 first."; exit 1; }

confirm "Staging deploy to $PROJECT_ID / $REGION:
  builds and deploys $BACKEND_SERVICE and $FRONTEND_SERVICE via cloudbuild.yaml
  Cloud Build minutes are billable; Cloud Run scales to zero."

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
echo "Submitting the build (10-15 minutes for a first run)..."
gcloud builds submit "$ROOT" \
  --config "$ROOT/cloudbuild.yaml" \
  --substitutions "_REGION=$REGION,_REPO=$REPO,_BACKEND=$BACKEND_SERVICE,_FRONTEND=$FRONTEND_SERVICE,_CONNECTOR=$CONNECTOR,_ALLOWED_DOMAIN=$ALLOWED_DOMAIN,_GOOGLE_CLIENT_ID=$GOOGLE_CLIENT_ID"

API_URL="$(gcloud run services describe "$BACKEND_SERVICE" --region "$REGION" --format='value(status.url)')"
WEB_URL="$(gcloud run services describe "$FRONTEND_SERVICE" --region "$REGION" --format='value(status.url)')"

echo
echo "Creating the push trigger on $GITHUB_OWNER/$GITHUB_REPO ($DEPLOY_BRANCH)..."
if gcloud builds triggers describe wf-staging --region "$REGION" >/dev/null 2>&1; then
  echo "  trigger wf-staging already exists"
elif gcloud builds triggers create github \
      --name=wf-staging --region="$REGION" \
      --repo-owner="$GITHUB_OWNER" --repo-name="$GITHUB_REPO" \
      --branch-pattern="^${DEPLOY_BRANCH}$" \
      --build-config=cloudbuild.yaml \
      --substitutions "_REGION=$REGION,_REPO=$REPO,_BACKEND=$BACKEND_SERVICE,_FRONTEND=$FRONTEND_SERVICE,_CONNECTOR=$CONNECTOR,_ALLOWED_DOMAIN=$ALLOWED_DOMAIN,_GOOGLE_CLIENT_ID=$GOOGLE_CLIENT_ID" 2>/dev/null; then
  echo "  trigger wf-staging created"
else
  echo "  Could not create the trigger. The repository is almost certainly not"
  echo "  connected to Cloud Build yet — do that once in the browser:"
  echo "    https://console.cloud.google.com/cloud-build/repositories?project=$PROJECT_ID"
  echo "  then re-run this script. The deploy above already succeeded."
fi

cat <<DONE

W1-12 done.
  API   $API_URL
  WEB   $WEB_URL

LAST STEP, and sign-in fails without it: add the web URL to the OAuth client's
Authorized JavaScript origins.
  https://console.cloud.google.com/apis/credentials?project=$PROJECT_ID
  -> Workforce Web -> Authorized JavaScript origins -> add  $WEB_URL
DONE
