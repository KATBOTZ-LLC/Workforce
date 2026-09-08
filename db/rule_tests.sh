# The tests insert deliberately fake rows, so they get their OWN database and
# drop it afterwards. Running them against wf_dev used to leave a "Priya Sharma"
# behind and made the directory count wrong.
DB="wf_ruletest"
HERE="$(cd "$(dirname "$0")" && pwd)"
export PATH="/opt/homebrew/opt/postgresql@17/bin:$PATH"

psql -d postgres -tAc "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='$DB' AND pid <> pg_backend_pid();" >/dev/null 2>&1 || true
dropdb --if-exists "$DB"; createdb "$DB"
for f in "$HERE"/migrations/*.sql; do
  case "$(basename "$f")" in *TO_CONFIRM*|96_seed_org.sql) continue;; esac
  psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$f" >/dev/null
done
trap 'psql -d postgres -tAc "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='"'"'$DB'"'"' AND pid <> pg_backend_pid();" >/dev/null 2>&1; dropdb --if-exists "$DB" >/dev/null 2>&1' EXIT
pass=0; fail=0
# expect_fail "label" "sql"
expect_fail () {
  err=$(psql -q -v ON_ERROR_STOP=1 -d $DB -c "$2" 2>&1)
  if [ $? -ne 0 ]; then
    reason=$(echo "$err" | grep -o -E 'violates [a-z ]+constraint "[^"]+"|new row for relation[^"]*' | head -1)
    printf "  ✅ REJECTED  %-52s %s\n" "$1" "$reason"; pass=$((pass+1))
  else
    printf "  ❌ ACCEPTED  %-52s <-- RULE NOT ENFORCED\n" "$1"; fail=$((fail+1))
  fi
}
expect_ok () {
  err=$(psql -q -v ON_ERROR_STOP=1 -d $DB -c "$2" 2>&1)
  if [ $? -eq 0 ]; then printf "  ✅ ACCEPTED  %s\n" "$1"; pass=$((pass+1));
  else printf "  ❌ REJECTED  %-52s %s\n" "$1" "$(echo "$err"|head -2)"; fail=$((fail+1)); fi
}

echo "--- setting up two real-shaped rows ---"
psql -q -d $DB <<'SQL'
INSERT INTO department (department_id,name,is_root,is_active) VALUES
 ('00000000-0000-0000-0000-0000000000a1','HR',false,true) ON CONFLICT DO NOTHING;
INSERT INTO role (role_id,title,department_id,base_tier,is_active) VALUES
 ('00000000-0000-0000-0000-0000000000b1','HR Admin','00000000-0000-0000-0000-0000000000a1','hr_admin',true) ON CONFLICT DO NOTHING;
INSERT INTO person (person_id,first_name,last_name) VALUES
 ('00000000-0000-0000-0000-0000000000c1','Priya','Sharma') ON CONFLICT DO NOTHING;
INSERT INTO employment (employment_id,employment_code,person_id,worker_type,designation,joined_on,stage) VALUES
 ('00000000-0000-0000-0000-0000000000d1','EMP-001','00000000-0000-0000-0000-0000000000c1','Employee','HR Lead','2026-01-06','Active') ON CONFLICT DO NOTHING;
INSERT INTO person_email (person_id,email_type,email) VALUES
 ('00000000-0000-0000-0000-0000000000c1','professional','priya@katbotz.com') ON CONFLICT DO NOTHING;
INSERT INTO person_role (person_id,role_id,is_primary,valid_from) VALUES
 ('00000000-0000-0000-0000-0000000000c1','00000000-0000-0000-0000-0000000000b1',true,'2026-01-06') ON CONFLICT DO NOTHING;
INSERT INTO work_location (work_location_id,name,country,region,timezone) VALUES
 ('00000000-0000-0000-0000-00000000009a','Pune','India','India','Asia/Kolkata') ON CONFLICT DO NOTHING;
INSERT INTO employment_assignment (employment_id,department_id,work_location_id,valid_from) VALUES
 ('00000000-0000-0000-0000-0000000000d1','00000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-00000000009a','2026-01-06') ON CONFLICT DO NOTHING;
SQL

echo ""
echo "=== RULES THE DATABASE ENFORCES ==="
expect_fail "same email, different case, org-wide" \
 "INSERT INTO person_email (person_id,email_type,email) VALUES ('00000000-0000-0000-0000-0000000000c1','personal','PRIYA@KATBOTZ.COM');"
expect_fail "a second CURRENT primary seat for one person" \
 "INSERT INTO person_role (person_id,role_id,is_primary,valid_from) VALUES ('00000000-0000-0000-0000-0000000000c1','00000000-0000-0000-0000-0000000000b1',true,'2026-06-01');"
expect_fail "invalid access tier" \
 "INSERT INTO role (title,department_id,base_tier,is_active) VALUES ('Hacker','00000000-0000-0000-0000-0000000000a1','superuser',true);"
expect_fail "contractor_mode set on an Employee" \
 "INSERT INTO employment (employment_code,person_id,worker_type,contractor_mode,designation,joined_on,stage) VALUES ('EMP-999','00000000-0000-0000-0000-0000000000c1','Employee','c2c','X','2026-01-01','Active');"
expect_fail "exit date before join date" \
 "INSERT INTO employment (employment_code,person_id,worker_type,designation,joined_on,exited_on,stage) VALUES ('EMP-998','00000000-0000-0000-0000-0000000000c1','Employee','X','2026-06-01','2026-01-01','Inactive');"
expect_fail "unpaid leave with no written reason" \
 "INSERT INTO leave_request (employment_id,leave_type,start_date,end_date,status) VALUES ('00000000-0000-0000-0000-0000000000d1','unpaid','2026-03-01','2026-03-02','Pending');"
expect_fail "paid leave with no category" \
 "INSERT INTO leave_request (employment_id,leave_type,start_date,end_date,status) VALUES ('00000000-0000-0000-0000-0000000000d1','paid','2026-03-01','2026-03-02','Pending');"
expect_fail "attendance marked 'leave' with no approved request" \
 "INSERT INTO attendance_record (employment_id,record_date,status,source) VALUES ('00000000-0000-0000-0000-0000000000d1','2026-03-01','leave','hr');"
expect_fail "a second attendance record for the same day" \
 "INSERT INTO attendance_record (employment_id,record_date,status,source) VALUES ('00000000-0000-0000-0000-0000000000d1','2026-02-02','present','self'),('00000000-0000-0000-0000-0000000000d1','2026-02-02','absent','hr');"
expect_fail "expiry alert pointing at nothing" \
 "INSERT INTO expiry_alert (threshold_days,alerted_at,message_status) VALUES (30,now(),'sent');"
expect_fail "expiry alert pointing at TWO things at once" \
 "INSERT INTO expiry_alert (visa_id,document_id,threshold_days,alerted_at,message_status) VALUES ('00000000-0000-0000-0000-0000000000e1','00000000-0000-0000-0000-0000000000e2',30,now(),'sent');"
expect_fail "deleting a department that still has placements in it" \
 "DELETE FROM department WHERE department_id='00000000-0000-0000-0000-0000000000a1';"
expect_fail "deleting a person who has employment history" \
 "DELETE FROM person WHERE person_id='00000000-0000-0000-0000-0000000000c1';"
expect_fail "a review stage submitted but left unlocked" \
 "INSERT INTO performance_review_stage (review_id,stage_name,submitted_at,is_locked) VALUES ('00000000-0000-0000-0000-0000000000f1','Self',now(),false);"
expect_fail "a second CURRENT placement for one engagement" \
 "INSERT INTO employment_assignment (employment_id,department_id,work_location_id,valid_from) VALUES ('00000000-0000-0000-0000-0000000000d1','00000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-00000000009a','2026-07-01');"
expect_fail "a current visa that claims to be superseded" \
 "INSERT INTO visa_record (person_id,visa_type,issuing_country,valid_from,valid_to,status) VALUES ('00000000-0000-0000-0000-0000000000c1','H-1B','US','2026-01-01','2029-01-01','superseded');"
expect_fail "an unverified Google account" \
 "INSERT INTO user_account (person_id,email,google_subject,domain,email_verified,status) VALUES ('00000000-0000-0000-0000-0000000000c1','priya@katbotz.com','g-123','katbotz.com',false,'active');"
expect_fail "two accounts for one person" \
 "INSERT INTO user_account (person_id,email,google_subject,domain,email_verified,status) VALUES ('00000000-0000-0000-0000-0000000000c1','a@katbotz.com','g-1','katbotz.com',true,'active'),('00000000-0000-0000-0000-0000000000c1','b@katbotz.com','g-2','katbotz.com',true,'active');"
echo ""
echo "--- APPEND-ONLY: the audit log, tested as the application role ---"
psql -q -d $DB -c "INSERT INTO audit_log (event_category,entity_type,entity_id) VALUES ('sign_in','person','00000000-0000-0000-0000-0000000000c1');" >/dev/null 2>&1
for op in "UPDATE audit_log SET event_category='tampered'" "DELETE FROM audit_log"; do
  err=$(PGPASSWORD=wf_app_local_dev psql -q -v ON_ERROR_STOP=1 -h 127.0.0.1 -U wf_app -d $DB -c "$op" 2>&1)
  if [ $? -ne 0 ]; then printf "  ✅ REFUSED   %-52s %s\n" "$(echo $op|cut -d' ' -f1) on audit_log as wf_app" "$(echo "$err"|grep -o 'permission denied.*'|head -1)"; pass=$((pass+1));
  else printf "  ❌ ALLOWED   %s <-- APPEND-ONLY CLAIM IS FALSE\n" "$op"; fail=$((fail+1)); fi
done
echo ""
echo "  passed: $pass    FAILED: $fail"
