#!/usr/bin/env bash
# W1-08  Cloud SQL Auth Proxy for local development.
#
# READ THIS FIRST — W1-07 and W1-08 are in tension.
#
# A private-IP-only instance has no address reachable from outside the VPC. The
# Auth Proxy does not change that: with --private-ip it dials the private
# address, which your laptop has no route to. So a proxy on a laptop CANNOT
# reach a private-only instance. There are three honest ways out:
#
#   1. Add a public IP with NO authorized networks (what this script offers).
#      Direct connections are still refused — the only way in is the Auth Proxy,
#      which authenticates with your Google IAM identity and tunnels over TLS.
#      This is Google's own documented pattern for local development.
#
#   2. Keep it private-only and tunnel through a small Compute Engine VM in the
#      VPC using IAP. More secure, but it is another billable resource to run
#      and maintain.
#
#   3. Keep it private-only and use Cloud SQL Studio in the browser console for
#      ad-hoc queries. No local app development against the real database.
#
# Option 1 is the default recommendation for a team of this size. Cloud Run
# still reaches the database over the PRIVATE address via the VPC connector
# (W1-10), so production traffic never touches the public interface.
set -euo pipefail
. "$(dirname "$0")/config.sh"; require

command -v cloud-sql-proxy >/dev/null 2>&1 || {
  echo "cloud-sql-proxy is not installed. Install it with:"
  echo "  brew install cloud-sql-proxy"
  exit 1
}

CONN="$(gcloud sql instances describe "$SQL_INSTANCE" --format='value(connectionName)')"
HAS_PUBLIC="$(gcloud sql instances describe "$SQL_INSTANCE" \
  --format='value(settings.ipConfiguration.ipv4Enabled)')"
AUTH_NETS="$(gcloud sql instances describe "$SQL_INSTANCE" \
  --format='value(settings.ipConfiguration.authorizedNetworks[].value)' 2>/dev/null || true)"

echo "instance          $SQL_INSTANCE"
echo "connection name   $CONN"
echo "public IP enabled $HAS_PUBLIC"
echo "authorized nets   ${AUTH_NETS:-(none — good: proxy-only access)}"
echo

if [ "$HAS_PUBLIC" != "True" ]; then
  cat <<NEED

This instance is private-only, so the proxy on this machine cannot reach it.

To take option 1 — add a public interface that only the Auth Proxy can use:

  gcloud sql instances patch $SQL_INSTANCE --assign-ip --project $PROJECT_ID

Add NO authorized networks afterwards. Without them, every direct connection
attempt is refused and the Auth Proxy remains the only route in.

Then re-run this script.
NEED
  exit 3
fi

if [ -n "$AUTH_NETS" ]; then
  echo "WARNING: authorized networks are configured ($AUTH_NETS)."
  echo "That allows direct connections, bypassing the proxy. Remove them with:"
  echo "  gcloud sql instances patch $SQL_INSTANCE --clear-authorized-networks"
  echo
fi

PORT="${PROXY_PORT:-5433}"
echo "Starting the proxy on 127.0.0.1:$PORT. Leave this terminal open."
echo "Apply the schema from a second terminal:"
echo
echo "  PW=\$(gcloud secrets versions access latest --secret=wf-db-password)"
echo "  WF_DB=\"postgresql://$DB_APP_USER:\$PW@127.0.0.1:$PORT/$DB_NAME\" ./db/migrate-remote.sh"
echo
exec cloud-sql-proxy --address 127.0.0.1 --port "$PORT" "$CONN"
