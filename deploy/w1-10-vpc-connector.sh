#!/usr/bin/env bash
# W1-10  Serverless VPC Access connector, so Cloud Run can reach the private IP.
#
# BILLABLE: a connector runs at least two e2-micro instances continuously,
# roughly \$8-10/month, whether or not traffic flows. It is the price of the
# database having no public interface.
#
# Cloud Run's newer Direct VPC egress avoids the connector and its cost, but a
# connector is what the plan specifies and is the better-supported path today.
set -euo pipefail
. "$(dirname "$0")/config.sh"; require

if gcloud compute networks vpc-access connectors describe "$CONNECTOR" --region "$REGION" >/dev/null 2>&1; then
  STATE="$(gcloud compute networks vpc-access connectors describe "$CONNECTOR" --region "$REGION" --format='value(state)')"
  echo "Connector $CONNECTOR already exists (state: $STATE)."
  exit 0
fi

confirm "About to create a BILLABLE VPC connector:
  name    $CONNECTOR
  region  $REGION
  network $NETWORK
  range   $CONNECTOR_RANGE   (must not overlap anything already in the VPC)
Roughly \$8-10/month, charged continuously."

echo "Creating (takes 3-5 minutes)..."
gcloud compute networks vpc-access connectors create "$CONNECTOR" \
  --region "$REGION" \
  --network "$NETWORK" \
  --range "$CONNECTOR_RANGE" \
  --min-instances 2 --max-instances 3 --machine-type e2-micro

gcloud compute networks vpc-access connectors describe "$CONNECTOR" --region "$REGION" \
  --format='value(name,state,ipCidrRange)'
echo "W1-10 done."
