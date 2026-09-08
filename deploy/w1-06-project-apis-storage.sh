#!/usr/bin/env bash
# W1-06  Enable Cloud SQL + Cloud Storage + Secret Manager, create the bucket.
#
# Enabling an API is free. The bucket costs only what is stored in it.
set -euo pipefail
. "$(dirname "$0")/config.sh"; require

APIS="
sqladmin.googleapis.com
storage.googleapis.com
secretmanager.googleapis.com
run.googleapis.com
cloudbuild.googleapis.com
artifactregistry.googleapis.com
vpcaccess.googleapis.com
servicenetworking.googleapis.com
compute.googleapis.com
iam.googleapis.com
"
echo "Enabling APIs (this can take a couple of minutes):"
for api in $APIS; do
  printf '  %-40s' "$api"
  if gcloud services list --enabled --format='value(config.name)' | grep -qx "$api"; then
    echo "already on"
  else
    gcloud services enable "$api" --quiet && echo "enabled"
  fi
done

echo
echo "Artifact Registry (container images):"
if gcloud artifacts repositories describe "$REPO" --location "$REGION" >/dev/null 2>&1; then
  echo "  $REPO already exists"
else
  gcloud artifacts repositories create "$REPO" \
    --repository-format=docker --location "$REGION" \
    --description="Workforce platform container images"
  echo "  created $REPO"
fi

echo
echo "Cloud Storage bucket for uploaded documents:"
if gcloud storage buckets describe "gs://$BUCKET" >/dev/null 2>&1; then
  echo "  gs://$BUCKET already exists"
else
  # public-access-prevention: documents are passports and tax forms. They must
  # never be servable from a public URL, which the FSD requires explicitly.
  # uniform-bucket-level-access: no per-object ACLs to get wrong.
  gcloud storage buckets create "gs://$BUCKET" \
    --location="$REGION" \
    --uniform-bucket-level-access \
    --public-access-prevention \
    --default-storage-class=STANDARD
  gcloud storage buckets update "gs://$BUCKET" --versioning
  echo "  created gs://$BUCKET (private, versioned)"
fi

cat <<DONE

W1-06 done.
  bucket   gs://$BUCKET
  This bucket is what DOCUMENT_FILE.file_storage_key points at. That column is
  opaque by design, so the storage choice never leaks into the schema.
DONE
