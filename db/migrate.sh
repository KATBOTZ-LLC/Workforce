#!/usr/bin/env bash
# Rebuild the Workforce database from scratch and prove the rules bite.
#   ./db/migrate.sh          rebuild + verify
#   ./db/migrate.sh --test   rebuild + verify + run the rule tests
#   ./db/migrate.sh --demo   rebuild + verify + four demo engagements
#
# A rebuild DROPS the database, so anything created through the app is gone.
# Only db/migrations/ is seed data. Use --demo before a demo so the roster is
# not empty.
set -euo pipefail
export PATH="/opt/homebrew/opt/postgresql@17/bin:$PATH"
DB="${WF_DB:-wf_dev}"
HERE="$(cd "$(dirname "$0")" && pwd)"

# This script drops the database, so an open connection from a running API is
# just something in the way. Closed here rather than making you hunt for it.
# Only ever run against a local development database — never a shared one.
psql -d postgres -tAc "
  SELECT pg_terminate_backend(pid) FROM pg_stat_activity
   WHERE datname = '$DB' AND pid <> pg_backend_pid();" >/dev/null 2>&1 || true

dropdb --if-exists "$DB"; createdb "$DB"
for f in "$HERE"/migrations/*.sql; do
  case "$(basename "$f")" in *TO_CONFIRM*) continue;; esac
  printf '  %-34s' "$(basename "$f")"
  psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$f" && echo "ok"
done

echo
psql -d "$DB" -t -c "
  SELECT format('  %s tables / %s columns / %s foreign keys / %s checks / %s indexes',
    (SELECT count(*) FROM pg_tables WHERE schemaname='public'),
    (SELECT count(*) FROM information_schema.columns WHERE table_schema='public'),
    (SELECT count(*) FROM pg_constraint WHERE contype='f'),
    (SELECT count(*) FROM pg_constraint WHERE contype='c' AND connamespace='public'::regnamespace),
    (SELECT count(*) FROM pg_indexes WHERE schemaname='public'));"
echo "  blueprint: 37 tables / 267 columns / 54 FKs, plus role.level (see 95_additions)"
case "${1:-}" in
  --test)
    bash "$HERE/rule_tests.sh"
    ;;
  --demo)
    echo
    echo "Demo engagements (invented people — everything else is real):"
    psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$HERE/demo/98_demo_engagements.sql" \
      | grep -E '^ +EMP-' | sed 's/^ */  /'
    ;;
esac
