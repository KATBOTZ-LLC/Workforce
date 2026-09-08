#!/usr/bin/env bash
# W1-07  Provision Cloud SQL for PostgreSQL with a PRIVATE IP.
#
# THIS COSTS MONEY — billed hourly from creation, whether or not anything
# connects. Stop it between demos:
#   gcloud sql instances patch wf-postgres --activation-policy=NEVER
#
# Private IP means no public address exists at all. Nothing on the internet can
# reach the database, including you — local access goes through the Auth Proxy
# (W1-08) and Cloud Run goes through the VPC connector (W1-10).
set -euo pipefail
. "$(dirname "$0")/config.sh"; require

confirm "About to create BILLABLE resources in $PROJECT_ID:
  a /16 peering range   $PEERING_RANGE        (free)
  VPC peering to Google's service network     (free)
  Cloud SQL instance    $SQL_INSTANCE         (PostgreSQL 17, $SQL_TIER, 10GB SSD, PRIVATE IP)
                                              ~\$10-15/month, charged hourly."

NETWORK_URI="projects/$PROJECT_ID/global/networks/$NETWORK"

echo "1/4  Allocating a private IP range for Google-managed services..."
if gcloud compute addresses describe "$PEERING_RANGE" --global >/dev/null 2>&1; then
  echo "     $PEERING_RANGE already allocated"
else
  gcloud compute addresses create "$PEERING_RANGE" \
    --global --purpose=VPC_PEERING --prefix-length=16 --network="$NETWORK"
fi

echo "2/4  Peering the VPC with Google's service network..."
if gcloud services vpc-peerings list --network="$NETWORK" \
     --format='value(peering)' 2>/dev/null | grep -q servicenetworking; then
  echo "     peering already present"
else
  gcloud services vpc-peerings connect \
    --service=servicenetworking.googleapis.com \
    --ranges="$PEERING_RANGE" --network="$NETWORK" --project="$PROJECT_ID"
fi

echo "3/4  Creating the Cloud SQL instance (this takes 5-10 minutes)..."
if gcloud sql instances describe "$SQL_INSTANCE" >/dev/null 2>&1; then
  echo "     $SQL_INSTANCE already exists — reusing it"
else
  gcloud sql instances create "$SQL_INSTANCE" \
    --database-version=POSTGRES_17 \
    --tier="$SQL_TIER" \
    --region="$REGION" \
    --storage-size=10GB --storage-type=SSD --storage-auto-increase \
    --network="$NETWORK_URI" \
    --no-assign-ip \
    --backup --backup-start-time=19:00 \
    --maintenance-window-day=SUN --maintenance-window-hour=20 \
    --database-flags=cloudsql.iam_authentication=on
fi

echo "4/4  Database and application user..."
gcloud sql databases describe "$DB_NAME" --instance "$SQL_INSTANCE" >/dev/null 2>&1 || \
  gcloud sql databases create "$DB_NAME" --instance "$SQL_INSTANCE"

# The password is generated here and goes straight into Secret Manager in W1-09.
# It is never echoed, and never written to a file.
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
  echo "     created $DB_APP_USER; password is in Secret Manager as wf-db-password"
fi

PRIVATE_IP="$(gcloud sql instances describe "$SQL_INSTANCE" --format='value(ipAddresses[0].ipAddress)')"
CONN="$(gcloud sql instances describe "$SQL_INSTANCE" --format='value(connectionName)')"
cat <<DONE

W1-07 done.
  instance        $SQL_INSTANCE
  private IP      $PRIVATE_IP     (unreachable from the internet, by design)
  connection name $CONN

Next: W1-08 to reach it locally, then W1-09 for the secrets.
DONE
