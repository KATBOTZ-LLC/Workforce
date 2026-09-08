#!/usr/bin/env bash
# W1-07  Provision Cloud SQL for PostgreSQL.
#
# COSTS MONEY — billed hourly from creation. Stop it between demos:
#   gcloud sql instances patch wf-postgres --activation-policy=NEVER
#
# ---------------------------------------------------------------------------
# DEVIATION FROM THE PLAN, and why.
#
# The plan says "private IP". Private IP requires peering the VPC with Google's
# service network, which needs servicenetworking.services.addPeering. That
# permission is NOT in roles/editor, and roles/editor is what this account has
# on katbotz-hr-and-vendor-portal. The attempt failed with AUTH_PERMISSION_DENIED.
#
# So the instance gets a PUBLIC IP with NO AUTHORIZED NETWORKS instead. That is
# not "open to the internet": with no authorized networks every direct
# connection is refused. The only way in is the Cloud SQL Auth Proxy, which
# authenticates with a Google IAM identity and tunnels over TLS —
#   * Cloud Run uses the proxy built into the platform (--add-cloudsql-instances),
#     reaching the database over a Unix socket. No VPC, no connector, no egress
#     configuration, nothing extra to pay for.
#   * Local development uses cloud-sql-proxy (W1-08), unchanged.
#
# Private IP is still better defence-in-depth — there would be no public
# address to refuse connections on at all. To get it, ask an Owner to grant:
#
#   gcloud projects add-iam-policy-binding katbotz-hr-and-vendor-portal \
#     --member=user:aayushi111@katbotz.com \
#     --role=roles/servicenetworking.networksAdmin
#
# Then run deploy/w1-07-cloudsql-private-ip.sh, which is kept for that purpose.
# ---------------------------------------------------------------------------
set -euo pipefail
. "$(dirname "$0")/config.sh"; require
gcloud config set project "$PROJECT_ID" >/dev/null

confirm "About to create a BILLABLE Cloud SQL instance in $PROJECT_ID:
  instance  $SQL_INSTANCE   (PostgreSQL 17 ENTERPRISE, $SQL_TIER, 10GB SSD)
  region    $REGION
  access    public interface with NO authorized networks — proxy-only
  ~\$10-15/month, charged hourly from creation."

# --edition=ENTERPRISE is required, not optional: this organisation defaults new
# instances to Enterprise Plus, whose smallest tier is db-perf-optimized-N-2 —
# several times the cost. Enterprise is the edition that allows db-f1-micro.
echo "1/3  Creating the instance (5-10 minutes)..."
if gcloud sql instances describe "$SQL_INSTANCE" >/dev/null 2>&1; then
  echo "     $SQL_INSTANCE already exists — reusing it"
else
  gcloud sql instances create "$SQL_INSTANCE" \
    --database-version=POSTGRES_17 \
    --edition=ENTERPRISE \
    --tier="$SQL_TIER" \
    --region="$REGION" \
    --storage-size=10GB --storage-type=SSD --storage-auto-increase \
    --assign-ip \
    --backup --backup-start-time=19:00 \
    --maintenance-window-day=SUN --maintenance-window-hour=20 \
    --database-flags=cloudsql.iam_authentication=on
fi

# No authorized networks: this is what makes the public interface proxy-only.
gcloud sql instances patch "$SQL_INSTANCE" --clear-authorized-networks --quiet >/dev/null 2>&1 || true

echo "2/3  Database..."
gcloud sql databases describe "$DB_NAME" --instance "$SQL_INSTANCE" >/dev/null 2>&1 || \
  gcloud sql databases create "$DB_NAME" --instance "$SQL_INSTANCE"

echo "3/3  Application user..."
# The password is generated here and goes straight into Secret Manager in W1-09.
# It is never echoed and never written to a file.
if gcloud secrets describe wf-db-password >/dev/null 2>&1; then
  echo "     wf-db-password already exists — leaving the existing user alone"
else
  PW="$(python3 -c 'import secrets;print(secrets.token_urlsafe(32),end="")')"
  printf '%s' "$PW" | gcloud secrets create wf-db-password --data-file=- --replication-policy=automatic
  if gcloud sql users list --instance "$SQL_INSTANCE" --format='value(name)' | grep -qx "$DB_APP_USER"; then
    gcloud sql users set-password "$DB_APP_USER" --instance "$SQL_INSTANCE" --password "$PW"
  else
    gcloud sql users create "$DB_APP_USER" --instance "$SQL_INSTANCE" --password "$PW"
  fi
  unset PW
  echo "     created $DB_APP_USER; password stored as secret wf-db-password"
fi

CONN="$(gcloud sql instances describe "$SQL_INSTANCE" --format='value(connectionName)')"
cat <<DONE

W1-07 done.
  instance         $SQL_INSTANCE
  connection name  $CONN
  authorized nets  none — the Auth Proxy is the only route in

Next: W1-09 for the secrets, then W1-08 to apply the schema over the proxy.
DONE
