# Detailed Functional Specification — Workforce

## Document control

| Field | Detail |
|---|---|
| Project / Initiative | Workforce — Employee & Organization Management Platform |
| Business area | Human Resources / People Operations — KATBOTZ (India and US operations) |
| Object / Work item | WF-001 — Workforce Platform |
| Document | Detailed Functional Specification |
| Parent document | Functional Specification WF-001, V2, dated 31 August 2026 |
| Owner | To be assigned |
| Technical owner | To be assigned |
| Version / Date | V1 — 31 August 2026 |
| Status | Draft — for review |

---

## 1. Purpose, scope and how to read this document

**Purpose of this document**
- This document expands every requirement in the Functional Specification into the detail needed to build and test it: field lists, state machines, permission matrices, rule catalogues and test cases.
- It adds no new scope. Everything here elaborates something already stated in the Functional Specification.

**Precedence**
- The Functional Specification is the single source of truth. Where this document disagrees with it, the Functional Specification governs and this document is corrected.
- Technology is out of scope for both documents. Every technology choice lives in the Technology Stack document.

**Status labels used throughout**
| Label | Meaning |
|---|---|
| Built | Implemented and working today |
| Partly built | Implemented with a stated gap |
| Specified | Defined in this document, not yet implemented |
| Open | Awaiting a decision recorded in section 26 |
| Not in scope | Recorded so it is not lost, explicitly excluded from this release |

**The eight modules**
| # | Module | Status | Detailed in |
|---|---|---|---|
| 1 | Authentication and access | Built | Sections 2, 3 |
| 2 | Employee management | Built | Sections 4, 5 |
| 3 | Organization structure | Built | Section 6 |
| 4 | Onboarding and documents | Partly built — no file is stored | Sections 7 to 11 |
| 5 | Attendance and leave | Built | Sections 12, 13 |
| 6 | Performance | Partly built — no lock after submission | Section 14 |
| 7 | Tasks and notes | Built | Section 18 |
| 8 | Immigration and eligibility | Specified | Sections 15 to 17 |

---

## 2. Roles, access tiers and the permission matrix

**How a tier is decided**
- A tier is never stored on a person and never accepted from the client. It is computed on every request from the signed-in person's position in the organization chart.
- A person may hold several roles. The tier granted is the highest that any held role confers — so an HR role held as a secondary position grants HR.
- An authenticated account that resolves to no person in the organization chart is refused outright. It is never granted a lower tier as a fallback.

**Tiers as implemented**
| Tier | Held by | Sees | Can change |
|---|---|---|---|
| Founder (Super Admin) | The CEO position | All records, all departments, audit log, settings | Anything |
| HR / Admin | Anyone holding any HR role | All employee records organization-wide, all documents, organization structure, audit log | Worker records, documents, structure, settings |
| Employee | Any worker not holding an HR or founder role | Own record only | Own attendance, leave, goals, notes, own document uploads |
| Intern | Currently the same as Employee | Own record only | Same as Employee |

**Tiers requested but not existing**
| Tier | Why it does not exist |
|---|---|
| Team Lead | Intended to derive from reporting relationships. Zero relationships are recorded, so the tier can never be granted. Blocked by Open Item 4 |
| Candidate | A candidate holds a tokenized link rather than an account, so they are never authenticated and hold no tier |

**Permission matrix**
| Capability | Founder | HR | Employee | Candidate with a valid link |
|---|---|---|---|---|
| Sign in | Yes | Yes | Yes | No account — link only |
| View own record | Yes | Yes | Yes | Own checklist only |
| View any worker record | Yes | Yes | No | No |
| Create a worker record | Yes | Yes | No | No |
| Edit a worker record | Yes | Yes | Own limited fields | No |
| Upload a document | Yes | Yes | Own only | Own checklist only |
| Approve or reject a document | Yes | Yes | No | No |
| Create an account (activate) | Yes | Yes | No | No |
| Edit organization structure | Yes | Yes | No | No |
| View audit log | Yes | Yes | No | No |
| Change settings | Yes | Partly — see below | No | No |
| Mark own attendance | Yes | Yes | Yes | No |
| Approve leave | Yes | Yes | No | No |
| Submit a self review | Yes | Yes | Yes | No |
| Submit a team-lead review | Yes | Yes | No — no tier exists | No |
| Finalize a review | Yes | Yes | No | No |
| Override an eligibility decision | Yes | Open Item 6 | No | No |
| Export data | Yes | Yes | No | No |

**Settings a tier may not change, regardless of tier**
- Retention period and the deletion schedule.
- Anything in the audit log.
- A rule marked non-overridable in the eligibility configuration.

**Enforcement rules**
- Tier is checked on the server for every request, and again for every change.
- A refused request returns an access-denied response, never a partial render of restricted data.
- A refused change must not partially apply.
- A control hidden or disabled in the interface is not a control. Every gated action must be refused when called directly.
- The role value previously carried in the web address is to be removed from navigation entirely. Open Item 17.

---

## 3. Identity, authentication and session

**Sign-in**
| Rule | Detail |
|---|---|
| Method | Company Google account only. There is no password, no alternative method and no fallback |
| Domain check | The account must belong to the company domain. Accounts outside it are refused |
| Verified address | The address must be marked verified by Google. An unverified address is refused |
| Resolution | The address is matched to a person in the organization chart. No match means refusal |
| Current gap | Accounts are matched by naming convention rather than a confirmed address. Open Item 10 |

**Session**
| Rule | Detail |
|---|---|
| Contents | Identity only. No tier, no scope, no permissions |
| Tier | Recomputed from the organization chart on every request |
| Expiry | Short-lived, renewed while in use |
| Deactivation | Whether deactivating a worker ends their session and blocks future sign-in is Open Item 11 |

**Step-up verification — specified, not built**
| Rule | Detail |
|---|---|
| When required | Before overriding an eligibility decision, and before other sensitive actions to be listed on decision of Open Item 1 |
| Method | A one-time code sent to the person's verified address |
| Code rules | Single use; short expiry; a limited number of attempts; lockout after repeated failure |
| On failure | Refused, and a new challenge required. Never silently accepted |
| Recording | Every challenge, success, failure and lockout is an audit event |
| Blocked by | Open Item 2 — no message delivery capability exists |

---

## 4. Worker record — every field

**Identity**
| Field | Required | Rules and access |
|---|---|---|
| First name | Yes | |
| Last name | Yes | |
| Preferred name | No | Used for display where present |
| Gender | No | |
| Date of birth | No | Restricted access — not shown in directory listings |
| Nationality | No | Sits beside immigration status |
| Immigration status | Open | One field on the record. All visa and authorization detail lives in its own record — see section 15. Not yet built |

**Contact**
| Field | Required | Rules and access |
|---|---|---|
| Personal email | Yes | Subject to the organization-wide uniqueness rule below |
| Professional email | Yes | Subject to the organization-wide uniqueness rule below |
| Phone | Yes | |

**The email uniqueness rule**
- One email address identifies one worker.
- The check is case-insensitive.
- The check spans both the personal and professional email fields, so an address used as one person's personal email cannot be another person's professional email.
- The check applies on create and on edit.
- A refusal names the existing person, their worker type and their stage, so HR can tell whether it is the same human being.

**Address**
| Field | Required | Rules |
|---|---|---|
| Country | No | Contributes to the document checklist through region |
| State | No | |
| Address | No | |
| Pin code | No | |
| Time zone | No | Drives how attendance and clock times are displayed |

**Employment**
| Field | Required | Rules |
|---|---|---|
| Worker type | Yes | Employee, Contractor or Intern. Determines the document checklist |
| Contractor mode | Only for Contractor | Branches the document checklist |
| Employment type | No | |
| Designation | Yes | |
| Department | Yes | Must be an existing organization unit |
| HR lead | No | A reference to a person. A rename of that person reaches this field, including where a person is their own HR lead |
| Team leads | No | May hold several. Whether this or the organization-chart relationship is the manager of record is Open Item 4 |
| Location | Yes | Contributes to the document checklist through region |
| Date of joining | Yes | |
| Date of exit | No | Starts the retention clock — see section 21 |
| Work experience | No | |

**System-held fields**
| Field | Rules |
|---|---|
| Worker identifier | Generated; never reused |
| Stage | See section 5 |
| Account created | Whether an account exists. Set only through the gate in section 11 |
| Status | Active or inactive |
| Created at | Set once |
| Onboarding token expiry | Seven days from creation — see section 10 |
| Document checklist | Built at creation from worker type, region and contractor mode |

**Unresolved references**
- Where a name in a reference field matches nobody, the value is recorded as unresolved and surfaced as a validation warning.
- The system never silently repoints an unresolved reference at a similarly spelled person.
- HR corrects it; the warning persists until they do.

---

## 5. Worker lifecycle and stages

| # | Stage | Entered when | Who acts next | Exit condition |
|---|---|---|---|---|
| 1 | Invited | HR creates the worker record | Candidate | Candidate uploads and submits |
| 2 | Documents submitted | Present in the data model, currently unused. Open Item 18 | — | — |
| 3 | Verifying | Candidate submits their checklist | HR | Every mandatory document decided |
| 4 | Verified | The last mandatory document is approved | HR | HR creates the account |
| 5 | Active | HR creates the account, and the gate in section 11 passes | Worker | Exit recorded |
| 6 | Inactive | Exit recorded | — | Retention period elapses — see section 21 |

**Rules**
- A stage never moves backwards except through document rejection, which returns the rejected item to the candidate while the record stays at Verifying.
- Optional documents never affect stage.
- Stage is set by the system in response to events. It is not a field HR types into.
- An eligibility check, once built, sits between Verified and Active — see section 16.

---

## 6. Organization structure

**What is recorded**
| Entity | Holds | Current volume |
|---|---|---|
| Person | Display name, aliases, email address | 34 |
| Unit (department) | Name, parent unit | 12 |
| Role | The person holding it or vacant, its unit, its level, its title, whether it is that person's primary role | 50, of which 7 vacant |
| Relationship | From role, to role, and type — reports to, accountable to, or dotted line | **0** |

**The consequence of zero relationships**
- Manager-level access cannot be granted.
- Manager-scoped visibility cannot be computed.
- Review routing has no route.
- Until relationships are authored, the organization chart displays structure without hierarchy. Open Item 4.

**Structural validation, run continuously**
| Check | Rule | On failure |
|---|---|---|
| Duplicate identifier | No two entities share an identifier | Refused |
| Invalid reference | Every reference must resolve | Surfaced as a warning |
| Reporting cycle | A role may not report, directly or indirectly, to itself | Refused before commit, with an explanation naming the path. Never flagged after the fact |
| Self-relationship | A role may not report to itself | Refused |
| Duplicate relationship | An identical relationship may not be added twice | Refused; the relationship count does not change |
| Multiple managers | A role reporting to more than one manager is surfaced | Warning |
| Open-role mismatch | A vacancy inconsistent with headcount is surfaced | Warning |
| Unresolved name | A name matching nobody is recorded as unresolved | Warning |

**Editing rules**
| Action | Rule |
|---|---|
| Add or edit a person, role, unit or relationship | Permitted to HR and founder. Every change is an audit event |
| Rename a person | The rename reaches every record referencing that person — including where they are their own HR lead |
| Delete a unit holding roles | Those roles move to the company root. No role is lost. Confirmation is required first |
| Delete the company root | Refused |
| Reset the structure | Permitted to founder. Recorded as a single audit event |

---

## 7. Document requirements — the checklist

**How the checklist is built**
- At worker creation, from three inputs: worker type, region derived from location, and contractor mode where the type is Contractor.
- Between 6 and 12 items result.
- Each item is marked mandatory or optional. Only mandatory items affect the account-creation gate.
- The checklist is fixed for that worker once created. Changing requirements affects new workers only.

**Base set — all worker types, India**
| Document | Mandatory |
|---|---|
| PAN card | Yes |
| Aadhaar | Yes |
| Bank proof | Yes |
| Degree certificate | Yes |
| 10th marksheet | Yes |
| 12th marksheet | Yes |

**Additional by type and region**
| Condition | Additional document | Mandatory |
|---|---|---|
| Worker type is Intern | Student identity document | Yes |
| Worker type is Intern | Proof of expected graduation date | Open — see section 15 on education tracking |
| Region is US, and type is Contractor or Intern | US tax withholding form | Yes. Valid 12 months from verification. Alert 30 days before expiry |
| Worker type is Contractor | Varies by contractor mode | To be confirmed under Open Item 7 |
| Region is US | Work authorization evidence | Yes once section 15 is built |
| Any type | Passport | Where nationality or immigration status requires it. Specified with section 15 |

**Open item on this section**
- Older documentation states Employee 5, Contractor 3, Intern 4 documents. The implementation branches to between 6 and 12. The older list is believed stale and requires confirmation. Open Item 7.

---

## 8. Document upload, formats and limits

**Who uploads**
| Actor | Route |
|---|---|
| Candidate before activation | The tokenized link, no account — see section 10 |
| Worker after activation | Signed in, own record only |
| HR | On behalf of a worker, any record |

**Accepted formats and limits**
| Document class | Formats | Maximum size |
|---|---|---|
| Identity and financial documents — PAN, Aadhaar, bank proof, tax forms | PDF, JPG, PNG | 5 MB |
| Certificates and marksheets | PDF | 10 MB |
| Marksheets where only a photograph exists | PDF, JPG, PNG | 5 MB |
| Signed agreements | PDF | 10 MB |

**Rejected outright**
- Word documents, spreadsheets, archives, video and camera raw formats.
- Anything above the size limit for its class.
- Anything whose actual contents do not match the format it claims to be.

**Upload rules**
| Rule | Detail |
|---|---|
| Validation before storage | Format, size and integrity are checked before the file is stored. An invalid file is refused and nothing is recorded |
| Failure behaviour | An upload failure must never mark a checklist item as submitted. The item stays outstanding |
| On success | The item moves to Pending, carrying the file name and a timestamp |
| Re-upload | Permitted where an item has been rejected. The previous file is retained; the new file becomes current; the item returns to Pending |
| Re-upload limit | Configurable. Not currently enforced |
| Current gap | A file name is recorded and no file is stored or retrievable. Open Item 3 |

---

## 9. Document verification and rejection

**States**
| State | Meaning | Set by |
|---|---|---|
| Outstanding | Not yet uploaded | System |
| Pending | Uploaded, awaiting a decision | System, on successful upload |
| Approved | HR has accepted it | HR |
| Rejected | HR has refused it, with a reason | HR |

**Note on states**
- Older documentation describes a four-state model including "Under Review", set automatically when HR opens the file. The implemented model has no such state. Treated as stale unless Open Item 7 decides otherwise.

**Verification rules**
| Rule | Detail |
|---|---|
| Decision is per item | HR approves or rejects each document individually. There is no bulk accept of a submission |
| Rejection requires a reason | Chosen from the defined list below. A free-text reason is permitted only under "Other" |
| Rejection returns the item | Only the rejected item returns to the candidate. Approved items stay approved |
| The reason is shown | The candidate sees the specific reason, so they know what to correct |
| Human judgement | HR verifies by looking at the document. The system does not read or extract document contents |
| Viewing is recorded | Each time a document is opened, that access is an audit event — required, not yet implemented |
| Never public | A document is never reachable at a public address |

**Rejection reasons**
| Reason | Use |
|---|---|
| Unclear or blurry | Cannot be read |
| Expired | No longer valid |
| Invalid | Not the right kind of document |
| Incomplete | Information missing |
| Damaged or torn | Physically damaged |
| Wrong document | A different document was submitted |
| Illegible signature | Signature unreadable |
| Other | A written reason is required |

**Version history**
- Every uploaded version is retained, with its upload timestamp and its outcome.
- The current version is the most recent.
- History is retained for as long as the worker record is retained — see section 21.

---

## 10. Onboarding and the tokenized link

**Why the link exists**
- Documents are verified before an account is created, so no account is paid for or provisioned for a person whose documents fail.
- The candidate therefore has no account at the point of upload, and needs a route in that does not require one.

**The token**
| Rule | Detail |
|---|---|
| Issued when | HR creates the worker record |
| One per candidate | Each candidate's link is their own. There is no shared address |
| Validity | Seven days from creation |
| Scope | That candidate's checklist only. It grants nothing else and reveals no other record |
| Revocable | The token can be cancelled and a new one issued, because it is recorded rather than self-contained |
| On expiry | Behaviour undefined. Open Item 9 — regenerate, extend or refuse, and who may reissue |

**The candidate journey**
| # | Step | Result |
|---|---|---|
| 1 | HR completes the worker form and issues the link | Record at stage Invited. Checklist built |
| 2 | HR sends the link to the candidate | Blocked today — no message delivery. Open Item 2 |
| 3 | Candidate opens the link | Their checklist is shown. No sign-in, no account |
| 4 | Candidate uploads each item | Each item moves to Pending with file name and timestamp |
| 5 | Candidate submits | Record moves to Verifying and enters the HR queue |
| 6 | HR decides each item | Approved, or Rejected with a reason |
| 7 | A rejected item returns | The candidate re-uploads through the same link |
| 8 | The last mandatory item is approved | Record moves to Verified |

**Rules**
- No account is created at any point in this journey.
- A candidate cannot see, and cannot reach, any record other than their own.
- Submitting with items outstanding is permitted; the record simply cannot reach Verified.

---

## 11. Account creation gate

**The rule**
- An account may be created only when every mandatory document on that worker's checklist is Approved.
- Optional documents never block, however many are outstanding.

**Enforcement**
| Rule | Detail |
|---|---|
| Where enforced | On the server, at the point of the change |
| Independent of the interface | Refused even when the interface presents the action as available. A disabled button is not the gate |
| Refusal message | States how many mandatory documents remain outstanding |
| On refusal | The stage does not change and nothing partially applies |
| Recorded | Both the successful activation and every refusal are audit events |
| Concurrency | Two people attempting activation at the same moment must not both succeed |

**On success**
- Stage moves to Active.
- The account-created flag is set.
- The worker can sign in with their company Google account, and their documents are already verified — they are never asked to upload again.

---

## 12. Attendance and time tracking

**Daily attendance**
| Field | Rules |
|---|---|
| Date | One record per worker per day |
| Status | Present, absent, on leave, holiday, or the values settled under Open Item 1 |
| Source | How it was recorded — self-marked, or recorded by HR |
| Place | Where the worker was — office, remote, or as configured |
| Recorded by | The person who set it |

**Clock in and out**
| Field | Rules |
|---|---|
| Session | A worker may have several timed sessions in one day |
| Start and end | Both timestamps recorded |
| Open session | A session with no end is shown as running |
| Time zone | Displayed in the worker's own time zone, held unambiguously |
| Duration | Derived, never entered |

**Rules**
- A worker records their own attendance. HR may record on anyone's behalf.
- Attendance accumulates indefinitely and is never pruned during employment.
- Attendance is exportable to CSV — see section 22.
- Where a worker is on approved leave, the day's attendance reflects it.

---

## 13. Leave management

**The request**
| Field | Required | Rules |
|---|---|---|
| Type | Yes | Paid or unpaid |
| Start date | Yes | |
| End date | Yes | Not before the start date |
| Reason | No | |
| Status | System | Pending, Approved or Rejected |
| Decided by | System | The approver's identity, recorded on decision |
| Decided at | System | Timestamp, recorded on decision |

**Rules**
| Rule | Detail |
|---|---|
| Who requests | The worker, for themselves |
| Who approves | HR and founder. A team-lead approver requires the Team Lead tier, which does not exist — Open Item 4 |
| Self-approval | A person may not approve their own request |
| Overlap | Two approved leave requests may not cover the same day for the same worker |
| After decision | A decided request is not edited. A change means a new request |
| Balance and entitlement | Not specified. Leave balances, accrual and carry-over are not in this release |

---

## 14. Performance reviews

**The monthly chain**
| # | Stage | Filled by | Cannot start until |
|---|---|---|---|
| 1 | Self review | The worker | — |
| 2 | Team lead review | The worker's team lead | The self review exists |
| 3 | HR review | HR | The team lead review exists |
| 4 | Finalized | HR | The HR review exists |

**Rules**
| Rule | Detail | Status |
|---|---|---|
| Sequence | Strictly enforced. A later stage is refused until the earlier one completes | Built |
| One per period | One review of each stage per worker per period | Built |
| Contents | A rating and written feedback at each stage | Built |
| Lock after submission | Once a stage is submitted it must not be editable. A change means a new, superseding review, with both retained and the audit trail showing each | **Required, not implemented** |
| Routing | The team lead stage needs a team lead. Zero reporting relationships are recorded — Open Item 4 | Blocked |
| Visibility | The worker sees every stage of their own review | Built |

**Milestone reviews**
- Older documentation describes reviews at 30, 60 and 90 days and annually, filled by the team lead.
- The implemented model is a monthly chain.
- Whether these coexist or one supersedes the other is Open Item 8.

---

## 15. Immigration and work-authorization records — specified, not built

**Why these are separate records**
- Immigration data is more sensitive than directory data. Keeping it in its own records means an ordinary lookup of a person does not expose it.
- The employee record therefore carries only nationality and a single immigration status field. Everything else lives here.

**Visa record**
| Field | Rules |
|---|---|
| Type | The visa class |
| Issuing country | |
| Valid from, valid to | |
| Document number | Identifier-class — encrypted, restricted access |
| Supersedes | A visa record is never overwritten. A change creates a new record and both are retained |
| Current record | Exactly one visa record may be current for a person at any moment |

**Work authorization record**
| Field | Rules |
|---|---|
| Type | The authorization class |
| Valid from, valid to | |
| Duration | Configurable. One-year, two-year and other lengths are the same shape — no length is built into the product |
| Restrictions | What the authorization prohibits — for example, unpaid work |
| Document number | Identifier-class — encrypted, restricted access |
| Supersedes | Never overwritten; a change supersedes and both are retained |

**Education and graduation tracking**
| Field | Rules |
|---|---|
| Institution, programme | |
| Expected graduation date | Drives intern eligibility where a rule depends on student status |
| Actual graduation date | Where a rule depends on a person having graduated |
| Evidence | The relevant checklist document |

**Rules**
- A record is never overwritten. History is permanent within the retention period.
- Every creation, change and view of these records is an audit event — required, not yet implemented.
- Where a person's current authorization does not cover the engagement, a compliance exception is raised and dependent engagements are blocked.

---

## 16. Eligibility rules engine — specified, not built

**The principle**
- The product carries no legal knowledge of its own. No country's law is built into it.
- Rules are configuration, supplied and maintained by people with the relevant legal knowledge, and changed without a release.

**A rule**
| Field | Rules |
|---|---|
| Country | Which country the rule applies to |
| Visa type | Which authorization class it applies to |
| Employment type | Which engagement type it applies to |
| Paid or unpaid | Whether it applies to paid work, unpaid work, or both |
| Effect | Eligible, Ineligible, or Needs review |
| Priority | Determines evaluation order where several rules match |
| Overridable | Whether a person with the permission may override this rule's outcome |

**Evaluation**
| # | Step | Detail |
|---|---|---|
| 1 | Assemble the inputs | Nationality, immigration status, current visa record, current work authorization and its restrictions, the proposed engagement type, and whether it is paid |
| 2 | Match rules | Every rule matching those inputs is collected |
| 3 | Order by priority | The highest-priority matched rule determines the outcome |
| 4 | Record the decision | Outcome, every matched rule, and an immutable snapshot of the inputs |
| 5 | Where nothing matches | Default outcome undecided — Open Item 5. Allow or deny must be settled before this can be built |

**Reproducibility**
- A decision references the exact version of each rule that was evaluated.
- A rule changing later does not change a past decision, and a past decision remains explainable.
- The recorded input snapshot is immutable.

**Override**
| Rule | Detail |
|---|---|
| Permitted only if | The rule is marked overridable |
| Actor must | Hold the override permission — whether HR holds it is Open Item 6 |
| Requires | A written reason, and step-up verification |
| Non-overridable rules | Refused regardless of tier, including founder |
| Recorded | The override, the actor, the reason and the verification all appear in the audit trail |

**A worked example**
- A person's work authorization prohibits unpaid work. An unpaid internship is checked: outcome Ineligible, with the restriction stated.
- The same person, checked for a paid internship: outcome Eligible.
- The rule that produced each outcome is recorded against the decision.

---

## 17. Expiry alerting and scheduled scans — specified, not built

**What is scanned**
| Item | Trigger |
|---|---|
| Visa validity | Approaching or past its end date |
| Work authorization validity | Approaching or past its end date |
| Time-limited documents, such as the US tax withholding form | Approaching or past its validity period |

**Thresholds**
- 90 days, 60 days, 30 days, 7 days, and on expiry.

**Rules**
| Rule | Detail |
|---|---|
| Frequency | The scan runs daily |
| Once per threshold | Each threshold alerts once per record. A second run on the same day does not resend |
| Re-runnable | Running the scan twice must be harmless. The alert already sent is not sent again |
| On expiry | A compliance exception is raised and dependent engagements are blocked |
| Recipients | The worker, and HR. Settled under Open Item 1 |
| Retry | A failed send must be retried. An alert must never be lost silently |
| Blocked by | Open Item 2 — no message delivery capability exists |

---

## 18. Tasks, goals, notes, summaries and handbook

**Goals**
| Rule | Detail |
|---|---|
| Set by | The team lead initially |
| Edited by | The team lead and the worker |
| Fields | Name, deadline, status — not started, in progress, completed |
| Visibility | The worker, their team lead, HR |
| Achieved goals | Retained and listed separately |

**Tasks — personal to-do list**
| Rule | Detail |
|---|---|
| Managed by | The worker, for themselves only |
| Visible to | The worker and HR. HR sees, and does not edit |
| Fields | Description, done or not done |

**Notes — notebook**
| Rule | Detail |
|---|---|
| Written by | The worker, for themselves |
| Grows | Without limit; never pruned during employment |

**Weekly summaries**
- Older documentation describes a weekly written summary by each worker, read by HR.
- No such feature exists in the implementation and no requirement covers it. Open Item 16 — a scope decision.

**Employee handbook**
| Rule | Detail |
|---|---|
| Contents | Company policy, written text with headings |
| Read by | Every tier |
| Edited by | Not in the product this release. Content is maintained alongside the code and published with it |
| Training | Referenced inside handbook policy text only. No training module exists. Open Item 14 |

---

## 19. Audit log — event catalogue

**Properties**
| Property | Rule |
|---|---|
| Append-only | Entries are never edited and never deleted, by any user, including founder. **Required, not yet enforced** |
| Contents | Actor, action summary, the value before, the value after, and a timestamp |
| Written with the change | An entry is written in the same operation as the change it records, so an unrecorded change is not possible |
| Retention | Retained beyond the worker retention period, as proof that deletion occurred |
| Visible to | HR and founder |

**Logged today**
| Event |
|---|
| Person added, edited or removed |
| Role added, edited or removed |
| Department added, edited or removed |
| Relationship added or removed |
| Structure reset |

**Required and not yet logged**
| Event | Why it is required |
|---|---|
| Sign-in attempts, successful and failed | Detecting attempted access |
| Employee profile changes | Who changed a person's record, and what it was before |
| Permission changes | Any change affecting what somebody can see |
| Document access and download | Who has looked at a passport or a bank proof |
| Immigration record changes | The most sensitive records in the system |
| Eligibility decisions and overrides | A decision must remain explainable, and an override attributable |
| Sensitive-data export | Who took data out of the system |
| Account activation, and every refused activation | The gate's operation must be reviewable |
| Retention deletion | Proof of what was deleted and when |

---

## 20. Notifications

| Rule | Detail |
|---|---|
| In-app | Notifications are records belonging to a person, shown on sign-in, with unread count |
| Triggers | Document approved; document rejected with reason; account activated; leave decided; review stage awaiting the person; expiry alert |
| Read state | Recorded per notification |
| Email | No capability exists. Open Item 2 |
| SMS and WhatsApp | Not in scope. No requirement exists anywhere in the project |

---

## 21. Data protection, encryption and retention

**Separation**
- Personal and immigration data are held apart from directory data, so an ordinary lookup does not expose sensitive fields.
- Date of birth, identifier numbers and immigration records are restricted beyond the ordinary record.

**Identifier-class fields — encryption required, not yet implemented**
| Field |
|---|
| National identifier numbers |
| Passport numbers |
| Visa document numbers |

**Document access**
- Documents are never served from a public path.
- Access is granted per request, for a short period, and recorded.

**Retention schedule**
| # | Event | Consequence |
|---|---|---|
| 1 | Exit recorded | The retention clock starts. Status becomes inactive |
| 2 | Retention period runs | Three years. All records and documents retained and reachable by HR |
| 3 | Retention period ends | Documents, personal data and banking data deleted |
| 4 | After deletion | Anonymised aggregates retained, so headcount and trend history survive. The audit log records that deletion occurred |

**Rules**
| Rule | Detail |
|---|---|
| Not implemented | Retention and deletion are specified and not built |
| Retention period | Three years after exit. Requires confirmation against the compliance position — Open Item 12 |
| Manual deletion | Not permitted outside the schedule this release |
| Legal hold | Not in scope. No mechanism blocks scheduled deletion |
| Compliance regimes | Undecided across India and US operations. Requires legal input — Open Item 12 |

---

## 22. Validation and error catalogue

**Principles**
| Principle | Detail |
|---|---|
| Fail closed | Where identity or storage fails, the action is refused. There is no permissive fallback |
| No partial writes | An operation either completes or leaves nothing behind |
| Never report false success | A failed write is never presented as saved |
| Preserve input | Where a save fails, what the user typed is not lost |
| Server-side | Every rule below is enforced on the server, whatever the interface does |

**Catalogue**
| # | Scenario | Rule | Response | Recovery |
|---|---|---|---|---|
| 1 | Duplicate email on create | One email identifies one worker; case-insensitive; both fields | Refused, naming the existing person, their type and stage | Different email, or confirm same person |
| 2 | Duplicate email on edit | As above, applied to edits | Refused; no change persists | As above |
| 3 | Email outside the company domain, at sign-in | Company domain required | Refused; no session | Use the company account |
| 4 | Unverified email address, at sign-in | Verified address required | Refused; no session | Verify with Google |
| 5 | Authenticated account matching no person | Must resolve to an organization-chart person | Refused with an explicit message; no default tier | HR adds the person |
| 6 | Unauthorized page request | Tier checked every request | Access-denied view; no restricted data in the response | Return to a permitted page |
| 7 | Unauthorized change | Authority re-checked every change | Refused, naming actor and tier; nothing partially applies | — |
| 8 | Activation with a mandatory document unapproved | All mandatory documents approved | Refused, stating the outstanding count; stage unchanged | Verify the outstanding documents |
| 9 | Concurrent activation attempts | Only one may succeed | The second is refused | — |
| 10 | Reporting cycle | No role reports to itself, directly or indirectly | Refused before commit, explaining the path | Choose a different relationship |
| 11 | Self-relationship | Refused | Refused | — |
| 12 | Duplicate relationship | Refused | Refused; count unchanged | — |
| 13 | Delete a department holding roles | Roles move to the company root | Confirmation required; roles preserved | — |
| 14 | Delete the company root | Refused | Refused | — |
| 15 | Unresolved name reference | Recorded as unresolved | Validation warning; never silently repointed | HR corrects it |
| 16 | Person renamed | Reaches every reference, including self-reference | All references updated | — |
| 17 | Unsupported file format | Only the formats in section 8 | Refused; nothing recorded | Upload an accepted format |
| 18 | File over the size limit | Limits per section 8 | Refused; nothing recorded | Upload a smaller file |
| 19 | File contents do not match the claimed format | Contents are checked, not the name | Refused | Upload a genuine file |
| 20 | Upload fails part-way | An upload failure must not mark an item submitted | The item stays outstanding | Retry |
| 21 | Rejection without a reason | A reason is required | Refused | Choose a reason |
| 22 | Review stage out of sequence | Self, team lead, HR, finalized | Refused until the prior stage completes | Complete the prior stage |
| 23 | Edit of a submitted review | Must be locked | **Not enforced — see section 14** | Create a superseding review |
| 24 | Leave end date before start date | Refused | Refused | Correct the dates |
| 25 | Overlapping approved leave | One day, one approved leave | Refused | Amend the request |
| 26 | Self-approval of leave | Refused | Refused | Another approver decides |
| 27 | Unpaid engagement against a restricting authorization | Refused where the authorization prohibits unpaid work | Ineligible, with the restriction stated | Offer paid work, or an authorised override |
| 28 | Override of a non-overridable rule | Refused regardless of tier | Refused | Escalate or change the terms |
| 29 | Override without a written reason or verification | Both required | Refused | Supply both |
| 30 | Incorrect or expired one-time code | Single use, short expiry, attempt limit, lockout | Refused; a new challenge required | Request a new code |
| 31 | Repeated one-time-code failures | Lockout | Locked out for a set period | Wait, then request a new code |
| 32 | Expired onboarding link | Seven-day validity | **Undefined — Open Item 9** | Undefined |
| 33 | Expired visa or authorization | Current authorization must cover the engagement | Compliance exception; dependent engagements blocked | Record a renewal |
| 34 | Expiry scan run twice in a day | Once per threshold per record | The second run sends nothing | — |
| 35 | Identity service unavailable | Fail closed | Sign-in blocked; no fallback | Retry |
| 36 | Storage unavailable | Fail closed | Upload refused; item stays outstanding | Retry |
| 37 | Message delivery fails | Must retry | Retried; repeated failure surfaced | — |
| 38 | Database unavailable | No partial writes | Failure surfaced; input preserved | Retry |
| 39 | A count disagrees with the list beneath it | Both derive from one filtered set | Cannot occur by construction | — |
| 40 | Gated action called directly, bypassing the interface | Every gate enforced on the server | Refused | — |

---

## 23. Acceptance test catalogue

The 20 scenarios in the Functional Specification are expanded below, with the additional per-module cases needed for coverage.

**Authentication and access**
| # | Scenario | Precondition | Pass criteria | Status |
|---|---|---|---|---|
| 1 | Sign in with a verified company account matching a person | The person exists in the chart | Session issued; dashboard loads at the derived tier | Not started |
| 2 | Sign in from outside the company domain | — | Refused; no session issued | Not started |
| 3 | Sign in with a company account matching no person | Account exists, person does not | Refused with an explicit message; no tier granted | Not started |
| 4 | Sign in with an unverified company address | — | Refused; no session | Not started |
| 5 | Employee requests an admin page directly by URL | Employee tier | Access-denied view; no restricted data anywhere in the response | Not started |
| 6 | HR role held only as a secondary position | Person holds a non-HR primary role and an HR secondary role | Tier resolves to HR; visible set is everyone | Not started |
| 7 | Every gated action called directly rather than through the interface | Employee tier | Every action refused on the server | Not started |
| 8 | Session behaviour after a worker is deactivated | Worker signed in, then deactivated | **Expected result undefined — Open Item 11** | Blocked |

**Employee management**
| # | Scenario | Precondition | Pass criteria | Status |
|---|---|---|---|---|
| 9 | Create a worker with an email already in use, in a different letter case | An existing worker holds that address | Refused, naming the existing person, their type and stage | Not started |
| 10 | Edit a worker's email to match another worker's | Two workers exist | Refused; no change persists | Not started |
| 11 | Create a worker whose personal email matches another's professional email | — | Refused — the rule spans both fields | Not started |
| 12 | Rename a person who is HR lead for others, including themselves | That person is their own HR lead | Every reference updates, self-reference included | Not started |
| 13 | Record a name matching nobody in a reference field | — | Recorded as unresolved; a warning is raised; not repointed | Not started |

**Organization structure**
| # | Scenario | Precondition | Pass criteria | Status |
|---|---|---|---|---|
| 14 | Delete a department containing roles | Department holds roles | Roles appear under the company root; none lost; confirmation was required | Not started |
| 15 | Delete the company root | — | Refused | Not started |
| 16 | Add a relationship creating a direct cycle | Two roles | Refused before commit, with an explanation | Not started |
| 17 | Add a relationship creating an indirect cycle through three roles | Three roles in a chain | Refused before commit, naming the path | Not started |
| 18 | Add a relationship identical to an existing one | Relationship exists | Refused; relationship count unchanged | Not started |
| 19 | Perform any structural change, then open the audit log | HR tier | Entry present with actor, summary, before and after, timestamp | Not started |
| 20 | Attempt to edit or delete an audit entry as founder | Founder tier | Refused. **Not enforced today — expected to fail** | Blocked |

**Onboarding and documents**
| # | Scenario | Precondition | Pass criteria | Status |
|---|---|---|---|---|
| 21 | Open a valid onboarding link with no account | Link issued within seven days | Checklist shown; no sign-in required | Not started |
| 22 | Open a link belonging to another candidate | Two candidates | Only that candidate's checklist is reachable | Not started |
| 23 | Checklist composition for each worker type and region | Types and regions configured | 6 to 12 items, correct per section 7 | Not started |
| 24 | Upload an unsupported format | — | Refused; nothing recorded | Not started |
| 25 | Upload a file over its size limit | — | Refused; nothing recorded | Not started |
| 26 | Upload a file whose contents contradict its extension | — | Refused | Not started |
| 27 | Upload interrupted part-way | — | The item stays outstanding, not submitted | Not started |
| 28 | Reject one item of several | Several items Pending | Only that item returns; approved items stay approved; the reason is shown | Not started |
| 29 | Reject without selecting a reason | — | Refused | Not started |
| 30 | Re-upload after rejection | Item rejected | Item returns to Pending; the previous version is retained | Not started |
| 31 | Open an expired onboarding link | Link older than seven days | **Expected result undefined — Open Item 9** | Blocked |
| 32 | Activate with one mandatory document unapproved | One mandatory item outstanding | Refused, stating the outstanding count; stage unchanged | Not started |
| 33 | Activate with all mandatory approved and optional outstanding | Optional items outstanding | Succeeds; stage becomes Active | Not started |
| 34 | Two people attempt activation simultaneously | — | One succeeds; the other is refused | Not started |

**Attendance and leave**
| # | Scenario | Precondition | Pass criteria | Status |
|---|---|---|---|---|
| 35 | Mark attendance twice for the same day | One record exists | The day holds one record, not two | Not started |
| 36 | Clock in without clocking out, then view the day | Open session | The session shows as running; duration is not fabricated | Not started |
| 37 | View attendance for a worker in a different time zone | Worker time zone differs from viewer's | Times shown unambiguously in the worker's time zone | Not started |
| 38 | Request leave with the end date before the start | — | Refused | Not started |
| 39 | Request leave overlapping existing approved leave | Approved leave exists | Refused | Not started |
| 40 | Approve one's own leave request | Requester is also an approver | Refused | Not started |
| 41 | Export attendance to CSV | Attendance recorded | File matches what the screen shows for the same filter | Not started |

**Performance**
| # | Scenario | Precondition | Pass criteria | Status |
|---|---|---|---|---|
| 42 | Team lead stage attempted before the self review exists | No self review | Refused | Not started |
| 43 | HR stage attempted before the team lead stage | No team lead review | Refused | Not started |
| 44 | Edit a submitted review | Review submitted | Refused. **Not enforced today — expected to fail** | Blocked |
| 45 | Supersede a submitted review | Review submitted | A new review is created; both remain visible; the audit trail shows each | Blocked |
| 46 | Route a team lead review with no reporting relationship recorded | Zero relationships | No route exists. **Blocked by Open Item 4** | Blocked |

**Immigration and eligibility**
| # | Scenario | Precondition | Pass criteria | Status |
|---|---|---|---|---|
| 47 | Unpaid internship where the authorization prohibits unpaid work | Authorization with that restriction | Ineligible, with the restriction stated | Blocked — not built |
| 48 | Paid internship for that same person | As above | Eligible | Blocked — not built |
| 49 | Override an ineligible outcome on an overridable rule, with reason and verification | Actor holds the permission | Onboarding proceeds; override, actor, reason and verification all appear in the audit trail | Blocked — not built |
| 50 | Override a non-overridable rule as founder | Rule marked non-overridable | Refused regardless of tier | Blocked — not built |
| 51 | Override without a written reason | — | Refused | Blocked — not built |
| 52 | Re-run a past decision after the rules have changed | Decision recorded, rules since amended | The original outcome and its reasons remain intact and explainable | Blocked — not built |
| 53 | Check eligibility where no rule matches | No matching rule | **Expected result undefined — Open Item 5** | Blocked |
| 54 | Supersede a visa record | Visa record exists | Both records retained; exactly one is current | Blocked — not built |
| 55 | Expiry scan run twice in one day for an authorization expiring in 30 days | Authorization expiring in 30 days | The 30-day alert sends once; the second run sends nothing | Blocked — not built |
| 56 | Engagement against an expired authorization | Authorization expired | Compliance exception raised; dependent engagements blocked | Blocked — not built |

**Cross-cutting**
| # | Scenario | Precondition | Pass criteria | Status |
|---|---|---|---|---|
| 57 | Compare every displayed count against the list beneath it | Any filtered view | They agree in every case | Not started |
| 58 | Interrupt a save with a database failure | — | Failure surfaced; nothing partially written; input preserved | Not started |
| 59 | Attempt to reach a document by a direct address | Document uploaded | Not reachable without a per-request grant | Not started |
| 60 | Retention deletion for a worker three years past exit | Exit recorded three years ago | Documents and personal data deleted; anonymised aggregates retained; deletion recorded in the audit log | Blocked — not built |

---

## 24. Non-functional requirements

| Area | Requirement |
|---|---|
| Scale | 34 to 50 workers this release. Nothing may be built in a way that breaks at 200 |
| Volume | Attendance and time sessions accumulate daily per worker and are never pruned during employment |
| Availability | Working-hours availability across India and US time zones. No formal target agreed |
| Response | A page a person uses daily should feel immediate. No formal target agreed |
| Recovery | Restore from backup must be tested, not assumed |
| Environments | Development, staging and production, kept identical |
| Accessibility | Keyboard reachable, screen-reader labelled, and legible contrast on every screen |
| Devices | Usable on a phone. Candidates upload documents from phones |
| Languages | English only this release |
| Data residency | Undecided. Depends on Open Item 12 |
| Auditability | Every sensitive action attributable to a person and a moment |

---

## 25. Recorded but not in scope

These appear in earlier project documentation. They are recorded here so nothing is lost, and are explicitly excluded from this release.

| Item | Where it came from | Status |
|---|---|---|
| Payroll processing | Earlier proposal | Not in scope. No feature exists |
| Contractor invoicing — submit, approve, pay | Earlier feature documentation | Not in scope. Open Item 15 asks whether it is still intended |
| Contracts, amendments and rate versioning | Earlier feature documentation | Not in scope. Open Item 15 |
| Contract renewal date tracking and renewal alerts | Earlier documentation described this as core | Not in scope. Open Item 16 — no requirement covers it |
| Multi-currency support | Earlier feature documentation | Not in scope. Follows payroll and invoicing |
| Payroll-system synchronisation | Earlier feature documentation | Not in scope |
| Recruitment-system worker creation by webhook | Earlier feature documentation | Not in scope. Workers are created by HR |
| Applicant tracking and recruitment pipeline | Earlier proposal | Not in scope |
| Training management | Referenced only inside handbook policy text | Not in scope. Open Item 14 |
| Litigation and legal hold | Earlier documentation | Not in scope. No mechanism blocks scheduled deletion |
| Weekly written summaries by each worker | Earlier documentation described this as core | Not in scope. Open Item 16 |
| Project assignment and tracking | Earlier feature documentation | Not in scope as a module. Goals and tasks cover the need this release |
| Automatic verification of documents after a set period | Earlier settings documentation | Not in scope. It contradicts verification by human judgement |
| Backup of documents to a shared drive | Earlier feature documentation | Superseded. Document storage is decided under Open Item 3 |
| Settings panel of 13 categories | Earlier feature documentation | Not in scope at that breadth. Settings this release cover only what the modules above require |
| Email, SMS and WhatsApp messaging | Earlier documentation, and absent from all requirements | Email is required and not built — Open Item 2. SMS and WhatsApp are not in scope |

---

## 26. Open items register

| # | Open item | Blocks | What a decision changes |
|---|---|---|---|
| 1 | Which role model is authoritative — the five roles requested, the four tiers implemented, or the Senior HR and HR split? Are Team Lead and Candidate real tiers? Does Intern remain distinct? | Access design, the permission matrix in section 2, and testing | The tier list, every row of the permission matrix, and who approves leave and reviews |
| 2 | Is the "no automations, no emails" principle retired? | One-time codes, step-up verification, expiry alerting, and sending the onboarding link | Whether sections 3, 17 and 20 can be built at all |
| 3 | Where do documents live — a shared drive, or storage the product controls? | Document upload. No file is stored today | Sections 8, 9 and 21, and whether document access can be recorded |
| 4 | Is the manager relationship the team-lead field or the organization-chart relationship? Who authors the missing relationships, and by when? | The Team Lead tier, manager-scoped visibility, and review routing | Section 6, the team lead stage in section 14, and leave approval |
| 5 | When no eligibility rule matches, is the default allow or deny? | The eligibility engine's terminal case | One line of section 16, without which it cannot be built |
| 6 | May HR override eligibility decisions, or is that founder only? | The override permission | One row of the permission matrix |
| 7 | Are the implemented document requirements correct, and is the older list of Employee 5, Contractor 3, Intern 4 stale? | Confidence in section 7 | The checklist matrix |
| 8 | How do monthly reviews and 30, 60 and 90-day milestone reviews relate? | The review module's shape | Whether section 14 describes one cycle or two |
| 9 | What happens when an onboarding link expires — regenerate, extend or refuse? Who may reissue? | Onboarding recovery | Section 10, and test cases 31 and 32 |
| 10 | Are the real worker email addresses confirmed? | Sign-in | Whether identity resolution can move off naming convention |
| 11 | Does deactivating a worker revoke their session and block sign-in? | Offboarding security | Section 3, and test case 8 |
| 12 | Which compliance regimes apply across India and US operations? | Data residency, retention, and the scope of encryption | Sections 21 and 24 |
| 13 | Given nothing is deployed and must-have items are outstanding, what is the revised go-live date and MVP cut? | Release planning | Which sections are in the first release |
| 14 | Is training management in scope for any release? | — | Whether an additional module exists |
| 15 | Are contractor invoicing, contracts and amendments still intended? | — | Whether three modules return to scope |
| 16 | Weekly summaries and contract renewal tracking are described as core in older documentation but exist nowhere in code or requirements | — | Whether two features return to scope |
| 17 | When is the role parameter removed from the web address entirely? | Security sign-off | Section 2's enforcement rules |
| 18 | Is the unused "documents submitted" stage intended, or should it be removed? | — | Section 5's stage list |

---

## 27. Glossary

| Term | Meaning |
|---|---|
| Access tier | The level of access a signed-in person holds, computed from their organization-chart position on every request |
| Candidate | A person who has been issued an onboarding link but has no account |
| Checklist | The set of documents a particular worker must supply, built from their type, region and contractor mode |
| Company root | The top unit of the organization structure. It cannot be deleted |
| Contractor mode | A sub-classification of the Contractor worker type that branches the document checklist |
| Identifier-class field | A national identifier, passport or visa document number. Requires encryption and restricted access |
| Immutable input snapshot | A permanent copy of the inputs to an eligibility decision, so the decision stays explainable after rules change |
| Mandatory document | A checklist item that must be approved before an account can be created |
| Onboarding token | The single-purpose secret in a candidate's link. Valid seven days, revocable, reissuable |
| Optional document | A checklist item that never blocks account creation |
| Reporting relationship | A recorded link from one role to another — reports to, accountable to, or dotted line |
| Role | A position in the organization chart, held by one person or vacant |
| Stage | Where a worker sits in the lifecycle: Invited, Verifying, Verified, Active or Inactive |
| Step-up verification | An additional check, by one-time code, required before a sensitive action |
| Superseded record | A record replaced by a newer one, with both retained. Used for visa records, work authorizations and reviews |
| Unresolved reference | A name in a reference field matching no person. Surfaced as a warning, never silently repointed |
| Visible-person scope | The set of people a signed-in person may see, computed from their organization-chart position |
