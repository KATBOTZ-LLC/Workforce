# Technology Stack — Workforce Platform

## Document control

| Field | Detail |
|---|---|
| Project / Initiative | Workforce — Employee & Organization Management Platform |
| Business area | Human Resources / People Operations — KATBOTZ (India and US operations) |
| Object / Work item | WF-001 — Workforce Platform |
| Document | Technology Stack — Revised |
| Companion document | Functional Specification, WF-001, version 1.2, dated 27 August 2026 |
| Replaces | The technology stack described in the original system architecture note, which specified a Firestore database |
| Owner | To be assigned |
| Technical owner | To be assigned |
| Version / Date | Revised — 31 August 2026 |
| Status | For technical review and approval |

---

## 1. Purpose of this document

This document specifies every technology to be used in building the Workforce Platform, and the reason each one was chosen. It is a complete list — nothing needed to build, run, secure or operate the platform is omitted, and no item requires the reader to consult another document to understand why it is there.

The selection principle throughout: each component is the best available option for its job, is mature and well supported, and provides capability ready-made rather than something that would have to be built and then maintained by KATBOTZ.

The platform is a web application serving four groups of people — the founder, HR staff, managers and workers — across eight functional areas: authentication and access, employee management, organization structure, onboarding and documents, attendance and leave, performance reviews, tasks and notes, and immigration and eligibility. Expected scale for this release is 34 to 50 workers.

One cloud provider, one backend language, one frontend framework. Deliberately simple to staff, to run, and to hand over.

---

## 2. The stack

| # | Layer | Component | Technology | Why this one |
|---|---|---|---|---|
| 1 | Frontend | Framework | Next.js | Best framework available for an application like this. Routing, page structure, server rendering, image handling and build tooling all come with it, so none of that is written by us. Separate portals for founder, HR, manager and worker, and mobile responsiveness, come from the framework rather than from custom work |
| 2 | Frontend | UI library | React | A JavaScript library with the largest component ecosystem available. Everything from date pickers to tables already exists as a React component, so we assemble the interface from proven pieces instead of creating everything from scratch. Best available and the easiest to hire for |
| 3 | Frontend | Component library | shadcn/ui on Radix | Accessible dialogs, comboboxes, date pickers and menus are each days of work to get right, and getting them wrong shows immediately. These are the current best answer, and they are copied into our own codebase rather than installed, so we own them and can modify them |
| 4 | Frontend | Language | TypeScript | Catches mistakes while the code is being written rather than in production, documents the code as a side effect, and keeps it readable for whoever inherits it |
| 5 | Frontend | Styling | Tailwind CSS | A ready-made styling system with a design system already in it, so every screen stays consistent without a custom stylesheet of our own to write and maintain |
| 6 | Frontend | Data fetching | TanStack Query | Handles loading, caching and refreshing automatically. When HR approves a document, every count and list that depends on it updates without us wiring each one by hand — work that every application otherwise reimplements, usually badly |
| 7 | Frontend | Forms and validation | React Hook Form + Zod | This product is largely data entry, so form handling and validation are taken off the shelf rather than written. Covers every form inside the portal: HR entering worker records, the candidate document checklist, leave requests, performance reviews and goals. These forms write directly to the database and enforce business rules as they go, which is why an external form tool such as Google Forms cannot serve this purpose |
| 8 | Frontend | Tables | TanStack Table | The worker directory, the document verification queue, and the attendance and leave lists all need sorting, filtering and paging. Works together with shadcn/ui, so tables match the rest of the product |
| 9 | Frontend | Dates and time zones | date-fns + date-fns-tz | Operations span India and the United States, each worker record carries a time zone, and attendance and clock in and out are timestamps. Time zone arithmetic written by hand is reliably wrong, and the errors are the kind nobody notices until they affect somebody's pay |
| 10 | Frontend | Handbook content | MDX files held with the code | The employee handbook is written text with headings and links that changes a few times a year. Keeping it as files means it is versioned and reviewable alongside everything else, and no editing tool has to be built. If HR later needs to edit it inside the product, a rich-text editor is added at that point |
| 11 | Frontend | Icons and fonts | Lucide + Google Fonts | Free, complete, and actively maintained |
| 12 | Backend | Framework | FastAPI | Quick to build with, handles many requests at once, and writes its own API documentation directly from the code, so the frontend and backend cannot drift apart unnoticed |
| 13 | Backend | Language | Python | Best suited to business rules, workflow and integration logic, with a very large talent pool and straightforward to hand over |
| 14 | Backend | Data validation | Pydantic | One definition of every field, reused for checking incoming requests, shaping responses and producing the API documentation, so validation is never scattered through the code in several places that can disagree |
| 15 | Backend | Sign-in verification | Google authentication library | Google's own library confirms that a sign-in is genuine, that the account belongs to the company, and that the email address has been verified. This is security-critical code and not something to write by hand |
| 16 | Backend | Sessions | Signed session cookie | Standard and well understood. The cookie identifies the person only. Their access level is worked out fresh from the organization chart on every single request, so a stale or stolen cookie cannot carry elevated permissions, and nothing sensitive is stored in the browser |
| 17 | Backend | Onboarding links | Randomly generated single-purpose tokens | Each candidate gets their own link, valid for seven days. Because the token is generated and stored by us rather than being self-contained, a link can be cancelled or reissued at any time — which a self-contained token could not support |
| 18 | Backend | Email composition | react-email | Sending email and writing email are separate problems. Onboarding invitations, document rejection reasons with the stated reason, one-time verification codes and document expiry alerts are all templates, built as components and rendered into email that displays correctly across mail applications |
| 19 | Backend | Rate limiting | Request limits held in the database | The onboarding link is reachable by anyone who has it, and one-time verification codes must be single use, expire quickly, limit the number of attempts and lock the account out after repeated failures. The counters live in the database, so there is nothing additional to run at this size |
| 20 | Backend | Logging | Structured logging | Logs are written in a machine-readable form carrying who acted, what they changed and when, so questions about who did what remain answerable months later |
| 21 | Database | Database | PostgreSQL | The most capable open-source SQL database available. Free, proven at every scale, and supported by every cloud provider, so there is no lock-in. The platform's data is highly connected — workers, their documents, their roles, their reporting lines, their attendance — and PostgreSQL handles connected data, reliable transactions and reporting without needing anything added to it |
| 22 | Database | Hosting | Google Cloud SQL for PostgreSQL, smallest instance, no standby | Managed for us: backups, patching and restore points are the platform's responsibility, not ours. Started on the smallest instance with no standby copy, because at 34 to 50 workers the cost of standing redundancy outweighs the risk it removes. Both instance size and redundancy are settings that can be raised later without changing anything else |
| 23 | Database | Access from code | SQLAlchemy | The standard way to work with a SQL database from Python. Removes the hand-written query plumbing while leaving the actual database behaviour visible and controllable |
| 24 | Database | Schema changes | Alembic | Every change to the database structure is a versioned, reviewable file kept with the code, and can be undone. Replaces changes applied by hand and recorded nowhere |
| 25 | Database | Backups | Automated daily backups with point-in-time restore | Included with the managed database service, so the effort goes into testing that a restore actually works rather than into building the backup |
| 26 | Database | Search | PostgreSQL's built-in search | Searching people and the directory by name is already possible inside the database, including tolerance for near-misses and misspellings, so no separate search product is needed |
| 27 | Database | Encryption of identifier fields | Encryption applied by the application, using a key held in Google Cloud Key Management | The database already encrypts its own storage, which protects against a stolen disk but not against data leaking out through the application. National identifier numbers, passport numbers and visa document numbers are therefore encrypted by the application itself, with the key held and rotated by Google rather than managed by us |
| 28 | Documents | Store | Google Cloud Storage | Purpose-built for holding documents securely, cheaply and durably. There are no file servers for us to run or patch |
| 29 | Documents | Upload and download | Time-limited secure links issued per request | Google issues a link that works for a few minutes only. Documents therefore never sit at a public address, uploads go straight from the candidate's browser to storage without passing through the application, and no file-serving code is written by us. The moment a link is issued is also the point at which the access is recorded |
| 30 | Documents | Malware scanning | ClamAV, run as a Google Cloud Run job | Candidates upload files through a public link without an account, and HR staff then open what arrives. Each file is held in quarantine until it passes the scan, and only then becomes available for verification, so nothing unchecked ever reaches a member of staff |
| 31 | Documents | Accepted file types | Format and size checked against the file's actual contents | The file type claimed by the uploader is not trusted. Only document and image formats are accepted, within a size limit, verified by inspecting the contents rather than the file name |
| 32 | Documents | Protection against loss | Storage bucket held in two regions | Once uploaded, these are the only copies of people's passports, degrees and bank proofs. Google keeps copies in two separate regions automatically, so the failure of one region loses nothing, and there is no backup job of our own to write, run or monitor |
| 33 | Documents | Retention and deletion | Storage lifecycle rules | Documents are deleted three years after a worker leaves. The rule is configured once and applied by the storage platform automatically, so deletion does not depend on somebody remembering |
| 34 | Documents | Version history | Object versioning | Where a document is rejected and uploaded again, the previous copy is retained for the period in which it might be queried. This requires no effort beyond enabling it |
| 35 | Sign-in and access | Sign-in | Google sign-in (OAuth) | Every member of staff already has a company Google account, so there is no password system for KATBOTZ to build, store, reset or secure, and no separate credential for anyone to lose |
| 36 | Sign-in and access | Company restriction | Google domain and verified-address check | Google confirms both that the account belongs to the company's own domain and that the address has been verified. Accounts outside the company are refused at sign-in |
| 37 | Sign-in and access | Access levels | Worked out from the organization chart on every request | The organization chart is the single source of truth. Nobody's access level is typed in or stored separately, nothing is assigned by hand, and nothing is accepted from the browser — which removes the previous arrangement where access was determined by a value in the web address that any user could edit |
| 38 | Sign-in and access | Additional verification for sensitive actions | One-time codes sent by email | Required before sensitive actions such as overriding an eligibility decision. Familiar to users, and needs no additional application or device on anyone's phone |
| 39 | Background work | Scheduled checks | Google Cloud Scheduler with Cloud Run jobs | The daily check for expiring visas, work authorizations and documents runs on a timetable and then stops, so nothing is left running and being paid for in between |
| 40 | Background work | Retries | Google Cloud Tasks | Anything that fails to send is retried automatically, with anything that repeatedly fails set aside for attention. Expiry alerts and verification codes must not be lost silently, and retry logic is easy to get wrong when written by hand |
| 41 | Background work | Email delivery | Resend | Sends reliably and reports back what was delivered and what bounced, so a verification code that never arrived becomes a recorded fact rather than a mystery. Building email delivery in-house is a poor use of time and produces worse results |
| 42 | Background work | In-app notifications | Held in the database | Notifications are simply records belonging to a person, so nothing additional is needed to store or deliver them |
| 43 | Hosting | Application hosting | Google Cloud Run | Runs the application in containers, scales up and down on its own, and has no servers for us to patch. The application itself costs nothing while nobody is using it, though the database is billed continuously regardless |
| 44 | Hosting | Public traffic protection | Google Cloud Armor | Sits in front of the publicly reachable pages — sign-in and candidate document upload — and blocks abusive or automated traffic before it reaches the application |
| 45 | Hosting | Secrets and keys | Google Secret Manager with Cloud Key Management | Database credentials, sign-in credentials and encryption keys are held outside the code, with access granted individually and every use recorded |
| 46 | Hosting | Domain | workforce.katbotz.com | A separate address from the main website, so the platform is unaffected by whatever the marketing site is built on, while remaining recognisably KATBOTZ |
| 47 | Hosting | Environments | Development, staging and production, kept identical | What is tested is what ships. Work is proven on staging against realistic data before it reaches the people using the system |
| 48 | Hosting | Region | Selected to match the data residency decision for India and US operations | Where data physically sits becomes a configuration choice made at set-up, rather than something requiring the platform to be rebuilt once the legal position is confirmed |
| 49 | Monitoring | Logs | Google Cloud Logging | Included with the hosting and searchable without any additional set-up |
| 50 | Monitoring | Errors | Google Cloud Error Reporting | Groups repeated failures together and raises them, so problems surface before a user reports them |
| 51 | Monitoring | Performance | Google Cloud Monitoring | Shows what is slow, when, and under what load |
| 52 | Monitoring | Alerts | Alerts by email from the monitoring service | Raises the alarm if the daily expiry check fails to run, or if emails stop being delivered. Both of these fail silently and would otherwise be noticed only when somebody complains |
| 53 | Development | Code hosting | GitHub | Where the code, the review history and the record of every change live. Standard practice, and what any future technical owner will expect to be handed |
| 54 | Development | Automated testing and deployment | GitHub Actions | The most widely used option, free at this size, and it runs the tests and performs the deployment without manual steps that can be forgotten or done differently each time |
| 55 | Development | Testing | Vitest, Pytest and Playwright | Three standard tools covering the three kinds of testing needed: individual screens, the business rules, and automatically clicking through the whole application as a user would |
| 56 | Development | Local set-up | Docker | Every developer runs the same database and services as production on their own machine, so differences between environments are found immediately rather than after release |
| 57 | Development | Code quality checks | Ruff, mypy and ESLint | Run automatically on every change, catching mistakes and inconsistencies before a human review begins |

Every Google service named above sits within a single Google Cloud project, alongside the Google Workspace accounts already in use — one supplier, one bill, and one place where access is granted and withdrawn.

---

## 3. What changed from the earlier plan

| Area | Previously specified | Now specified | Reason for the change |
|---|---|---|---|
| Database | Firestore | PostgreSQL | The platform's data is highly connected — workers, documents, roles, reporting lines, attendance. A SQL database handles connected data and reporting far better, and enforces rules such as "one email address identifies one worker" in the database itself rather than relying on the application to remember |
| Documents | A file name recorded, with no file stored | Google Cloud Storage, held in two regions, scanned before use | Documents have to be stored, retrievable and protected. Recording a file name satisfies nothing the platform needs to do |
| Malware scanning | Not considered | ClamAV, run as a scheduled job | Files arrive from candidates who have no account, and staff open them. This was an unaddressed risk |
| Email | None | Resend, with automatic retries through Google Cloud Tasks | One-time verification codes and expiry alerts cannot function without the ability to send email |
| Scheduled work | Not defined | Google Cloud Scheduler with Cloud Run jobs | The daily check on expiring visas, authorizations and documents needs somewhere to run |
| Public traffic protection | Not considered | Google Cloud Armor | The sign-in and candidate upload pages are reachable by anyone, and had nothing in front of them |
| Rate limiting | Not defined | Request limits held in the database | The requirement for one-time codes to have an attempt limit and a lockout had nothing implementing it |
| Search | Left as an open question for later | PostgreSQL's built-in search | Removes both a decision and an additional product from the plan |
| Hosting | A developer's machine only | Google Cloud Run, with three environments | Nothing is currently deployed. This is what puts the platform online and keeps testing separate from live use |
| Database changes | Applied by hand, recorded nowhere | Alembic | Structural changes become reviewable, repeatable and reversible |
| Monitoring | Not defined | Google Cloud Logging, Monitoring and Error Reporting | Failures in the daily check and in email delivery are silent unless something is watching for them |

---

## 4. What must be in place before this stack can be used

None of the following is a technology choice. Each is an account, a credential or a piece of information that only KATBOTZ can provide, and each blocks a specific part of the platform until it exists.

| Prerequisite | What it unblocks | Who provides it |
|---|---|---|
| A Google Cloud project with billing enabled | Hosting, database, document storage, scheduled work, monitoring — that is, everything beyond a developer's machine | KATBOTZ, with a payment method |
| Google sign-in credentials for the platform | All sign-in. There is no alternative sign-in method and no fallback | KATBOTZ, in the Google Cloud console |
| Control of the workforce.katbotz.com address | Reaching the platform at its own address, and the certificate that secures it | KATBOTZ, at the domain registrar |
| A Resend account and a verified sending domain | Onboarding invitations, one-time verification codes, document rejection notices, expiry alerts | KATBOTZ |
| A GitHub organization and repository | Code hosting, review history, automated testing and deployment | KATBOTZ |
| Confirmed work email addresses for every worker | Sign-in. Accounts are currently matched by a naming convention, which is not sound enough to rely on in use | KATBOTZ HR |
| The reporting relationships between people | Manager-level access, manager-scoped visibility, and the routing of performance reviews. The organization chart currently records 34 people and 50 roles but no reporting relationships at all | KATBOTZ, with HR and the founder |
| A decision on which access levels exist | How access is configured. Three different sets of roles appear across the project documentation and they do not agree | KATBOTZ |
| The immigration and eligibility rules, per country | The eligibility check. The platform holds no legal knowledge of its own and no country's law is built into it — the rules are configuration, supplied and maintained by people with the relevant legal knowledge | KATBOTZ, with legal input |
| The data residency position for India and US operations | Which region the platform and its data are hosted in, and what the retention rules must be | KATBOTZ, with legal input |

---

## 5. Decisions recorded in this document

| Decision | Chosen | Alternatives considered and why they were not chosen |
|---|---|---|
| Cloud provider | Google Cloud | Amazon Web Services offers comparable services, but sign-in must use Google accounts, which staff already have. Keeping identity, hosting, database and storage under one supplier means one bill, one place to manage access, and no integration between clouds |
| Database | PostgreSQL, hosted as Google Cloud SQL | A document database such as Firestore was originally specified. It cannot enforce the relationships and rules this platform depends on, cannot join related records, and cannot produce the reporting required without additional products |
| Backend language | Python, with FastAPI | Building the entire platform in TypeScript with no separate backend would mean one language instead of two and fewer moving parts. Python is retained because no technical owner has yet been named, and this decision should be made in the light of who will maintain the platform. It is inexpensive to revisit early in the build and expensive later |
| Document storage | A storage bucket controlled by the platform | Google Drive was considered. Access to files in Drive is governed outside the platform, retention cannot be enforced automatically, and the platform cannot reliably record who viewed a document — all three of which are required |
| Candidate document collection | Built into the portal | Google Forms was considered, since a link could simply be sent out. It requires the person uploading to sign in with a Google account, which candidates do not have; a submission cannot be approved or rejected item by item; and one shared form address cannot expire or be reissued per candidate |
| Email delivery | A transactional email service | Sending through a Google Workspace mailbox was considered. It has sending limits, no reporting on what was delivered, and no dependable retry — and verification codes and expiry alerts must not be lost silently |
| Database redundancy | Smallest instance, no standby copy, added later if needed | Standing redundancy and a second read-only copy of the database were considered and rejected for this release. At 34 to 50 workers they would roughly double the running cost to remove a risk the platform does not yet carry. Both are settings that can be changed later |
| Document protection | Storage held in two regions | Relying on version history alone was considered. It recovers a file deleted by mistake but not the loss of a region, and these are the only copies of people's identity documents |
| Deliberately excluded | A separate cache, a message queue system, a separate search product, a container orchestration platform, a separate reporting database, and automatic reading of document contents | Each is standard at large scale and unjustified at 34 to 50 workers, where they would add cost, moving parts and things to operate without improving the platform. Documents are verified by human judgement, which is a deliberate decision recorded in the functional specification, so automatic extraction of their contents is not required |

---

## 6. Approval

| Role | Name | Decision | Date |
|---|---|---|---|
| Functional owner | To be assigned | Pending | |
| Technical owner | To be assigned | Pending | |
| HR / Process owner | To be assigned | Pending | |
| Security / Compliance | To be assigned | Pending | |
| Project sponsor | To be assigned | Pending | |
