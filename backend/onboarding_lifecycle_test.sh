#!/usr/bin/env bash
# End-to-end test of the onboarding lifecycle against a running API.
#
#   cd backend && ./onboarding_lifecycle_test.sh
#
# Creates one throwaway engagement, walks it from Invited to Active, and checks
# every rule on the way. Rebuild the database afterwards to clear the test rows:
#   ./db/migrate.sh
set -uo pipefail
cd "$(dirname "$0")"
API="${API:-http://127.0.0.1:8000}"
export PATH="/opt/homebrew/opt/postgresql@17/bin:$PATH"
pass=0; fail=0
ok ()   { printf "  ✅ %s\n" "$1"; pass=$((pass+1)); }
bad ()  { printf "  ❌ %s\n" "$1"; fail=$((fail+1)); }
check () { if [ "$2" = "$3" ]; then ok "$1"; else bad "$1 (expected $3, got $2)"; fi; }

curl -s -m 3 "$API/api/health" >/dev/null || { echo "API is not running at $API"; exit 1; }
T="$(./venv/bin/python -c "
import jwt,datetime
from app.config import settings
print(jwt.encode({'sub':'akshat@katbotz.com','exp':datetime.datetime.now(datetime.UTC)+datetime.timedelta(hours=1)}, settings.session_secret, algorithm='HS256'))")"
printf '%%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%%%EOF\n' > /tmp/lc_doc.pdf
printf 'not a document\n' > /tmp/lc_bad.txt

J () { python3 -c "import json,sys;d=json.load(sys.stdin);print(d$1)" 2>/dev/null; }
OPT="$(curl -s -H "Authorization: Bearer $T" "$API/api/employees/options")"
LOC="$(echo "$OPT" | python3 -c "import json,sys;print([x['id'] for x in json.load(sys.stdin)['work_locations'] if x['name']=='India office'][0])")"
DEP="$(echo "$OPT" | python3 -c "import json,sys;print([x['id'] for x in json.load(sys.stdin)['departments'] if x['name']=='Innovation'][0])")"
STAMP="$(date +%s)"

echo "Onboarding lifecycle"
CREATED="$(curl -s -X POST -H "Authorization: Bearer $T" -H 'Content-Type: application/json' \
  -d "{\"first_name\":\"Lifecycle\",\"last_name\":\"Test$STAMP\",\"professional_email\":\"lifecycle.$STAMP@katbotz.com\",\"worker_type\":\"Employee\",\"designation\":\"Test\",\"department_id\":\"$DEP\",\"work_location_id\":\"$LOC\",\"joined_on\":\"2026-09-20\"}" \
  "$API/api/employees")"
EID="$(echo "$CREATED" | J "['employment_id']")"
TOK="$(echo "$CREATED" | J "['onboarding_token']")"
[ -n "$EID" ] || { echo "  could not create an engagement: $CREATED"; exit 1; }
check "engagement created with the India Employee checklist" "$(echo "$CREATED" | J "['documents_required']")" "6"

ITEMS="$(curl -s "$API/api/onboard/$TOK" | python3 -c "import json,sys;print(' '.join(i['document_id'] for i in json.load(sys.stdin)['items']))")"
D1="$(echo "$ITEMS" | cut -d' ' -f1)"
check "worker can open their link without signing in" "$(curl -s -o /dev/null -w '%{http_code}' "$API/api/onboard/$TOK")" "200"
check "an invalid link is indistinguishable from an expired one" "$(curl -s -o /dev/null -w '%{http_code}' "$API/api/onboard/nope")" "404"

F1="$(curl -s -X POST -F "file=@/tmp/lc_doc.pdf;type=application/pdf" "$API/api/onboard/$TOK/upload/$D1" | J "['file_id']")"
check "worker upload is accepted and left Pending, not Approved" \
  "$(curl -s -H "Authorization: Bearer $T" "$API/api/documents/checklist/$EID" | python3 -c "import json,sys;print([i['status'] for i in json.load(sys.stdin)['items'] if i['document_id']=='$D1'][0])")" "Pending"
check "a disallowed file type is refused" \
  "$(curl -s -o /dev/null -w '%{http_code}' -X POST -F "file=@/tmp/lc_bad.txt;type=text/plain" "$API/api/onboard/$TOK/upload/$D1")" "422"
check "a token cannot upload against another engagement's checklist" \
  "$(curl -s -o /dev/null -w '%{http_code}' -X POST -F "file=@/tmp/lc_doc.pdf;type=application/pdf" "$API/api/onboard/$TOK/upload/00000000-0000-0000-0000-0000000000ff")" "404"

rev () { curl -s -o /dev/null -w '%{http_code}' -X POST -H "Authorization: Bearer $T" -H 'Content-Type: application/json' -d "$2" "$API/api/documents/files/$1/review"; }
check "a rejection with no reason is refused" "$(rev "$F1" '{"decision":"Rejected"}')" "422"
check "a rejection with a reason is accepted" "$(rev "$F1" '{"decision":"Rejected","rejection_reason":"Unclear / blurry"}')" "200"
check "the same version cannot be reviewed twice" "$(rev "$F1" '{"decision":"Approved"}')" "409"

F2="$(curl -s -X POST -F "file=@/tmp/lc_doc.pdf;type=application/pdf" "$API/api/onboard/$TOK/upload/$D1" | J "['file_id']")"
check "re-upload is accepted" "$(rev "$F2" '{"decision":"Approved"}')" "200"
check "both versions and both decisions are retained" \
  "$(psql -d "${WF_DB_NAME:-wf_dev}" -tAc "SELECT count(*) FROM document_file WHERE document_id='$D1' AND review_status IS NOT NULL")" "2"

check "activation is refused while mandatory documents are outstanding" \
  "$(curl -s -o /dev/null -w '%{http_code}' -X POST -H "Authorization: Bearer $T" "$API/api/employees/$EID/activate")" "409"

for D in $(echo "$ITEMS" | cut -d' ' -f2-); do
  FID="$(curl -s -X POST -F "file=@/tmp/lc_doc.pdf;type=application/pdf" "$API/api/onboard/$TOK/upload/$D" | J "['file_id']")"
  rev "$FID" '{"decision":"Approved"}' >/dev/null
done
check "the engagement reaches Verified on its own" \
  "$(psql -d "${WF_DB_NAME:-wf_dev}" -tAc "SELECT stage FROM employment WHERE employment_id='$EID'")" "Verified"
check "activation now succeeds" \
  "$(curl -s -o /dev/null -w '%{http_code}' -X POST -H "Authorization: Bearer $T" "$API/api/employees/$EID/activate")" "200"
check "the onboarding link is spent after activation" "$(curl -s -o /dev/null -w '%{http_code}' "$API/api/onboard/$TOK")" "404"
check "a download is recorded in the access log" \
  "$(curl -s -o /dev/null -H "Authorization: Bearer $T" "$API/api/documents/files/$F2/download"; psql -d "${WF_DB_NAME:-wf_dev}" -tAc "SELECT count(*) FROM document_access_log WHERE file_id='$F2'")" "1"

for t in audit_log document_access_log; do
  for op in "UPDATE $t SET occurred_at = now()" "DELETE FROM $t"; do
    if PGPASSWORD=wf_app_local_dev psql -q -v ON_ERROR_STOP=1 -h 127.0.0.1 -U wf_app -d "${WF_DB_NAME:-wf_dev}" -c "$op" >/dev/null 2>&1
    then bad "$(echo "$op" | cut -d' ' -f1) on $t was ALLOWED"
    else ok "$(echo "$op" | cut -d' ' -f1) on $t is refused for the application role"; fi
  done
done

echo
echo "  passed: $pass    FAILED: $fail"
echo "  Test rows remain in the database. Clear them with:  ./db/migrate.sh"
[ "$fail" -eq 0 ]
