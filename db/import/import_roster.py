#!/usr/bin/env python3
"""Import the real KATBOTZ roster from a filled-in CSV.

    python3 db/import/import_roster.py db/import/roster_template.csv           # check only
    python3 db/import/import_roster.py db/import/roster_template.csv --apply   # write

Dry-run by default: it validates every row and prints every problem without
touching the database, so a half-filled sheet cannot half-load.

What it creates per person, in ONE transaction for the whole file:
  EMPLOYMENT, EMPLOYMENT_ASSIGNMENT, the frozen WORKER_DOCUMENT checklist,
  and an ONBOARDING_TOKEN. Same tables and same rules as the API — this is an
  import path, not a second implementation of the business logic.

It will not invent anything. A missing worker_type, work_location or joined_on
is an error, never a default, because those three decide the document checklist
a real person will be asked to satisfy.
"""

import csv
import hashlib
import os
import re
import secrets
import sys
from datetime import date

import psycopg

DSN = os.environ.get("WF_DB") or "postgresql://localhost:5432/wf_dev"

WORKER_TYPES = {"Employee", "Contractor", "Intern"}
MODES = {"independent", "c2c"}


def fail(row_no: int, msg: str, errors: list) -> None:
    errors.append(f"  row {row_no}: {msg}")


def main() -> int:
    if len(sys.argv) < 2:
        print(__doc__)
        return 2
    path = sys.argv[1]
    apply_changes = "--apply" in sys.argv

    with open(path, newline="") as fh:
        # Comment lines at the top are documentation for whoever fills the sheet.
        lines = [l for l in fh if not l.lstrip().startswith("#")]
    rows = list(csv.DictReader(lines))
    if not rows:
        print("No data rows found.")
        return 1

    conn = psycopg.connect(DSN)
    conn.autocommit = False
    cur = conn.cursor()

    cur.execute("SELECT lower(name), work_location_id, region FROM work_location")
    locations = {n: (i, r) for n, i, r in cur.fetchall()}
    cur.execute("SELECT lower(name), department_id FROM department WHERE is_active")
    departments = dict(cur.fetchall())
    cur.execute(
        "SELECT lower(coalesce(preferred_name, concat_ws(' ', first_name, last_name))), person_id"
        "  FROM person"
    )
    people = dict(cur.fetchall())
    cur.execute(
        "SELECT DISTINCT e.person_id FROM employment e WHERE e.exited_on IS NULL"
    )
    already = {r[0] for r in cur.fetchall()}

    errors: list[str] = []
    planned: list[dict] = []
    skipped: list[str] = []
    not_ready: list[str] = []

    for i, row in enumerate(rows, start=2):
        name = (row.get("person_name") or "").strip()
        if not name:
            continue
        person_id = people.get(name.lower())
        if person_id is None:
            fail(i, f'"{name}" is not a person in the database. '
                    f"Add them to the org chart first, or fix the spelling.", errors)
            continue
        if person_id in already:
            skipped.append(f"  {name} — already has a current engagement")
            continue

        # A row where none of the three required fields is filled has simply not
        # been done yet, and is not an error. That lets HR load the people they
        # have confirmed and come back for the rest, instead of being blocked
        # until all 34 are complete. A PARTIALLY filled row IS an error, because
        # it means someone started and got it wrong.
        required = [(row.get(k) or "").strip() for k in ("worker_type", "work_location", "joined_on")]
        if not any(required):
            not_ready.append(name)
            continue

        wtype = (row.get("worker_type") or "").strip()
        if wtype not in WORKER_TYPES:
            fail(i, f'{name}: worker_type is "{wtype or "(blank)"}" — must be one of {sorted(WORKER_TYPES)}', errors)
            continue

        mode = (row.get("contractor_mode") or "").strip() or None
        if wtype == "Contractor" and mode not in MODES:
            fail(i, f"{name}: a Contractor needs contractor_mode independent or c2c", errors)
            continue
        if wtype != "Contractor" and mode is not None:
            fail(i, f"{name}: contractor_mode only applies to a Contractor", errors)
            continue

        loc = (row.get("work_location") or "").strip()
        if loc.lower() not in locations:
            fail(i, f'{name}: work_location "{loc or "(blank)"}" is unknown. '
                    f"Known: {sorted(n for n in locations)}", errors)
            continue
        location_id, region = locations[loc.lower()]

        joined = (row.get("joined_on") or "").strip()
        if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", joined):
            fail(i, f'{name}: joined_on is "{joined or "(blank)"}" — needs YYYY-MM-DD', errors)
            continue
        try:
            joined_date = date.fromisoformat(joined)
        except ValueError as exc:
            fail(i, f"{name}: joined_on {joined} is not a real date ({exc})", errors)
            continue

        dept = (row.get("department") or "").strip()
        dept_id = departments.get(dept.lower())
        if dept_id is None:
            fail(i, f'{name}: department "{dept}" not found', errors)
            continue

        hr_lead = (row.get("hr_lead") or "").strip()
        hr_lead_id = None
        if hr_lead:
            hr_lead_id = people.get(hr_lead.lower())
            if hr_lead_id is None:
                fail(i, f'{name}: hr_lead "{hr_lead}" is not a known person', errors)
                continue

        # How many documents this person will actually be asked for.
        cur.execute(
            "SELECT count(*), count(*) FILTER (WHERE is_mandatory) FROM document_requirement"
            " WHERE (worker_type IS NULL OR worker_type = %s)"
            "   AND (region IS NULL OR region = %s)"
            "   AND (contractor_mode IS NULL OR contractor_mode = %s)",
            (wtype, region, mode),
        )
        n_docs, n_mand = cur.fetchone()
        if n_docs == 0:
            fail(i, f"{name}: no document checklist is configured for {wtype} in {region}", errors)
            continue

        planned.append(dict(
            name=name, person_id=person_id, wtype=wtype, mode=mode,
            designation=(row.get("designation") or "").strip() or "Unspecified",
            dept_id=dept_id, location_id=location_id, region=region,
            hr_lead_id=hr_lead_id, joined=joined_date,
            personal_email=(row.get("personal_email") or "").strip() or None,
            n_docs=n_docs, n_mand=n_mand,
        ))

    print(f"\n{len(rows)} rows read from {path}")
    if not_ready:
        print(f"\n{len(not_ready)} row(s) not filled in yet — left alone:")
        print("  " + ", ".join(not_ready))
    if skipped:
        print(f"\nSkipped {len(skipped)} (not an error):")
        print("\n".join(skipped))
    if errors:
        print(f"\n{len(errors)} PROBLEM(S) — nothing was written:")
        print("\n".join(errors))
        conn.rollback(); conn.close()
        return 1
    if not planned:
        print("\nNothing to create.")
        conn.rollback(); conn.close()
        return 0

    print(f"\n{len(planned)} engagement(s) to create:")
    print(f"  {'name':<20}{'type':<12}{'region':<8}{'joined':<12}docs")
    for p in planned:
        print(f"  {p['name']:<20}{p['wtype']:<12}{p['region']:<8}{p['joined'].isoformat():<12}"
              f"{p['n_docs']} ({p['n_mand']} mandatory)")

    if not apply_changes:
        print("\nDry run. Nothing written. Re-run with --apply to create these.")
        conn.rollback(); conn.close()
        return 0

    for p in planned:
        cur.execute(
            "INSERT INTO employment (employment_code, person_id, worker_type, contractor_mode,"
            "                        designation, joined_on, stage)"
            " VALUES ('EMP-' || lpad(nextval('employment_code_seq')::text, 3, '0'),"
            "         %s, %s, %s, %s, %s, 'Invited') RETURNING employment_id",
            (p["person_id"], p["wtype"], p["mode"], p["designation"], p["joined"]),
        )
        employment_id = cur.fetchone()[0]

        if p["personal_email"]:
            cur.execute(
                "INSERT INTO person_email (person_id, email_type, email) VALUES (%s,'personal',%s)"
                " ON CONFLICT DO NOTHING",
                (p["person_id"], p["personal_email"]),
            )

        cur.execute(
            "INSERT INTO employment_assignment"
            " (employment_id, department_id, hr_lead_person_id, work_location_id, valid_from)"
            " VALUES (%s,%s,%s,%s,%s)",
            (employment_id, p["dept_id"], p["hr_lead_id"], p["location_id"], p["joined"]),
        )
        # is_mandatory copied, not joined: frozen at creation.
        cur.execute(
            "INSERT INTO worker_document (employment_id, requirement_id, is_mandatory, status)"
            " SELECT %s, requirement_id, is_mandatory, 'Outstanding' FROM document_requirement"
            "  WHERE (worker_type IS NULL OR worker_type = %s)"
            "    AND (region IS NULL OR region = %s)"
            "    AND (contractor_mode IS NULL OR contractor_mode = %s)",
            (employment_id, p["wtype"], p["region"], p["mode"]),
        )
        cur.execute(
            "INSERT INTO onboarding_token (employment_id, token_hash, issued_at, expires_at, status)"
            " VALUES (%s,%s,now(), now() + interval '7 days','active')",
            (employment_id, hashlib.sha256(secrets.token_urlsafe(24).encode()).hexdigest()),
        )

    conn.commit()
    print(f"\nCreated {len(planned)} engagement(s). All of it, or none of it.")
    print("Onboarding links are NOT printed: issue them from the app so each one")
    print("is delivered to the right person and recorded.")
    conn.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
