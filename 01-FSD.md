# Functional Specification — Workforce

## Document control

| Field | Detail |
|---|---|
| Project / Initiative | Workforce — Employee & Organization Management Platform |
| Business area | Human Resources / People Operations — KATBOTZ (India and US operations) |
| Object / Work item | WF-001 — Workforce Platform |
| Object type | Application (custom platform). Does not map to a single WRICEF object type — see section 2 |
| Owner | To be assigned |
| Technical owner | To be assigned |
| Version / Date | V2 — 31 August 2026 |
| Status | Draft — for review |

## Document set and precedence

| Document | Holds | Authority |
|---|---|---|
| **This document — Functional Specification (V2)** | Every requirement, rule, scope boundary and decision, stated in summary form | **Single source of truth.** Where any document disagrees with this one, this one governs |
| Detailed Functional Specification, WF-001 | The same requirements expanded — field lists, state machines, permission matrices, rule catalogues, test cases | Subordinate. Elaborates this document and must not contradict it |
| Technology Stack (Revised), WF-001 | Every technology used, and why | Sole authority on technology. This document deliberately contains no technology choices |

Each section below ends with a pointer to where its detail lives.

---

## 1. Purpose and business need

**Current situation**
- Worker records, organization structure and onboarding documents are tracked outside any single system.
- No authoritative source for who reports to whom — 34 people and 50 roles are recorded, and no reporting relationships at all.
- Document verification is manual, with no enforced completion gate before an account is created.
- No audit trail of structural or record changes.
- Access was previously determined by a value in the web address that any user could edit.
- Nothing is deployed; the system runs only on a developer machine.

**Business need**
- One system where workers sign in with their company Google account.
- Onboarding that cannot complete until documents are verified.
- HR maintaining the authoritative organization structure, employee records, attendance, leave and performance data.
- Permissions derived from the organization chart rather than assigned by hand.

**Expected benefit**
- One canonical organization chart driving both display and access rights.
- No worker activated before mandatory documents are verified — enforced on the server.
- Complete audit trail for structural and sensitive-record changes.
- Immigration and work-authorization eligibility decided by configurable rules, recorded and reproducible.
- Employee self-service for own documents, attendance, leave, goals and performance.

**In scope — built and working**
- Organization chart and structure editing.
- Access tiers derived from the organization chart.
- Employee records and profiles.
- Document checklist and HR verification.
- Account-creation gate.
- Attendance, and clock in and out.
- Leave requests and approval.
- Monthly performance reviews.
- Tasks, goals and notebook.
- Employee handbook.
- Structural audit log.
- CSV export.

**In scope — specified, not yet built**
- Immigration status, and visa and work-authorization records.
- Eligibility rules engine.
- One-time-code and step-up verification.
- Expiry alerting.
- Education and graduation tracking.
- Document file storage and retention.

**Out of scope**
- Payroll processing, contractor invoicing, contracts and amendments.
- Applicant tracking and recruitment pipeline.
- Training management.
- Litigation and legal hold.
- WhatsApp and SMS messaging.
- Payroll-system and recruitment-system integrations.

*Detail: sections 1 and 25 of the Detailed Functional Specification.*

---

## 2. Solution overview

**Solution summary**
- Workforce is a web application, not a single WRICEF object. It comprises eight functional modules: Authentication and Access; Employee Management; Organization Structure; Onboarding and Documents; Attendance and Leave; Performance; Tasks and Notes; and Immigration and Eligibility.
- A person signs in with their company Google account. The system resolves them to a person in the organization chart and computes their access tier and visible-person scope from that position on every request — never from anything the client sends.
- HR creates worker records, issues a tokenized onboarding link, verifies each uploaded document, and activates the account only once every mandatory document is approved.

**User and system triggers**
- A worker signs in with their company Google account.
- HR creates a worker record, which issues an onboarding link valid for seven days.
- A candidate opens that link and uploads documents — no account required.
- HR approves or rejects each document.
- A scheduled scan evaluates visa and work-authorization expiry (specified, not built).

**Primary output**
- An activated worker record with a verified document set.
- The authoritative organization chart — people, departments, roles, reporting lines.
- A resolved access tier and visible-person scope for every authenticated request.
- A recorded, reproducible eligibility decision per hire (specified, not built).
- A structural audit trail, and CSV exports for roster and attendance.

**Key dependencies — all outstanding, all blocking go-live**
- Google identity — the sole sign-in method; live credentials do not yet exist.
- A cloud project with billing enabled — required for hosting, database and storage.
- Message delivery by email — required for one-time codes and expiry alerts; no capability exists.
- Document storage — uploads currently record a file name only; no file is stored.
- Reporting relationships must be authored — zero are recorded, which disables manager-level access, manager-scoped visibility and review routing.
- Confirmed worker email addresses — sign-in currently matches accounts by naming convention.

**Assumptions**
- Every worker has a company Google account.
- The organization chart is authoritative and actively maintained; access depends on it being correct.
- Immigration and eligibility rules are supplied and maintained by people with the relevant legal knowledge. The product carries no legal knowledge of its own and no country's law is built into it.
- HR verifies documents by human judgement; the system does not read document contents.
- Scale stays near 34 to 50 workers for this release.

*Detail: sections 2 and 3 of the Detailed Functional Specification.*

---

## 3. Process and logic

| Step | Action | System / Data | Result |
|---|---|---|---|
| 1 | Worker signs in with company Google account | Google identity; organization chart | Identity verified. Non-company and unverified accounts refused |
| 2 | System resolves the account to an organization-chart person | Organization chart — people, roles | Access tier and visible-person scope computed. An authenticated account matching no person is refused, never defaulted to a lower tier |
| 3 | HR creates a worker record | Worker record; document requirement rules | Record at stage Invited. Seven-day onboarding token issued. Document checklist built from worker type, region and contractor mode |
| 4 | Candidate opens the tokenized link and uploads documents | Document checklist | Each item moves to Pending with file name and timestamp. No account required |
| 5 | Candidate submits | Worker record | Stage moves to Verifying. Record appears in the HR queue |
| 6 | HR approves or rejects each document | Document checklist | Approved, or Rejected with a reason from the defined list. Rejection returns that item to the candidate |
| 7 | Last mandatory document approved | Worker record | Stage moves to Verified. Optional documents never block |
| 8 | Eligibility check runs before hire (not built) | Work authorization; eligibility rules | Eligible, Ineligible or Needs review, with every matched reason recorded and an immutable input snapshot |
| 9 | HR creates the account | Worker record | Stage moves to Active. Refused on the server if any mandatory document is unapproved, regardless of what the interface shows |
| 10 | HR edits the organization structure | Organization chart; audit log | People, roles, departments and relationships added, edited or removed. Reporting cycles refused before commit. Every change written to the audit log |
| 11 | Employee marks attendance, or clocks in and out | Attendance; time sessions | Daily status and timed sessions recorded with source and place |
| 12 | Employee requests leave; approver decides | Leave requests | A paid or unpaid request moves Pending to Approved or Rejected, with decider and timestamp |
| 13 | Monthly review chain runs | Monthly reviews | Self, then Team Lead, then HR, then Finalized — sequential. Lock-after-submission is required and not yet implemented |
| 14 | Scheduled expiry scan runs (not built) | Visa and work-authorization records | Alerts at 90, 60, 30 and 7 days and on expiry, once per threshold per record |

*Detail: sections 5 to 17 of the Detailed Functional Specification, which carry the full state machines and the rules at each step.*

---

## 4. Inputs and outputs

| Type | Field / Data | Source | Required | Notes |
|---|---|---|---|---|
| Input | Google identity token | Google | Yes | Company domain and verified email both checked |
| Input | Worker identity — first name, last name, preferred name, gender, date of birth | HR entry | Name only | Date of birth held with restricted access |
| Input | Contact — personal email, professional email, phone | HR entry | Yes | Email unique organization-wide, case-insensitive, across both fields, checked on create and on edit |
| Input | Address — country, state, address, pin code, time zone | HR entry | No | Time zone drives attendance display |
| Input | Employment — worker type, contractor mode, employment type, designation, department, HR lead, team leads, location | HR entry | Type, designation, department | Worker type and region determine the document checklist |
| Input | Nationality and immigration status | HR entry | To be decided | One immigration status field beside nationality. All visa and authorization detail lives in its own record, not on the employee record. Not yet built |
| Input | Documents — 6 to 12 items by worker type and region | Candidate upload | Mandatory items | File name recorded only; no file is stored or retrievable today |
| Input | Visa record — type, validity dates, issuing country | HR entry | To be decided | Never overwritten; a change supersedes and both are retained. Not yet built |
| Input | Work authorization — type, validity, duration, restrictions | HR entry | To be decided | Duration configurable; one-year, two-year and other lengths are the same shape. Not yet built |
| Input | Eligibility rules — country, visa type, employment type, paid or unpaid, effect, priority | Configuration | To be decided | Configuration per country, never built into the product. Not yet built |
| Input | Attendance status, clock in and out, leave request, goals, notes | Employee | Varies | |
| Input | Review ratings and feedback — self, team lead, HR | Each reviewer | Yes at each stage | Stages are sequential |
| Output | Activated worker record with verified document set | System | — | Gated on mandatory document approval |
| Output | Organization chart — 34 people, 50 roles, 12 departments, 7 vacancies | System | — | Zero reporting relationships recorded |
| Output | Access tier and visible-person scope | System | — | Recomputed every request; never stored, never client-supplied |
| Output | Eligibility decision with reasons and input snapshot | System | — | Immutable; reproducible after rules change. Not yet built |
| Output | Structural audit entries — actor, summary, before and after, timestamp | System | — | Currently structural changes only |
| Output | In-app notifications; CSV exports for roster and attendance | System | — | No email, SMS or WhatsApp capability exists |

*Detail: sections 4, 7 and 15 of the Detailed Functional Specification, which carry every field, its type, its constraints and its access restrictions.*

---

## 5. Validation and error handling

| Scenario | Validation / Rule | Response | Recovery |
|---|---|---|---|
| Duplicate employee email | One email identifies one worker. Case-insensitive, both email fields, on create and on edit | Refused, naming the existing person, their type and stage | HR uses a different email, or confirms it is the same person |
| Account creation with unapproved documents | Every mandatory document must be Approved. Optional items never block | Refused on the server, stating how many mandatory documents remain | HR verifies the outstanding documents |
| Reporting cycle | A role may not report, directly or indirectly, to itself | Refused before commit with an explanation — not flagged afterwards | HR chooses a different relationship |
| Duplicate or self-relationship | Identical relationships and self-links refused | Refused; relationship count unchanged | — |
| Unauthorized page access | Tier checked on the server on every request | Access-denied view. Never a partial render of restricted data | User returns to a permitted page |
| Unauthorized action | Authority re-checked on the server for every change | Refused, naming the actor and their tier. The action must not partially apply | — |
| Authenticated non-member | Account must resolve to an organization-chart person | Refused with an explicit message; never defaulted to a lower tier | HR adds the person to the organization chart |
| Person renamed | A rename reaches every record referencing that person, including a self-reference | All references updated | — |
| Unresolved name reference | A name matching nobody is recorded as unresolved | Surfaced as a validation warning; never silently repointed at a similar name | HR corrects the reference |
| Department deleted | Roles move to the company root; the root cannot be deleted | Confirmation required; roles preserved | Structure reset if required |
| Review stage out of sequence | Self, then Team Lead, then HR, then Finalized | A later stage refused until the earlier one completes | Complete the prior stage |
| Unpaid engagement against a restricted authorization | Where the authorization prohibits unpaid work, an unpaid engagement is refused | Ineligible, with the restriction stated. The same person may remain eligible for a paid engagement | Offer a paid engagement, or an authorised override with a written reason |
| Eligibility override attempted | The rule must permit override; the actor must hold the permission; a written reason and step-up verification are required | Refused if the rule is non-overridable, regardless of tier | Escalate, or change the engagement terms |
| Incorrect or expired one-time code | Single use, short expiry, attempt limit, lockout | Refused; a new challenge required. Never silently accepted | Request a new code |
| Expired visa or work authorization | Current authorization must cover the engagement | Compliance exception raised; dependent engagements blocked | Record a renewal |
| Expired onboarding link | Token valid seven days from creation | To be decided — expiry behaviour undefined | To be decided — reissue process undefined |
| Integration failure | Fail closed on identity and storage | Identity failure blocks sign-in with no fallback. An upload failure must not mark an item submitted | Retry. One-time codes and expiry alerts must retry |
| Network or database failure | No partial writes; never report success on a failed write | Failure surfaced; unsaved input preserved | Retry |

*Detail: section 22 of the Detailed Functional Specification, which carries the full validation catalogue including field-level rules, file format and size limits, and the rejection-reason list.*

---

## 6. Security, controls and compliance

**Authorization**
- Access tier is derived from the person's organization-chart position and recomputed on every request. No role value is ever accepted from the client.
- Super Admin, implemented as tier "founder", the CEO position: all records, all departments, audit log, settings.
- HR / Admin: all employee records organization-wide, all documents, organization structure, audit log. Granted by any HR role a person holds, not only their primary one.
- Employee / Intern: own record only. Admin pages return an access-denied view.
- Team Lead and Candidate do not exist as access tiers. Team Lead was intended to derive from reporting relationships, of which zero are recorded.
- Unresolved: three competing role models exist across the project. See Open Item 1.

**Audit and logging**
- Logged today: person, role, department and relationship changes, and structure reset. Each entry carries actor, action summary, before and after, and timestamp.
- Required and not yet implemented: sign-in attempts; employee profile changes; permission changes; document access and download; immigration record changes; eligibility decisions and overrides; sensitive-data export.
- Audit entries must be append-only for every user including the highest tier. Not yet enforced.

**Reconciliation and controls**
- Account activation gated on mandatory document approval, enforced on the server.
- Structural validation runs continuously: duplicate identifiers, invalid references, reporting cycles, open-role mismatches, multiple managers, unresolved name references.
- Eligibility decisions recorded with matched rules and an immutable input snapshot, so a past decision stays explainable after rules change.
- Overrides require permission, a written reason and step-up verification — all recorded.
- Displayed counts and rendered lists derive from one filtered set, so a count can never disagree with the list beneath it.

**Data privacy and compliance**
- Personal and immigration data are separated from directory data, so ordinary lookups do not expose sensitive fields.
- Sensitive actions require step-up verification (specified, not built).
- Identifier-class fields — national identifiers, passport and visa document numbers — require encryption at rest. Not yet implemented.
- Documents are never served from a public path.
- Retention: three years after worker exit, then deletion. Not implemented.
- Applicable compliance regimes across India and US operations are undecided and require legal input.

*Detail: sections 2, 19 and 21 of the Detailed Functional Specification, which carry the permission matrix, the audit event catalogue and the retention schedule.*

---

## 7. Testing and acceptance

| # | Test scenario | Expected result | Owner / Status |
|---|---|---|---|
| 1 | Sign in with a verified company Google account matching an organization-chart person | Session issued; dashboard loads with the derived tier | QA — Not started |
| 2 | Sign in with a Google account outside the company domain | Refused; no session issued | QA — Not started |
| 3 | Sign in with a valid company account matching no organization-chart person | Refused with an explicit message; no default tier granted | QA — Not started |
| 4 | Employee-tier user requests an admin page directly by URL | Access-denied view; no restricted data in the response | QA — Not started |
| 5 | User holding an HR role only as a secondary position has access resolved | Tier is HR; visible set is everyone | QA — Not started |
| 6 | Create a second worker using an existing email in a different letter case | Refused, naming the existing person | QA — Not started |
| 7 | Edit one worker's email to match another worker's | Refused; no change persists | QA — Not started |
| 8 | Rename a person who is HR lead for other workers | Every reference updates, including that person's own self-reference | QA — Not started |
| 9 | Request account creation with one mandatory document unapproved | Refused stating the outstanding count; stage unchanged | QA — Not started |
| 10 | Request account creation with all mandatory approved and optional outstanding | Succeeds; stage becomes Active | QA — Not started |
| 11 | Delete a department containing roles | Roles appear under the company root; none lost | QA — Not started |
| 12 | Add a relationship that would create a reporting cycle | Refused before commit with an explanation; relationship count unchanged | QA — Not started |
| 13 | Perform any structural change, then open the audit log | Change present with actor, summary, before and after, timestamp | QA — Not started |
| 14 | Check an unpaid internship for a person whose authorization prohibits unpaid work | Ineligible, with the restriction stated | Blocked — not built |
| 15 | Check a paid internship for that same person | Eligible | Blocked — not built |
| 16 | Override an ineligible result on an overridable rule with reason and verification | Onboarding proceeds; override, actor, reason and verification appear in the audit trail | Blocked — not built |
| 17 | Attempt to override a non-overridable rule | Refused regardless of tier | Blocked — not built |
| 18 | Run the expiry scan twice on the same day for an authorization expiring in 30 days | The 30-day alert sends once; the second run does not resend | Blocked — not built |
| 19 | Team lead attempts their review stage before the self review exists | Refused | QA — Not started |
| 20 | Call each gated action directly rather than through the interface | Every gate enforced on the server; a disabled control is not the control | Security — Not started |

*Detail: section 23 of the Detailed Functional Specification, which expands each scenario into preconditions, steps and pass criteria, and adds the per-module cases.*

---

## 8. Open items and decisions

| # | Open item / Decision | Owner | Due | Status |
|---|---|---|---|---|
| 1 | Which role model is authoritative — the five roles requested, the four tiers implemented, or the Senior HR and HR split? Are Team Lead and Candidate real roles this release? Does Intern remain a distinct tier? | TBD | TBD | Open — blocks access design and testing |
| 2 | Is the "no automations, no emails" principle retired? One-time codes and expiry alerting cannot function without message delivery | TBD | TBD | Open — blocks codes and alerting |
| 3 | Where do documents live — a shared drive as documented, or storage the product controls? No file is stored today | TBD | TBD | Open — blocks document upload |
| 4 | Is the manager relationship the team-lead field on the worker record, or the organization-chart reporting relationship? Who authors the missing relationships, and by when? | TBD | TBD | Open — blocks Team Lead role and review routing |
| 5 | When no eligibility rule matches, is the default allow or deny? | TBD | TBD | Open — blocks eligibility engine |
| 6 | Should HR be able to override eligibility decisions, or is that Super Admin only? | TBD | TBD | Open |
| 7 | Confirm the implemented document requirements are correct, and that the older list of Employee 5, Contractor 3, Intern 4 is stale. Implementation has 6 to 12 with region and contractor-mode branching | TBD | TBD | Open |
| 8 | How do monthly reviews and 30, 60 and 90-day milestone reviews relate? Both exist; is one superseded? | TBD | TBD | Open |
| 9 | What happens when an onboarding link expires — regenerate, extend or refuse? Who may reissue? | TBD | TBD | Open |
| 10 | Are the real worker email addresses confirmed? Sign-in currently maps accounts by naming convention | TBD | TBD | Open — blocks sign-in |
| 11 | Does deactivating a worker revoke their session and block future sign-in? | TBD | TBD | Open |
| 12 | Which compliance regimes apply across India and US operations? Requires legal input | TBD | TBD | Open |
| 13 | Given nothing is deployed and must-have items are outstanding, what is the revised go-live date and MVP cut? The stated date of 4 September 2026 is not achievable as scoped | TBD | TBD | Open — blocks release planning |
| 14 | Is training management in scope for any release? Referenced only in handbook text | TBD | TBD | Open |
| 15 | Are contractor invoicing, contracts and amendments still intended? They have no corresponding feature | TBD | TBD | Open |
| 16 | Weekly summaries written by each worker, and contract renewal date tracking, are described as core in older documentation but do not exist in code and are covered by no requirement | TBD | TBD | Open — scope decision needed |
| 17 | When is the URL role parameter removed from navigation entirely? | TBD | TBD | Open — security sign-off |
| 18 | Is the unused "documents submitted" stage intended, or should it be removed? | TBD | TBD | Open |

*Detail: section 26 of the Detailed Functional Specification, which records what each open item blocks and what a decision would change.*

---

## 9. Approval

| Role | Name | Decision | Date |
|---|---|---|---|
| Functional owner | To be assigned | Pending | |
| Technical owner | To be assigned | Pending | |
| HR / Process owner | To be assigned | Pending | |
| Security / Compliance | To be assigned | Pending | |
| Project sponsor | To be assigned | Pending | |
