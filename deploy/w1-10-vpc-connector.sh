#!/usr/bin/env bash
# W1-10  Cloud Run -> Cloud SQL private IP.
#
# NOT NEEDED under the approved architecture, and this script creates nothing.
#
# The plan called for a Serverless VPC Access connector. Cloud Run now supports
# DIRECT VPC EGRESS, which reaches the same private IP with no connector to run:
#
#   --network=default --subnet=default --vpc-egress=private-ranges-only
#
# Those flags are set in cloudbuild.yaml, so W1-10 is satisfied there rather
# than by a resource. A connector would have cost roughly $9/month for two
# always-on e2-micro instances and achieved nothing extra at this scale.
#
# If you ever need the connector back (some VPC Service Controls setups still
# require it), this file is in git history — see deploy/w1-10-vpc-connector.sh
# before 2026-09-08.
set -euo pipefail
. "$(dirname "$0")/config.sh"

cat <<'NOTE'
W1-10: nothing to create.

Cloud Run reaches the Cloud SQL private IP using Direct VPC egress, configured
in cloudbuild.yaml:
    --network=default --subnet=default --vpc-egress=private-ranges-only

This is a deliberate, approved deviation from "VPC connector" in the plan. It
saves about $9/month and removes two always-on instances from the estimate.
Record W1-10 as done-by-configuration rather than done-by-resource.
NOTE
