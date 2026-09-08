#!/usr/bin/env bash
# Apply db/migrations to a remote PostgreSQL (Cloud SQL, via the Auth Proxy).
#
# Unlike db/migrate.sh this does NOT drop the database first — it would be a
# very bad idea against anything shared. It applies the files in order and stops
# at the first error, so re-running it after a partial failure is safe to retry
# but will report "already exists" on the files that landed.
#
#   WF_DB="postgresql://wf_app:PASSWORD@127.0.0.1:5433/workforce" ./db/migrate-remote.sh
set -euo pipefail
export PATH="/opt/homebrew/opt/postgresql@17/bin:$PATH"
HERE="$(cd "$(dirname "$0")" && pwd)"

: "${WF_DB:?Set WF_DB to the connection string, e.g. postgresql://wf_app:PW@127.0.0.1:5433/workforce}"

echo "Target: $(echo "$WF_DB" | sed -E 's#://[^:]+:[^@]+@#://***:***@#')"
printf 'Type yes to apply the schema: '; read -r reply
[ "$reply" = "yes" ] || { echo "Cancelled."; exit 1; }

for f in "$HERE"/migrations/*.sql; do
  case "$(basename "$f")" in *TO_CONFIRM*) echo "  skipping $(basename "$f") (needs sign-off)"; continue;; esac
  printf '  %-38s' "$(basename "$f")"
  psql -q -v ON_ERROR_STOP=1 "$WF_DB" -f "$f" && echo "ok"
done

psql "$WF_DB" -t -c "
  SELECT format('  %s tables / %s columns / %s foreign keys',
    (SELECT count(*) FROM pg_tables WHERE schemaname='public'),
    (SELECT count(*) FROM information_schema.columns WHERE table_schema='public'),
    (SELECT count(*) FROM pg_constraint WHERE contype='f'));"
echo "  blueprint: 37 tables / 267 columns / 54 FKs, plus role.level (see 95_additions)"
