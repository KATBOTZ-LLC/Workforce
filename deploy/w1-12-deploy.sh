#!/usr/bin/env bash
# W1-12  Build both images and deploy both Cloud Run services.
#
# Images are built by Cloud Build. Deployment happens from HERE rather than
# inside the build, for one reason: Cloud Build substitutions are written to
# build logs, and DATABASE_URL contains the database password. Passing it as a
# substitution would publish it to anyone who can read a build.
#
# Secret Manager would normally hold it, but roles/editor on this project can
# create secrets and neither read their values nor grant Cloud Run access to
# them (secretmanager.versions.access and secretmanager.secrets.setIamPolicy
# are both denied). So the values are set with `gcloud run services update`,
# where they never leave this machine.
#
# TO FIX PROPERLY, ask an Owner for:
#   gcloud projects add-iam-policy-binding katbotz-hr-and-vendor-portal \
#     --member=user:aayushi111@katbotz.com --role=roles/secretmanager.admin
# then switch the two --set-env-vars below back to --set-secrets.
set -euo pipefail
. "$(dirname "$0")/config.sh"; require
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

: "${WF_DATABASE_URL:?Set WF_DATABASE_URL (the Cloud Run socket form: postgresql+psycopg://user:pw@/db?host=/cloudsql/CONN)}"
: "${WF_SESSION_SECRET:?Set WF_SESSION_SECRET}"
CONN="$(gcloud sql instances describe "$SQL_INSTANCE" --format='value(connectionName)')"

# Sign-in. Real Google sign-in needs GOOGLE_CLIENT_ID; until that exists the
# deployed app has NO way to sign in at all, which makes the URL useless. The
# dev sign-in fills that gap, but only with a passcode: without one, anyone
# holding the URL could sign in as the founder and read every name and address
# in the directory. So it is refused unless a passcode is supplied.
DEV_ENV=""
if [ -n "${WF_DEV_LOGIN_PASSCODE:-}" ]; then
  if [ "${#WF_DEV_LOGIN_PASSCODE}" -lt 12 ]; then
    echo "WF_DEV_LOGIN_PASSCODE is too short. Use at least 12 characters — this is"
    echo "the only thing standing between a public URL and the whole directory."
    exit 1
  fi
  DEV_ENV=",WF_DEV_LOGIN=1,WF_DEV_LOGIN_PASSCODE=$WF_DEV_LOGIN_PASSCODE"
  echo "NOTE: deploying WITH the passcode-gated dev sign-in. Remove both variables"
  echo "      once GOOGLE_CLIENT_ID is configured:"
  echo "      gcloud run services update $BACKEND_SERVICE --region $REGION \\"
  echo "        --remove-env-vars WF_DEV_LOGIN,WF_DEV_LOGIN_PASSCODE"
elif [ -z "${GOOGLE_CLIENT_ID:-}" ]; then
  echo "Neither GOOGLE_CLIENT_ID nor WF_DEV_LOGIN_PASSCODE is set, so the deployed"
  echo "app would have no way to sign in. Set one of them and re-run."
  exit 1
fi
TAG="${TAG:-v$(date +%Y%m%d-%H%M%S)}"
AR="$REGION-docker.pkg.dev/$PROJECT_ID/$REPO"

confirm "Deploy to Cloud Run in $PROJECT_ID / $REGION:
  builds   $BACKEND_SERVICE and $FRONTEND_SERVICE at tag $TAG
  cloudsql $CONN (over the platform's built-in proxy)
  Cloud Build minutes are billable; Cloud Run scales to zero."

echo "1/4  Building the API image..."
gcloud builds submit "$ROOT/backend" --tag "$AR/$BACKEND_SERVICE:$TAG"

echo "2/4  Deploying the API..."
gcloud run deploy "$BACKEND_SERVICE" \
  --image "$AR/$BACKEND_SERVICE:$TAG" \
  --region "$REGION" --platform managed \
  --add-cloudsql-instances "$CONN" \
  --set-env-vars "DATABASE_URL=$WF_DATABASE_URL,SESSION_SECRET=$WF_SESSION_SECRET,DOCUMENTS_BUCKET=$BUCKET,ALLOWED_DOMAIN=$ALLOWED_DOMAIN,GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID:-}$DEV_ENV" \
  --min-instances 0 --max-instances 4 --allow-unauthenticated --quiet
API_URL="$(gcloud run services describe "$BACKEND_SERVICE" --region "$REGION" --format='value(status.url)')"
echo "     $API_URL"

echo "3/4  Building the web image..."
# API_PROXY_TARGET is a RUNTIME variable for the Next.js server, so it does not
# need to be a build arg. NEXT_PUBLIC_* do, because they are inlined into the
# browser bundle at build time.
gcloud builds submit "$ROOT/frontend" \
  --config /dev/stdin <<YAML
steps:
  - name: gcr.io/cloud-builders/docker
    args:
      - build
      - --build-arg=NEXT_PUBLIC_API_BASE_URL=
      - --build-arg=NEXT_PUBLIC_GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID:-}
      - -t
      - $AR/$FRONTEND_SERVICE:$TAG
      - .
images:
  - $AR/$FRONTEND_SERVICE:$TAG
options:
  logging: CLOUD_LOGGING_ONLY
YAML

echo "4/4  Deploying the web app..."
# NEXT_PUBLIC_API_BASE_URL is deliberately EMPTY in the build above: the browser
# calls /api/* on its own origin and the Next.js server proxies to the API via
# API_PROXY_TARGET. One origin, no CORS, and the API URL is not baked into the
# bundle.
gcloud run deploy "$FRONTEND_SERVICE" \
  --image "$AR/$FRONTEND_SERVICE:$TAG" \
  --region "$REGION" --platform managed \
  --set-env-vars "API_PROXY_TARGET=$API_URL" \
  --min-instances 0 --max-instances 4 --allow-unauthenticated --quiet
WEB_URL="$(gcloud run services describe "$FRONTEND_SERVICE" --region "$REGION" --format='value(status.url)')"

# The API only accepts browser requests from an origin it knows.
gcloud run services update "$BACKEND_SERVICE" --region "$REGION" \
  --update-env-vars "FRONTEND_ORIGIN=$WEB_URL" --quiet >/dev/null

cat <<DONE

W1-12 done.
  API  $API_URL
  WEB  $WEB_URL

Sign-in needs one more thing: add $WEB_URL to the OAuth client's
Authorized JavaScript origins.
  https://console.cloud.google.com/apis/credentials?project=$PROJECT_ID
DONE
