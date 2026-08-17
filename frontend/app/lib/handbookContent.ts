/**
 * KATBOTZ Global Employee Handbook — content source.
 *
 * Version 2026.3 | Issued July 2026 | Effective upon Board Approval
 * CONFIDENTIAL — FOR INTERNAL EMPLOYEE USE ONLY.
 *
 * Content is kept as structured data (not JSX) so HR can revise policy text
 * without touching the renderer. `**bold**` is supported inside any `text`.
 */

/** Signed PDF of this handbook, served from /public. */
export const HANDBOOK_PDF = '/KATBOTZ_Global_Employee_Handbook_2026.pdf'
export const HANDBOOK_VERSION = 'Version 2026.3'
export const HANDBOOK_ISSUED = 'Issued July 2026 · Effective upon Board Approval'

export type Block =
  | { t: 'p'; text: string }
  | { t: 'h'; text: string }
  | { t: 'ul'; items: string[] }
  | { t: 'ol'; items: string[] }
  | { t: 'table'; head: string[]; rows: string[][] }
  | { t: 'note'; text: string }
  | { t: 'formula'; lines: string[] }
  | { t: 'check'; items: string[] }
  | { t: 'sign'; fields: string[] }

export type Chapter = {
  id: string
  /** Short label shown in the contents rail, e.g. "Ch 7" or "US-2". */
  num: string
  title: string
  blocks: Block[]
}

export type Scope = 'global' | 'us' | 'india' | 'appendix'

export type Part = {
  id: string
  label: string
  title: string
  scope: Scope
  chapters: Chapter[]
}

export const SCOPE_LABELS: Record<Scope, string> = {
  global: 'Global Core',
  us: 'United States',
  india: 'India',
  appendix: 'Appendices',
}

export const HANDBOOK: Part[] = [
  // ───────────────────────────────────────────────────────────── Preamble
  {
    id: 'preamble',
    label: 'Preamble',
    title: 'About This Handbook',
    scope: 'global',
    chapters: [
      {
        id: 'preamble-scope',
        num: 'P.1',
        title: 'Purpose & Scope',
        blocks: [
          {
            t: 'p',
            text: 'This Handbook establishes KATBOTZ’s global employment standards and country-specific requirements for **KATBOTZ LLC** (employees working in the United States) and **KATBOTZ India Private Limited** (employees working in India).',
          },
          { t: 'p', text: 'This Handbook must be read together with:' },
          {
            t: 'ol',
            items: [
              'The employee’s signed offer letter and employment agreement;',
              'Any confidentiality, invention-assignment, or non-disclosure agreement;',
              'Benefit-plan documents and summary plan descriptions;',
              'Client-specific requirements and statements of work;',
              'The applicable Country or State Addendum based on the employee’s approved work location.',
            ],
          },
        ],
      },
      {
        id: 'preamble-hierarchy',
        num: 'P.2',
        title: 'Policy Hierarchy & Interpretation',
        blocks: [
          {
            t: 'p',
            text: 'To prevent contradictions and establish a clear rule for interpreting overlapping employment documents, the following order of precedence applies:',
          },
          {
            t: 'table',
            head: ['Priority', 'Document Type', 'Override Authority'],
            rows: [
              ['1', 'Mandatory applicable law (federal, state, local, or central)', 'Absolute — cannot be contracted away'],
              ['2', 'Signed individual employment agreement or offer letter', 'Binding on parties'],
              ['3', 'Applicable Country or State Addendum', 'Supplements Global Core'],
              ['4', 'Global Core Policies (Part I)', 'Baseline standard'],
              ['5', 'Operating procedures, manager instructions, or internal guidance', 'Subordinate to all above'],
            ],
          },
          { t: 'h', text: 'Key Principles' },
          {
            t: 'ul',
            items: [
              'A more specific provision controls over a general provision.',
              'A policy that provides a legally permissible, more favorable employee benefit may apply without amending the employment agreement, unless the agreement expressly requires a signed amendment.',
              'No manager may orally amend a signed agreement, guarantee continued employment, guarantee a bonus, waive a statutory requirement, or authorize an exception to confidentiality, information security, payroll, or client controls unless the manager has written authority signed by the CEO to do so.',
            ],
          },
        ],
      },
      {
        id: 'preamble-relationship',
        num: 'P.3',
        title: 'Employment Relationship Disclaimer',
        blocks: [
          {
            t: 'table',
            head: ['Jurisdiction', 'Nature of Employment'],
            rows: [
              [
                'United States',
                'Employment is at-will unless a written agreement signed by the CEO expressly provides otherwise. Either party may end the relationship at any time, with or without cause and with or without notice, subject to applicable law.',
              ],
              [
                'India',
                'Employment is governed by the signed fixed-term or permanent contract, including probation, contractual notice requirements, and applicable Indian labour law. The Handbook does not create tenure or a fixed-term guarantee unless a signed document expressly states otherwise.',
              ],
            ],
          },
        ],
      },
      {
        id: 'preamble-questions',
        num: 'P.4',
        title: 'Questions & Reporting',
        blocks: [
          {
            t: 'ul',
            items: [
              'General HR, leave, payroll, or grievance: **peopleops@katbotz.com**',
              'Security, privacy, phishing, lost device, or data incident: **security@katbotz.com** and your Reporting Manager',
              'POSH complaint (India): Designated Internal Committee / HR',
              'Harassment or discrimination (US): HR, any manager, or applicable government agency',
              'Financial control concern: Finance and Reporting Manager',
            ],
          },
        ],
      },
    ],
  },

  // ───────────────────────────────────────────────── Part I — Global Core
  {
    id: 'part-1',
    label: 'Part I',
    title: 'Global Core Policies',
    scope: 'global',
    chapters: [
      {
        id: 'ch-1',
        num: 'Ch 1',
        title: 'Mission, Values & Professional Standards',
        blocks: [
          { t: 'h', text: 'Purpose' },
          {
            t: 'p',
            text: 'To define the common values and behavioral standards that guide KATBOTZ’s consulting, technology, education, and talent operations.',
          },
          { t: 'h', text: 'Scope' },
          { t: 'p', text: 'All employees, managers, officers, interns, and any contractor expressly made subject to this policy.' },
          { t: 'h', text: 'Mission' },
          {
            t: 'p',
            text: 'Unlock the potential of our people and customers through innovative services and solutions, while treating individuals fairly, respectfully, and equitably.',
          },
          { t: 'h', text: 'Core Values' },
          {
            t: 'table',
            head: ['Value', 'Standard'],
            rows: [
              ['Integrity', 'Act honestly, maintain accurate records, disclose conflicts, and protect Company and client interests.'],
              ['Excellence', 'Deliver technically sound, timely, documented, and client-ready work.'],
              ['Collaboration', 'Communicate respectfully, share knowledge, and resolve disagreements professionally.'],
              ['Innovation', 'Use technology, AI, automation, and structured problem-solving responsibly.'],
              ['Accountability', 'Own commitments, report risks early, and correct errors promptly.'],
              ['Respect', 'Maintain a workplace free from discrimination, harassment, bullying, retaliation, and intimidation.'],
            ],
          },
          { t: 'h', text: 'Conduct Requirements' },
          {
            t: 'ul',
            items: [
              'Comply with lawful and reasonable instructions;',
              'Maintain professional responsiveness;',
              'Avoid conduct that damages client trust, Company reputation, workplace safety, or team effectiveness.',
            ],
          },
          { t: 'h', text: 'Compliance' },
          {
            t: 'p',
            text: 'Violations may result in coaching, corrective action, reassignment, suspension of access, removal from a client project, or termination, subject to the applicable Country Addendum and law.',
          },
        ],
      },
      {
        id: 'ch-2',
        num: 'Ch 2',
        title: 'Equal Opportunity, Anti-Harassment & Accommodation',
        blocks: [
          { t: 'h', text: 'Purpose' },
          {
            t: 'p',
            text: 'To provide a respectful and inclusive workplace and a consistent process for requesting legally required accommodations.',
          },
          { t: 'h', text: 'Scope' },
          {
            t: 'p',
            text: 'All applicants and employees, including remote employees and individuals working at client locations or through digital collaboration channels.',
          },
          { t: 'h', text: 'A. Non-Discrimination & Anti-Harassment' },
          {
            t: 'p',
            text: 'KATBOTZ prohibits unlawful discrimination, harassment, and retaliation based on any characteristic protected by applicable law. Country and state addenda identify additional protected categories and required complaint procedures.',
          },
          { t: 'p', text: 'Harassment includes unwelcome verbal, visual, physical, digital, or written conduct that:' },
          {
            t: 'ul',
            items: [
              'Creates an intimidating, hostile, humiliating, or offensive work environment;',
              'Interferes with work; or',
              'Is used as a basis for an employment decision.',
            ],
          },
          { t: 'h', text: 'B. Reasonable Accommodation' },
          {
            t: 'p',
            text: 'Employees may request a reasonable accommodation for disability, pregnancy, childbirth, related medical conditions, religion, lactation, or another legally protected need by contacting HR or their Reporting Manager.',
          },
          {
            t: 'p',
            text: 'The Company will engage in an interactive process and maintain medical information separately and confidentially.',
          },
          {
            t: 'note',
            text: 'Managers must not independently deny an accommodation request, demand unnecessary medical details, retaliate, or disclose confidential medical information. Requests must be referred to HR.',
          },
          { t: 'h', text: 'Compliance' },
          { t: 'p', text: 'Reports will be assessed promptly, impartially, and as confidentially as reasonably possible. Good-faith reporting, participation in an investigation, and lawful requests for accommodation are protected from retaliation.' },
        ],
      },
      {
        id: 'ch-3',
        num: 'Ch 3',
        title: 'Ethics, Anti-Bribery, Gifts & Conflicts',
        blocks: [
          { t: 'h', text: 'Purpose' },
          {
            t: 'p',
            text: 'To protect KATBOTZ and its clients from fraud, corruption, divided loyalty, unauthorized commitments, and financial or reputational harm.',
          },
          { t: 'h', text: 'Scope' },
          { t: 'p', text: 'All employees and anyone acting on behalf of KATBOTZ.' },
          { t: 'h', text: 'A. Anti-Bribery' },
          {
            t: 'p',
            text: 'Employees must not offer, promise, authorize, request, or accept bribes, kickbacks, facilitation payments, undisclosed referral fees, or anything of value intended to improperly influence a decision.',
          },
          { t: 'h', text: 'B. Gifts & Hospitality' },
          {
            t: 'p',
            text: 'Gifts, entertainment, travel, or hospitality must be lawful, modest, transparent, infrequent, and consistent with client rules.',
          },
          {
            t: 'table',
            head: ['Jurisdiction', 'Approval Threshold'],
            rows: [
              ['India', 'Written approval required for any business gift or courtesy above INR 1,000'],
              ['United States', 'Follow applicable client rule or written Finance limit, whichever is stricter'],
            ],
          },
          { t: 'h', text: 'C. Conflicts of Interest' },
          { t: 'p', text: 'Actual, potential, and perceived conflicts must be disclosed promptly. Examples include:' },
          {
            t: 'ul',
            items: [
              'Outside work for a client or competitor;',
              'Financial interests in vendors;',
              'Family involvement in hiring or procurement;',
              'Personal use of business opportunities;',
              'Accepting compensation from a party connected to Company work.',
            ],
          },
          { t: 'h', text: 'D. Authority Limitations' },
          {
            t: 'p',
            text: 'No employee may bind the Company, sign a contract, approve pricing, make an investment decision, hire a vendor, promise compensation, or make a public legal commitment without written authority for that specific action.',
          },
          { t: 'h', text: 'Compliance' },
          {
            t: 'p',
            text: 'Suspected bribery, fraud, falsification, unauthorized commitments, or conflicts must be reported to HR, Finance, or the CEO. Retaliation against good-faith reporting is prohibited.',
          },
        ],
      },
      {
        id: 'ch-4',
        num: 'Ch 4',
        title: 'Employment Classification & Onboarding',
        blocks: [
          { t: 'h', text: 'Purpose' },
          { t: 'p', text: 'To ensure accurate worker classification, lawful onboarding, and reliable employment records.' },
          { t: 'h', text: 'Scope' },
          { t: 'p', text: 'All employees and managers involved in hiring, onboarding, payroll, immigration, or personnel administration.' },
          { t: 'h', text: 'A. Classification' },
          {
            t: 'p',
            text: 'An individual’s status (employee, contractor, intern, exempt, nonexempt, full-time, part-time, temporary, or fixed-term) is determined by the employing entity and applicable law — **not by job title alone**.',
          },
          { t: 'h', text: 'B. Information Accuracy' },
          {
            t: 'p',
            text: 'Employees must provide truthful, complete, and timely identity, tax, bank, qualification, work-authorization, address, and emergency-contact information. Material misrepresentation may result in withdrawal of an offer or disciplinary action, subject to law.',
          },
          { t: 'h', text: 'C. Job Descriptions & Changes' },
          {
            t: 'ul',
            items: [
              'Job descriptions are operating guides and may be reasonably updated based on business or client needs.',
              'A material change to compensation, legal classification, employing entity, or contractual notice terms requires appropriate written documentation.',
            ],
          },
          { t: 'h', text: 'D. Updates' },
          { t: 'p', text: 'Employees must update HR promptly after changes to:' },
          {
            t: 'ul',
            items: [
              'Legal name, address, work location, tax status, immigration status;',
              'Bank details, emergency contacts, or other information required for payroll or compliance.',
            ],
          },
          { t: 'h', text: 'Compliance' },
          {
            t: 'p',
            text: 'HR will maintain personnel and medical records with role-based access, retention controls, and confidentiality appropriate to the jurisdiction and record type.',
          },
        ],
      },
      {
        id: 'ch-5',
        num: 'Ch 5',
        title: 'Client Project Cadence & Engagement Protocols',
        blocks: [
          { t: 'h', text: 'Purpose' },
          {
            t: 'p',
            text: 'To establish predictable communication, identity, meeting, escalation, and delivery standards for client and internal work.',
          },
          { t: 'h', text: 'Scope' },
          {
            t: 'p',
            text: 'All employees assigned to client delivery, internal initiatives, presales, support, implementation, or project-management work.',
          },
          { t: 'h', text: 'A. Identity & Account Provisioning' },
          {
            t: 'ul',
            items: [
              'Use official **@katbotz.com** account for Company work.',
              'Personal email accounts, shared credentials, and unapproved messaging platforms are prohibited for official business.',
              'Multi-factor authentication (MFA) must be enabled on all Company and client accounts.',
            ],
          },
          { t: 'h', text: 'B. Communication Channels' },
          {
            t: 'p',
            text: 'Employees must actively monitor assigned Google Chat spaces, email, Zoho Projects, client collaboration tools, and calendar invitations during scheduled working time. Material delivery risks, blockers, or absences must be communicated promptly rather than deferred to a weekly status meeting.',
          },
          { t: 'h', text: 'C. Meeting Protocols' },
          {
            t: 'table',
            head: ['Meeting Type', 'Attendance', 'Preparation & Conduct'],
            rows: [
              [
                'Client project meetings',
                'Mandatory for assigned resources unless excused',
                'Review agenda, update status, identify blockers, follow client confidentiality and recording rules.',
              ],
              [
                'Internal project / firm initiative meetings',
                'Mandatory when assigned; contractors only when required by SOW',
                'Review pre-read materials; arrive prepared to make decisions or complete assigned actions.',
              ],
              [
                'All-hands, compliance, security, and policy training',
                'Mandatory for employees unless HR approves an exception',
                'Attend full session, complete attestations, do not share recordings externally.',
              ],
              [
                'Optional knowledge sessions',
                'Voluntary unless designated as role-required',
                'Participate professionally; protect confidential or licensed content.',
              ],
            ],
          },
          { t: 'h', text: 'D. Client-Domain Operations' },
          { t: 'p', text: 'When a client provides an email account, device, virtual desktop, or repository:' },
          {
            t: 'ul',
            items: [
              'Use it solely for authorized client work;',
              'Comply with the client’s acceptable-use, retention, access, and security rules;',
              'Client credentials and data must never be transferred to personal systems.',
            ],
          },
          { t: 'h', text: 'E. Escalation Matrix' },
          {
            t: 'table',
            head: ['Level', 'Trigger', 'Action'],
            rows: [
              [
                'Level 1',
                'Any delivery risk or blocker',
                'Notify Global Functional Lead or Project Manager promptly with facts, impact, owner, and proposed next step.',
              ],
              [
                'Level 2',
                'Unresolved within 48 business hours OR material risk',
                'Escalate in writing to People Operations and the relevant delivery leader.',
              ],
              [
                'Level 3',
                'Legal, financial, data-security, client-relationship, safety, or regulatory risk',
                'Escalate immediately to the CEO or designated executive through People Operations.',
              ],
            ],
          },
          { t: 'h', text: 'Compliance' },
          {
            t: 'p',
            text: 'Repeated failure to attend required meetings, monitor official channels, follow escalation rules, or use approved identities may result in removal from the project and disciplinary action.',
          },
        ],
      },
      {
        id: 'ch-6',
        num: 'Ch 6',
        title: 'Remote Work, Approved Location & BYOD',
        blocks: [
          { t: 'h', text: 'Purpose' },
          { t: 'p', text: 'To enable distributed work while controlling security, tax, payroll, immigration, safety, and client risks.' },
          { t: 'h', text: 'Scope' },
          { t: 'p', text: 'All employees who work remotely or use a personal device for Company or client work.' },
          { t: 'h', text: 'A. Remote Work Fundamentals' },
          {
            t: 'p',
            text: 'Remote work is a work arrangement, not a waiver of performance, attendance, security, or location requirements. Employees must maintain a safe, private, reliable, and professional workspace with dependable internet access.',
          },
          { t: 'h', text: 'B. Approved Work Location' },
          {
            t: 'p',
            text: 'Employees may work only from the location approved by HR. A move to another US state, Indian state, or country requires **advance written approval** because it may create payroll, tax, immigration, insurance, permanent-establishment, data-transfer, or client-consent obligations.',
          },
          { t: 'h', text: 'C. Security Requirements (Mandatory)' },
          {
            t: 'ul',
            items: [
              'Full-disk encryption enabled;',
              'Current operating-system and application patches;',
              'Active endpoint protection;',
              'Screen lock of no more than 10 minutes;',
              'Strong unique passwords and multi-factor authentication;',
              'Company VPN or client-approved secure connection when required;',
              'Open or unsecured public Wi-Fi may not be used for Company or client work.',
            ],
          },
          { t: 'h', text: 'D. Data Handling' },
          { t: 'p', text: 'Company and client data may not be stored in:' },
          {
            t: 'ul',
            items: ['Personal cloud drives;', 'Personal email;', 'Unapproved USB devices;', 'Unapproved collaboration tools.'],
          },
          { t: 'h', text: 'E. Device Loss & Remote Wipe' },
          {
            t: 'p',
            text: 'Employees must report a lost, stolen, compromised, or inaccessible device immediately and cooperate with access suspension, remote corporate-data removal, and incident investigation.',
          },
          { t: 'h', text: 'F. BYOD Authorization' },
          {
            t: 'p',
            text: 'Use of a personal device authorizes KATBOTZ to remove Company-managed accounts, tokens, configurations, and Company/client data from that device upon separation, loss, breach, or security necessity. The Company will limit removal to business data and managed containers where technically feasible.',
          },
          { t: 'h', text: 'Compliance' },
          {
            t: 'p',
            text: 'IT may deny or revoke access to any device or location that does not meet security or legal requirements. Unauthorized cross-border work or concealment of work location may be treated as serious misconduct.',
          },
        ],
      },
      {
        id: 'ch-7',
        num: 'Ch 7',
        title: 'Working Time, Attendance & Zoho Timesheets',
        blocks: [
          { t: 'h', text: 'Purpose' },
          { t: 'p', text: 'To ensure lawful payroll, accurate client billing, reliable project management, and defensible audit records.' },
          { t: 'h', text: 'Scope' },
          { t: 'p', text: 'All employees and contractors required to record attendance, hours, activities, or project work.' },
          { t: 'h', text: 'A. General Attendance' },
          {
            t: 'p',
            text: 'Employees must be punctual, available during approved schedules and client-aligned windows, and responsive through official channels. An employee who cannot work must notify the Reporting Manager as soon as possible and follow the applicable leave process.',
          },
          { t: 'h', text: 'B. Zoho Projects — System of Record' },
          {
            t: 'p',
            text: 'Zoho Projects is the Company’s system of record for project time and daily work logs. Entries must be:',
          },
          {
            t: 'ul',
            items: [
              'Accurate and contemporaneous;',
              'Sufficiently detailed to identify the task, deliverable, configuration, meeting, or operational activity performed.',
            ],
          },
          { t: 'h', text: 'C. Time Entry Rules' },
          {
            t: 'ol',
            items: [
              'Record actual time worked; do not automatically enter a default eight-hour block.',
              'Separate client-billable, internal, administrative, learning, presales, and leave time under the correct project or activity code.',
              'Submit and review weekly timesheets by **Sunday at 12:00 PM IST** unless a different written deadline applies.',
              'Do not edit an approved entry without written approval from the Project Manager and Finance or Payroll.',
              'Never work off the clock, underreport hours, inflate billable hours, record another person’s time, or direct another employee to falsify records.',
            ],
          },
          { t: 'h', text: 'D. Overtime & Approval' },
          {
            t: 'p',
            text: 'Approval requirements control whether work may be assigned or whether unauthorized overtime may lead to discipline; they do not permit the Company to withhold legally required wages for time actually worked by a nonexempt employee.',
          },
          { t: 'h', text: 'Compliance' },
          {
            t: 'p',
            text: 'Falsification, off-the-clock work, repeated late submission, or intentional misallocation may result in corrective action, client removal, repayment or billing correction where lawful, and termination.',
          },
        ],
      },
      {
        id: 'ch-8',
        num: 'Ch 8',
        title: 'Compensation, Payroll, Expenses & Financial Controls',
        blocks: [
          { t: 'h', text: 'Purpose' },
          { t: 'p', text: 'To ensure accurate compensation, lawful deductions, disciplined spending, and separation of financial authority.' },
          { t: 'h', text: 'Scope' },
          {
            t: 'p',
            text: 'All employees and managers involved in payroll, time approval, expenses, purchasing, vendor engagement, or client billing.',
          },
          { t: 'h', text: 'A. Compensation Authority' },
          {
            t: 'p',
            text: 'Compensation is determined by the signed employment agreement, offer letter, approved compensation notice, and applicable law. A manager cannot change a rate, guarantee hours, promise a bonus, or approve a benefit without authorized written documentation.',
          },
          { t: 'h', text: 'B. Wage Statement Review' },
          {
            t: 'p',
            text: 'Employees must review wage statements and report discrepancies promptly. The contractual reporting period is **five days** after the payment date; HR and Payroll will still investigate later-reported issues and correct any legally required amount.',
          },
          { t: 'h', text: 'C. Expense Reimbursement' },
          {
            t: 'p',
            text: 'Only reasonable, necessary, documented, and pre-approved business expenses are reimbursable, except where advance approval was impracticable and reimbursement is required by law. Claims must be submitted within **30 calendar days** with itemized receipts.',
          },
          { t: 'p', text: 'Prohibited conduct:' },
          {
            t: 'ul',
            items: [
              'Splitting purchases to avoid approval limits;',
              'Committing the Company to a vendor;',
              'Approving one’s own expense;',
              'Altering receipts;',
              'Using client funds or Company accounts for personal purposes.',
            ],
          },
          { t: 'h', text: 'D. Payroll Deductions' },
          {
            t: 'p',
            text: 'Payroll deductions will be made only when required or permitted by law, court order, benefit election, signed authorization, or valid policy. Inadvertent improper deductions will be corrected promptly.',
          },
          { t: 'h', text: 'Compliance' },
          {
            t: 'p',
            text: 'Suspected payroll fraud, expense falsification, unauthorized vendor commitments, or improper deductions must be reported immediately to HR or Finance.',
          },
        ],
      },
      {
        id: 'ch-9',
        num: 'Ch 9',
        title: 'Global Leave & Absence Framework',
        blocks: [
          { t: 'h', text: 'Purpose' },
          {
            t: 'p',
            text: 'To provide a consistent leave-administration process while preserving country, state, and local entitlements.',
          },
          { t: 'h', text: 'Scope' },
          {
            t: 'p',
            text: 'All employees. Eligibility may differ by classification, probation status, service, work location, and applicable law.',
          },
          {
            t: 'table',
            head: ['Leave Category', 'Entitlement Framework', 'Administration'],
            rows: [
              [
                'Personal / Earned Leave',
                'US: 15 days PTO annually for eligible regular full-time employees, subject to accrual, proration, carryover limits, and state law. India: 12 days earned leave annually after confirmation, accrued monthly and prorated.',
                'Applicable Country Addendum and annual leave calendar control. PTO or earned leave may run concurrently with statutory leave where permitted.',
              ],
              [
                'Sick Leave',
                'US: Provided under applicable state/local law and Company policy; statutory balances are not reduced below legal requirements. India: 6 days annually after confirmation; medical certification may be required for more than two consecutive working days.',
                'Medical information must be submitted to HR, not broadly shared with managers or teams.',
              ],
              [
                'Casual Leave',
                'US: Not a separate category unless stated in a benefit plan. India: 7 days annually after confirmation for urgent personal matters; no carry-forward or encashment unless law requires.',
                'Advance notice where practicable; emergency notification as soon as possible.',
              ],
              [
                'Company & Public Holidays',
                'Five global core holidays may be designated annually. US employees generally receive 8–12 Company holidays; India employees generally receive 10–15 public/festival holidays based on work location and the annual calendar.',
                'The published annual calendar controls. Client-support employees may be assigned alternate days off.',
              ],
              [
                'Bereavement Leave',
                '3 paid working days for an immediate family member, subject to eligibility and reasonable documentation.',
                'Additional accrued leave or unpaid leave may be approved.',
              ],
              [
                'Jury / Witness Duty',
                'US: Protected and paid or unpaid as required by applicable law and policy. India: Not a standard leave category; court-required attendance will be administered under applicable law.',
                'Provide summons or subpoena where permitted.',
              ],
              [
                'Maternity / Parental Leave',
                'US: FMLA, state paid leave, disability, sick leave, and Company benefits as applicable. India: Statutory maternity benefit, including up to 26 weeks for eligible employees, plus other statutory protections.',
                'Country law and eligibility rules control; leave may run concurrently where permitted.',
              ],
              [
                'Voting & Civic Leave',
                'US: Provided where required by state/local law. India: Provided where required by election or other applicable law or Company approval.',
                'Employees should give reasonable advance notice.',
              ],
              [
                'Unpaid Leave',
                'May be approved after available paid leave is exhausted or where legally required.',
                'Approval is discretionary unless protected by law; benefit and reinstatement rules depend on the applicable leave.',
              ],
            ],
          },
          { t: 'h', text: 'A. Request Procedures' },
          {
            t: 'ul',
            items: [
              'Leave requests must be submitted through the designated HR system.',
              'Planned leave should ordinarily be requested at least **five business days** in advance.',
              'Emergency absence must be communicated to the Reporting Manager as soon as reasonably possible and entered in the HR system within 24 hours where practicable.',
            ],
          },
          { t: 'h', text: 'B. Manager Obligations' },
          { t: 'p', text: 'Managers must respond promptly and must not:' },
          { t: 'ul', items: ['Deny protected leave;', 'Retaliate for lawful use;', 'Demand confidential medical details.'] },
          { t: 'p', text: 'HR determines statutory eligibility and documentation.' },
          { t: 'h', text: 'C. Unauthorized Absence' },
          {
            t: 'p',
            text: 'Unauthorized absence, failure to communicate, or absence after denial may lead to loss of pay and discipline. Five consecutive scheduled working days without communication may be treated as potential job abandonment after reasonable contact attempts and legal review.',
          },
          { t: 'h', text: 'Compliance' },
          {
            t: 'p',
            text: 'The Country Addendum controls accrual, carryover, encashment, pay status, reinstatement, and documentation. Protected leave and accommodations will not be counted adversely in performance or utilization calculations.',
          },
        ],
      },
      {
        id: 'ch-10',
        num: 'Ch 10',
        title: 'Performance Management, Growth & Incentives',
        blocks: [
          { t: 'h', text: 'Purpose' },
          {
            t: 'p',
            text: 'To evaluate performance through a transparent, multi-factor framework rather than hours or subjective impressions alone.',
          },
          { t: 'h', text: 'Scope' },
          {
            t: 'p',
            text: 'Employees who are included in the KATBOTZ Performance Management and Growth Framework (KPGF). Contractors are covered only if their SOW expressly adopts it.',
          },
          {
            t: 'p',
            text: 'The KPGF is the Company’s unified performance appraisal system. Formal review cycles are conducted in **January and July**.',
          },
          { t: 'note', text: 'No employee is guaranteed a pay increase, promotion, or bonus merely because a review is completed.' },
          { t: 'h', text: 'A. Four-Pillar Scorecard' },
          {
            t: 'table',
            head: ['Pillar', 'Weight', 'What Is Evaluated'],
            rows: [
              [
                'Deliver',
                '40%',
                'Client satisfaction, quality of work, delivery against agreed goals, project outcomes, and utilization where applicable.',
              ],
              [
                'Build',
                '25%',
                'Contribution to internal initiatives, reusable assets and accelerators, recruiting support, and knowledge sharing.',
              ],
              [
                'Grow',
                '20%',
                'Professional certifications, applied AI capability, and measurable technical, functional, or leadership skill development.',
              ],
              [
                'Lead',
                '15%',
                'Integrity and Company values, communication, mentoring, teamwork, and operational discipline, including accurate timesheets.',
              ],
            ],
          },
          { t: 'h', text: 'B. Scoring & Performance Bands' },
          { t: 'p', text: 'Each sub-metric is rated on a 1.0 to 5.0 scale. The overall KPGF score is calculated as:' },
          { t: 'formula', lines: ['Overall KPGF Score = (Deliver × 40%) + (Build × 25%) + (Grow × 20%) + (Lead × 15%)'] },
          {
            t: 'table',
            head: ['Overall Score', 'Performance Band', 'Normal Outcome'],
            rows: [
              ['4.50 – 5.00', 'Outstanding', 'Highest consideration for an approved incentive, promotion, and leadership development.'],
              ['3.50 – 4.49', 'Exceeds Expectations', 'Above-standard consideration for an approved incentive and merit-based progression.'],
              ['3.00 – 3.49', 'Meets Expectations', 'Role continuation, standard incentive consideration, and agreed development goals.'],
              [
                'Below 3.00',
                'Below Expectations',
                '30–90 day performance improvement plan may be initiated. Incentive consideration may be withheld. Failure to improve may result in further action, up to and including termination, subject to applicable law and contract.',
              ],
            ],
          },
          { t: 'h', text: 'C. Utilization & Annual Capacity' },
          {
            t: 'p',
            text: 'Utilization is one input to performance and incentive evaluation. It is not the sole measure of performance and must not override quality, client satisfaction, security, conduct, leave protections, or lawful working-time requirements.',
          },
          {
            t: 'table',
            head: ['Capacity Measure', 'Benchmark'],
            rows: [
              ['Annual gross capacity at 100%', '2,080 hours (52 weeks × 40 hours)'],
              ['Standard workweek', '40 hours'],
              ['Standard working day', '8 hours'],
              ['Target utilization for all tiers', '95%'],
              ['Target utilized hours', '1,976 hours annually; 38 hours weekly; 7.6 hours per standard working day'],
            ],
          },
          { t: 'formula', lines: ['Utilization % = Approved utilization-eligible hours ÷ Adjusted capacity hours × 100%'] },
          {
            t: 'p',
            text: 'Adjusted capacity excludes: approved Company holidays, paid or protected leave, approved training, approved internal assignments, part-time schedules, mid-year joining or separation, and other exclusions approved by the Leadership Council.',
          },
          {
            t: 'note',
            text: 'The 95% target is an operating benchmark for all tiers, not permission to work unpaid hours or ignore rest, overtime, or leave requirements.',
          },
          { t: 'h', text: 'D. Review & Approval Process' },
          {
            t: 'ol',
            items: [
              '**Employee input:** Record achievements, evidence, development progress, and relevant context.',
              '**Manager review:** The Reporting Manager evaluates results, provides written comments, and proposes pillar scores.',
              '**Leadership Council calibration:** Reviews consistency, utilization context, client feedback, disciplinary or security matters, Company affordability, and role expectations.',
              '**People Operations record:** The approved outcome and development actions are documented in the performance tracker and employee record.',
            ],
          },
          { t: 'h', text: 'E. Discretionary Incentive Calculation' },
          { t: 'p', text: 'Where an employee is covered by an approved discretionary incentive pool, the indicative calculation is:' },
          {
            t: 'formula',
            lines: [
              'Score Realization % = Overall KPGF Score ÷ 5.0 × 100%',
              'Utilization Achievement % = Actual Utilization % ÷ 95%, capped at 100%',
              'Indicative Discretionary Payout = Approved Pool Base × Score Realization % × Utilization Achievement %',
            ],
          },
          { t: 'p', text: 'The final amount remains subject to:' },
          {
            t: 'ul',
            items: [
              'The applicable plan document;',
              'Company financial performance;',
              'Client realization;',
              'Cash flow;',
              'Individual eligibility;',
              'Statutory requirements;',
              'Written CEO approval.',
            ],
          },
          { t: 'note', text: 'No verbal statement creates a payment entitlement.' },
          { t: 'h', text: 'F. Incentive Hold Conditions' },
          {
            t: 'p',
            text: 'Incentive processing may be placed on hold at the close of a review cycle when an employee has:',
          },
          {
            t: 'ul',
            items: [
              'Unsubmitted, materially inaccurate, or unapproved Zoho Projects logs;',
              'An active disciplinary proceeding or unresolved formal warning;',
              'An unresolved data-security issue or open investigation into a suspected breach;',
              'Submitted a resignation notice (subject to the applicable incentive plan, employment agreement, and law).',
            ],
          },
          {
            t: 'p',
            text: 'A hold is not an automatic forfeiture. The Company will review the facts, applicable law, and written plan before making a final decision. Protected leave, accommodation requests, whistleblowing, and good-faith complaints must not be used adversely.',
          },
          { t: 'h', text: 'G. Performance Appraisal Tracker' },
          { t: 'p', text: 'The approved KPGF tracker is maintained as the central evidence and calibration record.' },
        ],
      },
      {
        id: 'ch-11',
        num: 'Ch 11',
        title: 'Confidentiality, IP, Work Product & Records',
        blocks: [
          { t: 'h', text: 'Purpose' },
          {
            t: 'p',
            text: 'To protect Company and client confidential information and establish consistent ownership, disclosure, and use rules for work created during employment.',
          },
          { t: 'h', text: 'Scope' },
          {
            t: 'p',
            text: 'All employees and all information or work product accessed, created, received, or developed in connection with employment.',
          },
          { t: 'h', text: 'A. Confidential Information' },
          {
            t: 'p',
            text: 'Includes business plans, financial information, pricing, contracts, client and prospect information, source code, configurations, datasets, prompts, models, credentials, personal data, security information, methodologies, and third-party information that KATBOTZ is obligated to protect.',
          },
          { t: 'p', text: 'Employees may use Confidential Information:' },
          {
            t: 'ul',
            items: [
              'Only for authorized Company work;',
              'Only through approved systems;',
              'Only for as long as access is required.',
            ],
          },
          {
            t: 'p',
            text: 'Confidentiality obligations survive employment for as long as the information remains confidential; trade secrets are protected for the maximum period permitted by law.',
          },
          { t: 'h', text: 'B. Work Product' },
          {
            t: 'p',
            text: 'Includes inventions, software, source code, object code, scripts, automations, AI/ML models, datasets, data pipelines, prompts, fine-tuning methods, outputs, configurations, designs, documentation, reports, methodologies, reusable components, and improvements created in the course of employment or with Company/client resources.',
          },
          {
            t: 'p',
            text: 'Ownership and assignment are governed by the applicable employment agreement and Country Addendum. Employees must:',
          },
          {
            t: 'ul',
            items: [
              'Disclose pre-existing materials before use;',
              'Not introduce third-party or open-source materials without written approval and license compliance.',
            ],
          },
          { t: 'h', text: 'C. Records Preservation' },
          {
            t: 'p',
            text: 'Employees must preserve records subject to a legal hold, investigation, audit, client retention requirement, or regulatory obligation and must not alter, delete, conceal, or backdate records.',
          },
          { t: 'h', text: 'Compliance' },
          {
            t: 'p',
            text: 'Unauthorized disclosure, retention, copying, competitive use, or destruction may result in immediate access suspension, discipline, termination, injunctive relief, damages, and legal reporting where appropriate.',
          },
        ],
      },
      {
        id: 'ch-12',
        num: 'Ch 12',
        title: 'Data Privacy, Information Security, AI & SOC 2',
        blocks: [
          { t: 'h', text: 'Purpose' },
          {
            t: 'p',
            text: 'To establish employee controls that protect personal data, confidential information, systems, and client environments and support future compliance readiness.',
          },
          { t: 'h', text: 'Scope' },
          { t: 'p', text: 'All employees, devices, accounts, systems, vendors, and data used for Company or client work.' },
          { t: 'h', text: 'A. Access & Authentication' },
          {
            t: 'ul',
            items: [
              'Access is granted on a least-privilege, need-to-know basis.',
              'Use individual credentials, multi-factor authentication, approved password-management practices, and secure authentication devices.',
              'Credential sharing is prohibited.',
            ],
          },
          { t: 'h', text: 'B. Data Handling' },
          {
            t: 'ul',
            items: [
              'Process only for a defined business purpose;',
              'Limited to what is necessary;',
              'Retained only as required;',
              'Shared only with authorized recipients;',
              'Restricted data must be encrypted in transit and at rest using approved systems.',
            ],
          },
          { t: 'h', text: 'C. Artificial Intelligence Use' },
          { t: 'p', text: 'Public generative AI tools may **not** receive:' },
          {
            t: 'ul',
            items: [
              'Client source code;',
              'SAP configurations;',
              'Credentials;',
              'Personal data;',
              'Health information;',
              'Financial records;',
              'Proprietary methodologies;',
              'Internal strategy;',
              'Any other Restricted or Internal information.',
            ],
          },
          { t: 'p', text: 'Approved AI use remains subject to:' },
          {
            t: 'ul',
            items: ['Human review;', 'Accuracy validation;', 'Bias assessment;', 'IP review;', 'Security testing.'],
          },
          { t: 'h', text: 'D. Incident Reporting' },
          {
            t: 'note',
            text: 'A suspected incident — including phishing, credential exposure, malware, lost devices, misdirected email, unauthorized access, data leakage, or policy bypass — must be reported immediately and **no later than one hour after discovery** to security@katbotz.com and the Reporting Manager.',
          },
          { t: 'h', text: 'E. Compliance Frameworks' },
          {
            t: 'p',
            text: 'KATBOTZ may align controls with SOC 2 Trust Services Criteria, ISO 27001, NIST, or client frameworks as part of readiness efforts. Employees must:',
          },
          {
            t: 'ul',
            items: [
              'Complete training;',
              'Preserve evidence;',
              'Support access reviews;',
              'Follow change controls;',
              'Cooperate with audits.',
            ],
          },
          {
            t: 'p',
            text: 'The Company will not represent that it holds a certification or attestation unless formally obtained and approved for public communication.',
          },
          { t: 'h', text: 'Compliance' },
          {
            t: 'p',
            text: 'Failure to report or concealment of an incident is a separate violation. Good-faith reporting of a suspected incident will not result in retaliation.',
          },
        ],
      },
      {
        id: 'ch-13',
        num: 'Ch 13',
        title: 'Outside Employment, Moonlighting & Competition',
        blocks: [
          { t: 'h', text: 'Purpose' },
          {
            t: 'p',
            text: 'To ensure employees can meet their duties and protect client commitments, confidential information, health, safety, and legal compliance.',
          },
          { t: 'h', text: 'Scope' },
          { t: 'p', text: 'All employees, including employees on leave, probation, or remote assignments.' },
          { t: 'h', text: 'A. Working Time Dedication' },
          {
            t: 'p',
            text: 'Employees must devote scheduled working time and attention to KATBOTZ and may not perform simultaneous work for another employer, client, or business during KATBOTZ working time.',
          },
          { t: 'h', text: 'B. Pre-Approval Requirement' },
          {
            t: 'p',
            text: 'Before accepting outside employment, consulting, freelancing, a directorship, or a material ownership interest, the employee must obtain written approval where the activity may:',
          },
          {
            t: 'ul',
            items: [
              'Affect availability;',
              'Create a conflict;',
              'Involve a client or competitor;',
              'Use overlapping confidential information;',
              'Create tax, immigration, or working-time risk.',
            ],
          },
          { t: 'h', text: 'C. Prohibited Conduct' },
          { t: 'p', text: 'Employees may not:' },
          {
            t: 'ul',
            items: [
              'Divert a Company opportunity;',
              'Use Company/client systems for outside work;',
              'Solicit Company clients or personnel for outside work;',
              'Represent an outside business as affiliated with KATBOTZ.',
            ],
          },
          { t: 'h', text: 'D. Competition' },
          {
            t: 'p',
            text: 'During employment, direct competition with the employing entity is prohibited to the extent permitted by law. Post-employment restrictions are governed by the signed agreement, the applicable Country Addendum, and enforceability law.',
          },
          { t: 'h', text: 'Compliance' },
          {
            t: 'p',
            text: 'Undisclosed conflicting work, dual employment during scheduled hours, or misuse of client or Company resources may constitute serious misconduct.',
          },
        ],
      },
      {
        id: 'ch-14',
        num: 'Ch 14',
        title: 'Media, Publicity, Social Media & Corporate Accounts',
        blocks: [
          { t: 'h', text: 'Purpose' },
          {
            t: 'p',
            text: 'To manage the use of employee likeness, Company branding, public communications, and business social-media assets.',
          },
          { t: 'h', text: 'Scope' },
          { t: 'p', text: 'All employees and all Company-created or Company-operated media, accounts, content, and business contacts.' },
          { t: 'h', text: 'A. Authorized Spokespersons' },
          { t: 'p', text: 'Only authorized spokespersons may:' },
          {
            t: 'ul',
            items: [
              'Speak for KATBOTZ;',
              'Issue statements;',
              'Respond to media inquiries;',
              'Publish client case studies;',
              'Use client names and logos.',
            ],
          },
          { t: 'h', text: 'B. Personal Conduct' },
          { t: 'p', text: 'Employees must not:' },
          {
            t: 'ul',
            items: [
              'Disclose confidential information;',
              'Make knowingly false or defamatory statements;',
              'Engage in unlawful harassment;',
              'Imply that personal views are official Company positions.',
            ],
          },
          {
            t: 'note',
            text: 'Nothing in this policy restricts legally protected discussion of wages, hours, working conditions, or lawful reporting to a government agency.',
          },
          { t: 'h', text: 'C. Corporate Accounts & Contacts' },
          {
            t: 'p',
            text: 'Accounts created, provided, or operated on behalf of KATBOTZ, and business contacts developed primarily through those accounts, remain Company property. Employees must transfer access and credentials at any time requested and upon separation.',
          },
          { t: 'h', text: 'D. Likeness & Publicity' },
          {
            t: 'p',
            text: 'Use of an employee’s name, designation, voice, photograph, likeness, work-related contribution, or audiovisual material is governed by the applicable Country Addendum and signed employment agreement. Such use must be:',
          },
          {
            t: 'ul',
            items: [
              'Reasonable and non-defamatory;',
              'Connected to legitimate business, recruitment, internal communication, education, or marketing purposes.',
            ],
          },
          { t: 'h', text: 'Compliance' },
          {
            t: 'p',
            text: 'Unauthorized public statements or disclosure of confidential information may result in corrective action. Employees may raise concerns about a proposed use of their likeness with HR.',
          },
        ],
      },
      {
        id: 'ch-15',
        num: 'Ch 15',
        title: 'Health, Safety, Workplace Violence & Substance Misuse',
        blocks: [
          { t: 'h', text: 'Purpose' },
          { t: 'p', text: 'To maintain safe physical and digital work environments and prevent violence, impairment, and foreseeable harm.' },
          { t: 'h', text: 'Scope' },
          {
            t: 'p',
            text: 'All employees while working, attending Company or client events, traveling for business, or communicating through work-related systems.',
          },
          { t: 'h', text: 'A. Prohibited Conduct' },
          {
            t: 'p',
            text: 'Threats, intimidation, stalking, bullying, violence, possession or unlawful use of weapons, deliberate damage, and conduct creating a credible safety risk are prohibited.',
          },
          { t: 'h', text: 'B. Substance Use' },
          {
            t: 'p',
            text: 'Employees may not work while impaired by alcohol, illegal drugs, misuse of medication, or another substance that prevents safe and effective performance. Lawful medication and disability-related needs will be handled through the accommodation process.',
          },
          { t: 'h', text: 'C. Reporting' },
          {
            t: 'p',
            text: 'Work-related injuries, illnesses, unsafe conditions, domestic-violence concerns affecting the workplace, and threats must be reported promptly. **In an emergency, contact local emergency services first.**',
          },
          { t: 'h', text: 'D. Remote Work Safety' },
          {
            t: 'p',
            text: 'Employees working remotely must maintain ergonomically reasonable, secure, and hazard-controlled work areas and comply with client-site safety rules.',
          },
          { t: 'h', text: 'Compliance' },
          {
            t: 'p',
            text: 'The Company may remove an individual from a workplace or system, contact law enforcement, conduct a safety assessment, or impose discipline where reasonably necessary and lawful. Good-faith safety reporting is protected.',
          },
        ],
      },
      {
        id: 'ch-16',
        num: 'Ch 16',
        title: 'Grievances, Investigations & Anti-Retaliation',
        blocks: [
          { t: 'h', text: 'Purpose' },
          {
            t: 'p',
            text: 'To provide accessible reporting channels and a fair process for resolving workplace, payroll, conduct, security, and policy concerns.',
          },
          { t: 'h', text: 'Scope' },
          {
            t: 'p',
            text: 'All employees, including complainants, witnesses, managers, and individuals participating in an investigation.',
          },
          { t: 'h', text: 'A. Reporting Channels' },
          {
            t: 'p',
            text: 'Employees may report concerns to their Reporting Manager, HR, the CEO, Finance, Security, or a designated committee. A concern involving the normal reporting line may be raised directly through an alternate channel.',
          },
          { t: 'h', text: 'B. Investigation Standards' },
          { t: 'p', text: 'Investigations will be:' },
          { t: 'ul', items: ['Proportionate;', 'Impartial;', 'Documented;', 'Conducted as confidentially as reasonably possible.'] },
          { t: 'p', text: 'Individuals must:' },
          {
            t: 'ul',
            items: [
              'Preserve evidence;',
              'Provide truthful information;',
              'Avoid interference, retaliation, or unauthorized disclosure.',
            ],
          },
          { t: 'h', text: 'C. Interim Measures' },
          {
            t: 'p',
            text: 'The Company may use interim measures, including reporting-line changes, access limitations, paid or unpaid suspension where lawful, temporary transfer, or separation of involved individuals, without treating the measure as a final determination.',
          },
          { t: 'h', text: 'D. Bad Faith & Retaliation' },
          {
            t: 'ul',
            items: [
              'Knowingly false evidence, obstruction, retaliation, witness intimidation, or destruction of records may result in discipline.',
              'An unsubstantiated complaint is not, by itself, evidence of bad faith.',
            ],
          },
          { t: 'h', text: 'Compliance' },
          {
            t: 'p',
            text: 'Retaliation against a person who makes a good-faith report, requests a lawful accommodation or leave, participates in an investigation, discusses protected working conditions, or contacts a government agency is prohibited.',
          },
        ],
      },
      {
        id: 'ch-17',
        num: 'Ch 17',
        title: 'Corrective Action, Separation & Offboarding',
        blocks: [
          { t: 'h', text: 'Purpose' },
          {
            t: 'p',
            text: 'To ensure proportionate corrective action and secure, lawful separation processes without overriding country-specific employment rules.',
          },
          { t: 'h', text: 'Scope' },
          {
            t: 'p',
            text: 'All employees and managers involved in performance management, discipline, resignation, termination, or offboarding.',
          },
          { t: 'h', text: 'A. Corrective Action Spectrum' },
          { t: 'p', text: 'Corrective action may include:' },
          {
            t: 'ul',
            items: [
              'Coaching;',
              'Verbal counseling;',
              'Written warning;',
              'Performance improvement plan;',
              'Access restriction;',
              'Reassignment;',
              'Suspension;',
              'Final warning;',
              'Termination.',
            ],
          },
          { t: 'p', text: 'The Company may skip steps when conduct, risk, performance, or law warrants.' },
          { t: 'h', text: 'B. Serious Misconduct' },
          { t: 'p', text: 'Examples include:' },
          {
            t: 'ul',
            items: [
              'Fraud or falsification;',
              'Intentional timesheet or expense misstatement;',
              'Harassment or retaliation;',
              'Violence;',
              'Data theft or unauthorized disclosure;',
              'Deliberate security bypass;',
              'Undisclosed competing work;',
              'Insubordination;',
              'Material breach of contract;',
              'Substantial client harm.',
            ],
          },
          { t: 'h', text: 'C. Separation Procedures' },
          {
            t: 'p',
            text: 'Separation procedures — including notice, pay in lieu, at-will status, final wages, unused leave, benefit continuation, and termination for cause — are governed by the applicable Country Addendum and signed agreement.',
          },
          { t: 'h', text: 'D. Offboarding Obligations' },
          { t: 'p', text: 'Upon request or separation, employees must:' },
          {
            t: 'ul',
            items: [
              'Return all Company and client property;',
              'Transfer business accounts;',
              'Provide reasonable knowledge transfer;',
              'Delete business data from personal systems;',
              'Certify completion within five days where requested.',
            ],
          },
          {
            t: 'note',
            text: '**Surviving obligations:** Confidentiality, intellectual-property, return-of-property, non-solicitation, dispute-resolution, and other expressly surviving obligations continue after separation.',
          },
          { t: 'h', text: 'Compliance' },
          {
            t: 'p',
            text: 'HR must review involuntary terminations and abandonment decisions before communication. Access may be suspended immediately to protect systems, evidence, or clients.',
          },
        ],
      },
      {
        id: 'ch-18',
        num: 'Ch 18',
        title: 'Handbook Administration & Change Control',
        blocks: [
          { t: 'h', text: 'Purpose' },
          { t: 'p', text: 'To ensure controlled publication, notice, acknowledgment, and lawful amendment of the Handbook.' },
          { t: 'h', text: 'Scope' },
          { t: 'p', text: 'All employees and policy owners.' },
          { t: 'h', text: 'A. Amendments' },
          {
            t: 'p',
            text: 'The Company may amend, replace, suspend, or withdraw policies prospectively, subject to applicable law and any contractual requirement. Material changes will be communicated through official channels.',
          },
          { t: 'h', text: 'B. Protected Rights' },
          { t: 'p', text: 'Policies must be interpreted consistently with protected employee rights, including:' },
          {
            t: 'ul',
            items: [
              'Lawful wage discussions;',
              'Concerted activity;',
              'Whistleblowing;',
              'Government reporting;',
              'Statutory leave.',
            ],
          },
          { t: 'h', text: 'C. Acknowledgments' },
          {
            t: 'p',
            text: 'Employees must complete acknowledgments and required training. An acknowledgment confirms receipt and understanding; it does not waive non-waivable rights or create a guaranteed term of employment.',
          },
          { t: 'h', text: 'D. Exceptions' },
          {
            t: 'p',
            text: 'Only the CEO or an expressly authorized officer may approve a policy exception that materially affects compensation, legal rights, security, or client obligations.',
          },
          { t: 'h', text: 'Compliance' },
          {
            t: 'p',
            text: 'HR owns the controlled version, maintains revision history, and coordinates legal review of country and state updates.',
          },
        ],
      },
    ],
  },

  // ─────────────────────────────────────── Part II — United States Addendum
  {
    id: 'part-2',
    label: 'Part II',
    title: 'United States Country Addendum',
    scope: 'us',
    chapters: [
      {
        id: 'us-1',
        num: 'US-1',
        title: 'At-Will Employment & Notice Procedures',
        blocks: [
          {
            t: 'note',
            text: 'This Addendum applies to employees of KATBOTZ LLC working in the United States. The law of the employee’s actual approved work location applies where it provides greater or different rights.',
          },
          { t: 'h', text: 'Purpose' },
          {
            t: 'p',
            text: 'To preserve the at-will relationship while explaining the administrative notice procedure in the current US employment agreement.',
          },
          { t: 'h', text: 'Scope' },
          {
            t: 'p',
            text: 'All KATBOTZ LLC employees, except where a written agreement signed by the CEO expressly provides otherwise or applicable law prohibits at-will employment.',
          },
          { t: 'h', text: 'A. At-Will Employment' },
          {
            t: 'p',
            text: 'Employment is at will. Either KATBOTZ LLC or the employee may end the relationship at any time, with or without cause and with or without advance notice, subject to applicable law.',
          },
          { t: 'h', text: 'B. Administrative Notice' },
          {
            t: 'p',
            text: 'The current hourly employment agreement requests **10 days’ written notice** by either party and permits the Company to waive all or part of that period and make separation effective immediately. This notice procedure:',
          },
          {
            t: 'ul',
            items: ['Does not create a fixed term;', 'Does not guarantee work during the notice period;', 'Does not alter at-will status.'],
          },
          { t: 'h', text: 'C. Notice Period Operations' },
          {
            t: 'p',
            text: 'During a notice period, KATBOTZ may reduce, reassign, or discontinue client-billable or internal work. Hourly employees are paid only for actual hours worked and accurately reported, plus any other amount required by law.',
          },
          { t: 'h', text: 'D. Immediate Separation' },
          {
            t: 'p',
            text: 'Immediate separation may occur for misconduct, policy breach, security risk, work-authorization loss, client requirement, business need, or any lawful reason. Nothing permits discrimination, retaliation, interference with protected rights, or failure to pay final wages required by state law.',
          },
          { t: 'h', text: 'Compliance' },
          {
            t: 'p',
            text: 'Only a written agreement signed by the CEO may alter at-will status. Managers must not promise guaranteed employment, cause-only termination, or a minimum notice period.',
          },
        ],
      },
      {
        id: 'us-2',
        num: 'US-2',
        title: 'Hourly Compensation, Assigned Hours & Overtime',
        blocks: [
          { t: 'h', text: 'Purpose' },
          {
            t: 'p',
            text: 'To align payroll and scheduling with the US hourly employment agreement and federal, state, and local wage laws.',
          },
          { t: 'h', text: 'Scope' },
          { t: 'p', text: 'US employees paid on an hourly basis and any other US employee required to record hours.' },
          { t: 'h', text: 'A. Rates & Documentation' },
          {
            t: 'p',
            text: 'An employee may have separate written rates for approved internal-firm work and approved client-billable work. The applicable rate must be documented through authorized HR and CEO approval.',
          },
          { t: 'h', text: 'B. No Guarantee' },
          {
            t: 'p',
            text: 'There is no guarantee of a minimum schedule, client assignment, or term. Assigned hours may vary from zero to 40 or more in a workweek based on business needs, subject to wage-and-hour law.',
          },
          { t: 'h', text: 'C. Nonexempt Employee Requirements' },
          {
            t: 'ul',
            items: [
              'Must record all time worked and will be paid for all compensable time;',
              'Overtime over 40 hours in a workweek will be paid at the legally required rate unless a more protective state rule applies;',
              'Must seek written approval before exceeding budgeted hours;',
              'Unauthorized overtime may lead to discipline, but a nonexempt employee must still report and will be paid for time actually worked.',
            ],
          },
          { t: 'h', text: 'D. Classification' },
          {
            t: 'p',
            text: 'Exempt or nonexempt classification is determined by actual compensation and duties under applicable law, not by this Handbook or a job title.',
          },
          { t: 'h', text: 'Compliance' },
          {
            t: 'p',
            text: 'Payroll records, wage statements, deductions, meal periods, and final pay will comply with the employee’s state and locality. Pay concerns should be reported immediately and will be investigated without retaliation.',
          },
        ],
      },
      {
        id: 'us-3',
        num: 'US-3',
        title: 'US Leave & Benefits Administration',
        blocks: [
          { t: 'h', text: 'Purpose' },
          {
            t: 'p',
            text: 'To coordinate Company-provided leave with federal, state, and local mandates without promising benefits outside written plans.',
          },
          { t: 'h', text: 'Scope' },
          { t: 'p', text: 'US employees, subject to classification, service, work location, and benefit-plan eligibility.' },
          { t: 'h', text: 'A. Paid Time Off (PTO)' },
          {
            t: 'p',
            text: 'Eligible regular full-time employees may receive **15 days of PTO annually**, administered through the Company’s written plan and subject to proration, accrual, carryover, use, and payout rules. State or local paid-sick-leave requirements will be administered separately or through a compliant combined plan.',
          },
          { t: 'h', text: 'B. Protected Leave' },
          {
            t: 'p',
            text: 'Federal and state family, medical, disability, pregnancy, lactation, military, jury, witness, voting, crime-victim, domestic-violence, and other protected leave will be provided where applicable.',
          },
          { t: 'h', text: 'C. Plan Documents Control' },
          {
            t: 'p',
            text: 'Company benefits are governed exclusively by the controlling plan documents. This Handbook is a summary and does not guarantee continued plan coverage or create a vested benefit.',
          },
          { t: 'h', text: 'D. Concurrent Leave' },
          {
            t: 'p',
            text: 'Leave may run concurrently with other leave or wage-replacement programs where legally permitted. Employees must cooperate with reasonable notice and certification procedures.',
          },
          { t: 'h', text: 'Compliance' },
          {
            t: 'p',
            text: 'HR determines eligibility and coordinates payroll, benefit premiums, reinstatement, and documentation. Protected leave and accommodation use will not result in retaliation.',
          },
        ],
      },
      {
        id: 'us-4',
        num: 'US-4',
        title: 'Confidentiality, IP, Publicity & Restrictive Covenants',
        blocks: [
          { t: 'h', text: 'Purpose' },
          {
            t: 'p',
            text: 'To align the Handbook with the US employment agreement and NDA while preserving statutory employee rights and state-law limitations.',
          },
          { t: 'h', text: 'Scope' },
          { t: 'p', text: 'All KATBOTZ LLC employees.' },
          { t: 'h', text: 'A. Work Product Ownership' },
          {
            t: 'p',
            text: 'Work Product created within the scope of employment is intended to be a **work made for hire** to the fullest extent permitted by law. Any right not automatically owned is assigned to KATBOTZ under the signed agreement, including rights in AI/ML systems, data, prompts, software, automations, and improvements.',
          },
          { t: 'h', text: 'B. Pre-Existing Materials' },
          {
            t: 'p',
            text: 'Pre-existing materials must be disclosed in writing before incorporation. Approved pre-existing material incorporated into Work Product is licensed to KATBOTZ on the perpetual, worldwide, royalty-free terms stated in the agreement.',
          },
          { t: 'h', text: 'C. Publicity & Likeness' },
          {
            t: 'p',
            text: 'The employee’s name, designation, voice, photograph, likeness, and work-related contributions may be used for legitimate corporate, recruitment, educational, internal, and marketing purposes as stated in the agreement. An employee may withdraw consent for future use of specified material by reasonable written notice, without affecting prior publication or legally required retention.',
          },
          { t: 'h', text: 'D. Restrictive Covenants' },
          {
            t: 'p',
            text: 'Noncompetition and nonsolicitation restrictions apply only to the extent permitted by the law of the employee’s work location. The Handbook does not expand a signed restrictive covenant. Nothing restricts lawful protected activity, reporting, wage discussions, or use of general skills and experience.',
          },
          { t: 'h', text: 'Compliance' },
          {
            t: 'p',
            text: 'HR and legal counsel must review enforcement of any restrictive covenant based on the employee’s state, role, access, compensation, and governing law.',
          },
        ],
      },
      {
        id: 'us-5',
        num: 'US-5',
        title: 'Work Authorization, Location, Arbitration & Governing Law',
        blocks: [
          { t: 'h', text: 'Purpose' },
          { t: 'p', text: 'To explain location-sensitive compliance, employment authorization, and dispute procedures in the US agreement.' },
          { t: 'h', text: 'Scope' },
          { t: 'p', text: 'All KATBOTZ LLC employees.' },
          { t: 'h', text: 'A. Work Authorization' },
          {
            t: 'p',
            text: 'Employment is contingent on timely completion and maintenance of legally required identity and employment-authorization documentation. Employees must notify HR promptly of any change that affects authorization to work.',
          },
          { t: 'h', text: 'B. Work Location Changes' },
          {
            t: 'p',
            text: 'Remote work from a new state or country requires advance written approval. KATBOTZ may deny or condition a relocation based on payroll, registration, tax, insurance, immigration, client, security, or legal requirements.',
          },
          { t: 'h', text: 'C. Arbitration & Governing Law' },
          {
            t: 'p',
            text: 'The current US employment agreement selects **New Jersey law** and provides for individual final and binding arbitration through the American Arbitration Association for covered claims, while preserving:',
          },
          { t: 'ul', items: ['Non-waivable agency rights;', 'Equitable relief for confidentiality, IP, or restrictive-covenant matters.'] },
          {
            t: 'note',
            text: 'Nothing in the arbitration policy prevents an employee from filing a charge with an administrative agency, reporting a violation, or exercising a right that cannot lawfully be waived.',
          },
          { t: 'h', text: 'Compliance' },
          {
            t: 'p',
            text: 'The signed arbitration clause controls. State law may require modifications to venue, cost allocation, waiver language, or enforceability.',
          },
        ],
      },
      {
        id: 'us-federal',
        num: 'US Federal',
        title: 'Federal Policies',
        blocks: [
          {
            t: 'note',
            text: 'The following policies apply to all KATBOTZ LLC employees working in the United States and are designed to comply with federal law. Where state or local law provides greater protection, the more protective law applies.',
          },
          { t: 'h', text: 'Accommodations for Pregnancy, Childbirth & Related Medical Conditions' },
          {
            t: 'p',
            text: 'To support employees experiencing limitations related to pregnancy, childbirth, or related medical conditions by providing reasonable accommodations in compliance with the federal Pregnant Workers Fairness Act (PWFA) and applicable state or local laws.',
          },
          { t: 'p', text: '**Examples of reasonable accommodations:**' },
          {
            t: 'ul',
            items: [
              'Additional break time for restroom use, meals, hydration, and rest;',
              'Seating options allowing for sitting or standing as needed;',
              'Schedule changes, part-time work, and paid and unpaid leave;',
              'Flexible work hours to accommodate medical appointments and physical needs;',
              'Telework (remote work);',
              'Closer parking spots to the workplace entrance;',
              'Light duty;',
              'Making existing facilities accessible or modifying the work environment;',
              'Job restructuring;',
              'Temporarily suspending one or more essential functions of your job;',
              'Acquiring or modifying equipment, uniforms, or devices;',
              'Adjusting or modifying examinations or policies.',
            ],
          },
          {
            t: 'p',
            text: '**Request process:** Notify your Reporting Manager. Where the need is not obvious, you may be asked for the reason an accommodation is needed, a description of the proposed accommodation, and how it will effectively address your limitations.',
          },
          { t: 'p', text: '**No medical documentation required** when:' },
          {
            t: 'ul',
            items: [
              'The limitation and need for accommodation is obvious;',
              'The Company is already aware of the limitation due to previous disclosures;',
              'Requesting accommodations such as additional restroom breaks, fluid intake, food breaks, or seating arrangements (presumptively reasonable);',
              'For any lactation accommodations;',
              'When a similar accommodation has been provided to other employees without requiring documentation.',
            ],
          },
          {
            t: 'p',
            text: '**Interactive process & undue hardship:** The Company will engage in an interactive process to identify suitable accommodations. Certain accommodations may not be provided if they would result in undue hardship, considering the nature and cost of the accommodation, the overall financial resources of the facility, and the impact on operations including safety and efficiency.',
          },
          {
            t: 'p',
            text: '**Concurrent leave:** If leave is provided as a reasonable accommodation, it may run concurrently with FMLA leave and/or any other applicable leave as permitted by law. The Company strictly prohibits retaliation against employees who request or utilize an accommodation.',
          },

          { t: 'h', text: 'Disability Accommodation' },
          {
            t: 'p',
            text: 'To provide equal employment opportunities to qualified individuals with disabilities in compliance with the Americans with Disabilities Act (ADA), the Pregnancy Discrimination Act, and all applicable state and local fair employment practices laws.',
          },
          {
            t: 'ul',
            items: [
              '**Request process:** Notify your Reporting Manager with the reason you need an accommodation, a description of the proposed accommodation, and how it will help you perform the essential functions of your job.',
              '**Interactive dialogue:** The Company will determine the precise limitations of your disability and explore reasonable accommodations. Where appropriate, we may need permission to obtain additional information from your medical provider. All medical information received is treated as confidential.',
              '**Alternative accommodations:** The Company is not required to make the specific accommodation requested and may provide an alternative, to the extent any reasonable accommodation can be made without undue hardship.',
              '**Greater protections:** Where state or local law provides greater protections, the Company will apply the law that provides the greatest benefit to employees.',
              '**Concurrent leave:** Leave provided as an accommodation may run concurrently with FMLA and/or other leave where permitted.',
            ],
          },

          { t: 'h', text: 'Employment Authorization Verification' },
          {
            t: 'ul',
            items: [
              'New hires must complete Section 1 of federal **Form I-9** on the first day of paid employment;',
              'Must present acceptable documents proving identity and employment authorization no later than the **third business day** following the start of employment;',
              'If currently employed and not compliant, or if status has changed, inform your Reporting Manager immediately;',
              '**Reverification:** If you are authorized to work for a limited time, you must submit proof of renewed employment eligibility prior to expiration to remain employed.',
            ],
          },

          { t: 'h', text: 'Religious Accommodation' },
          {
            t: 'p',
            text: 'To reasonably accommodate sincerely held religious beliefs in compliance with Title VII of the Civil Rights Act of 1964 and applicable state and local laws.',
          },
          {
            t: 'ul',
            items: [
              '**Request process:** Make the request with your Reporting Manager or People Operations at **hr@katbotz.com**, including a description of the proposed accommodation, the reason you need it, and how it will resolve the conflict between your religious beliefs or practices and your work requirements.',
              '**Interactive dialogue:** The Company will explore potential accommodations. It is not required to make the specific accommodation requested and may provide an alternative, to the extent any reasonable accommodation can be made without undue hardship.',
              'The Company will not discriminate or retaliate against employees who, in good faith, request a religious accommodation.',
            ],
          },

          { t: 'h', text: 'Attendance' },
          {
            t: 'ol',
            items: [
              '**Attendance and punctuality:** Adhere to scheduled work hours and maintain consistent communication with your team. Daily attendance should be recorded using the Company’s designated time-tracking system.',
              '**Tardiness:** If you expect to be late, inform your manager as soon as possible. Repeated tardiness may be addressed through performance reviews or disciplinary actions.',
              '**Requests for time off:** Submit at least **5 business days** in advance via the HR portal, with manager approval. Emergency leave requests should be communicated at the earliest opportunity.',
              '**Absences and medical leave:** Notify your manager within **1 hour** of your scheduled start time. Absences may qualify for protection under FMLA, ADA, PWFA, or applicable state laws; provide necessary documentation to HR.',
              '**Job abandonment:** Failure to report to work or communicate with the Company for **five consecutive scheduled working days** will be considered job abandonment. KATBOTZ will assume voluntary resignation unless an emergency situation or protected legal reason is later documented.',
              '**Emergency and protected leave:** If an absence is related to a protected legal reason, it must be documented and communicated to HR for proper evaluation.',
            ],
          },

          { t: 'h', text: 'Paycheck Deductions' },
          { t: 'p', text: 'KATBOTZ LLC is required by law to make certain deductions each pay period, including:' },
          {
            t: 'ul',
            items: [
              'Federal income tax;',
              'Social Security and Medicare (FICA) taxes;',
              'State income taxes;',
              'Any other deductions required under law or by court order for wage garnishments.',
            ],
          },
          {
            t: 'p',
            text: 'The amount of tax deductions depends on your earnings and the information on your federal Form W-4 and applicable state withholding form. Permissible deductions for exempt employees may include full-day absences for reasons other than sickness or disability and certain disciplinary suspensions. You may also authorize certain voluntary deductions where permissible under state law.',
          },
          {
            t: 'note',
            text: '**Error correction:** You will be reimbursed in full for any isolated, inadvertent, or improper deductions. If an error is found, you will receive an immediate adjustment paid no later than your next regular payday.',
          },

          { t: 'h', text: 'Recording Time' },
          {
            t: 'p',
            text: 'Nonexempt employees are required to record all working time using the Company-designated timekeeping application, including Zoho Projects where assigned.',
          },
          { t: 'p', text: '**Time must be recorded:**' },
          {
            t: 'ul',
            items: [
              'Immediately before starting your shift;',
              'Immediately after finishing work, before your meal period;',
              'Immediately before resuming work, after your meal period;',
              'Immediately after finishing work;',
              'Immediately before and after any other time away from work;',
              'Any other compensable time required by applicable law.',
            ],
          },
          { t: 'p', text: '**Rules:**' },
          {
            t: 'ul',
            items: [
              'Time records must be completed daily and submitted for weekly review by the deadline communicated by Finance and the Reporting Manager;',
              'Record time when work begins and ends; do not record time before work starts or after work stops;',
              'Notify your Reporting Manager or People Operations of any pay discrepancies, unrecorded or misrecorded work hours, or any involuntarily missed meal or break periods;',
              'Falsifying time entries is strictly prohibited and includes working “off the clock.” Violations are subject to discipline up to and including termination;',
              'Immediately report any employee, supervisor, or manager who falsifies your time entries or encourages you to falsify records or work off the clock.',
            ],
          },
          { t: 'p', text: 'Good-faith reporting of timekeeping violations will not result in retaliation.' },

          { t: 'h', text: 'Non-Solicitation / Non-Distribution' },
          {
            t: 'p',
            text: '**Solicitation** includes selling items or services, seeking contributions, or seeking support for an organization, whether conducted verbally, in writing, or electronically.',
          },
          {
            t: 'ul',
            items: [
              '**During assigned working hours:** Soliciting other employees is prohibited. “Working hours” means periods when either you or the employees you intend to solicit are expected to be actively engaged in work-related activities.',
              '**Authorized nonworking times:** You are permitted to engage in solicitation during breaks, provided that the recipients are also on nonworking time.',
            ],
          },
          { t: 'p', text: '**Distribution:**' },
          {
            t: 'ul',
            items: [
              'Distribution of nonwork-related literature or items within working areas is prohibited at all times;',
              'Working areas do not include break/rest areas, lunchrooms, and parking lots;',
              'Electronic distribution of materials during work hours is not allowed;',
              'Literature that violates EEO and nonharassment policies, or knowingly spreads false information, is strictly prohibited;',
              'Non-employees are not permitted to distribute materials on company premises under any circumstances.',
            ],
          },
          {
            t: 'note',
            text: 'This policy is not meant to curtail the statutory rights of employees, including their right to discuss terms and conditions of employment.',
          },

          { t: 'h', text: 'Workplace Privacy & Right to Inspect' },
          {
            t: 'p',
            text: 'Company-owned equipment, systems, files, and physical spaces — including computers, mobile devices, email accounts, cloud storage, and communication tools — are subject to inspection by the Company at any time without prior notice, to the extent permitted by applicable law. Employees have no reasonable expectation of privacy in Company systems or property.',
          },

          { t: 'h', text: 'Jury Duty Leave' },
          {
            t: 'ul',
            items: [
              'If summoned for jury duty, notify your Reporting Manager as soon as possible;',
              'Generally, time spent on jury duty is unpaid;',
              'Exempt employees will not incur any deduction in pay for a partial week’s absence due to jury duty;',
              'If applicable law requires compensation, you will be paid accordingly;',
              'You may substitute any portion of unpaid jury duty leave with appropriate paid leave;',
              'The Company reserves the right to require proof of jury duty service to the extent authorized by law.',
            ],
          },
          { t: 'p', text: 'The Company will not retaliate against employees who request or take leave in accordance with this policy.' },

          { t: 'h', text: 'Military Leave (USERRA)' },
          {
            t: 'ul',
            items: [
              'A military leave of absence will be granted in accordance with the Uniformed Services Employment and Reemployment Rights Act of 1994 (USERRA) and all applicable state law;',
              'Submit documentation of the need for leave to Human Resources;',
              'When returning from military leave, you will be reinstated to your previous position or a similar position, in accordance with state and federal law;',
              'You must notify your Reporting Manager of your intent to return based on requirements of the law.',
            ],
          },
          { t: 'p', text: 'Contact Human Resources for more information regarding status, compensation, benefits, and reinstatement.' },
        ],
      },
      {
        id: 'us-az',
        num: 'Arizona',
        title: 'Arizona State Policies',
        blocks: [
          { t: 'h', text: 'EEO Statement & Non-Harassment' },
          {
            t: 'p',
            text: 'KATBOTZ LLC is committed to complying with all federal, state, and local laws providing equal employment opportunities. It is our intent to maintain a work environment free of harassment, discrimination, or retaliation based on: age (40 and older), race, color, national origin, ancestry, religion, sex, sexual orientation (including transgender status, gender identity or expression), pregnancy (including childbirth, lactation, and related medical conditions), physical or mental disability, genetic information (including testing and characteristics), veteran status, uniformed servicemember status, or any other status protected by federal, state, or local laws.',
          },
          {
            t: 'p',
            text: '**Sexual harassment** includes unwelcome sexual advances, requests for sexual favors, and other verbal or physical conduct of a sexual nature when: (1) submission is made explicitly or implicitly a term or condition of employment; (2) submission or rejection is used as the basis for employment decisions; or (3) the conduct has the purpose or effect of unreasonably interfering with work performance or creating an intimidating, hostile, or offensive work environment.',
          },
          {
            t: 'p',
            text: '**Other harassment** is verbal or physical conduct that insults or shows hostility or aversion toward an individual because of membership in a protected class.',
          },
          {
            t: 'note',
            text: '**Reporting:** Immediately notify People Operations at hr@katbotz.com, your Reporting Manager, or any member of management.',
          },
          { t: 'h', text: 'Accommodations for Nursing Mothers' },
          {
            t: 'p',
            text: 'KATBOTZ LLC will provide nursing mothers reasonable break time to express milk for their infant child for up to one year following the child’s birth. A space, other than a restroom, shielded from view and free from intrusion will be provided. Break time should, if possible, be taken concurrently with other break time. If nonexempt, record start and end times for non-concurrent breaks. Break time may be unpaid where permissible by law.',
          },
          { t: 'h', text: 'Meal & Rest Periods' },
          {
            t: 'p',
            text: 'Check with your Reporting Manager regarding procedures and schedules. Accurately observe and record meal and rest periods. Notify your manager if unable to take a scheduled break.',
          },
          { t: 'h', text: 'Overtime' },
          {
            t: 'p',
            text: 'If nonexempt, all overtime must be approved in advance, in writing, by your Reporting Manager. Overtime pay of **1.5× regular rate** is paid for hours worked in excess of 40 in a workweek. Holidays, vacation, and sick leave do not count as time worked for overtime computation. Failure to work required overtime or working unauthorized overtime may result in discipline, up to and including discharge.',
          },
          { t: 'h', text: 'Pay Period' },
          {
            t: 'p',
            text: 'Standard pay period is **biweekly**. Pay dates are every other Friday. If a pay date falls on a holiday or weekend, payment is made on the preceding business day.',
          },
          { t: 'h', text: 'Paid Sick Leave' },
          { t: 'p', text: 'Provided in accordance with Arizona’s Fair Wages and Healthy Families Act. **Eligibility:** all Arizona employees.' },
          { t: 'p', text: '**Accrual method:**' },
          {
            t: 'ul',
            items: [
              'Accrue 1 hour for every 30 hours worked;',
              'New employees begin accruing on first day of employment;',
              'Maximum accrual/use: 24 hours per calendar year;',
              'Unused sick leave carries over, but use is still capped at 24 hours per year;',
              'Reinstated if rehired within 9 months.',
            ],
          },
          { t: 'p', text: '**Frontloading method (alternative):**' },
          {
            t: 'ul',
            items: [
              'May use sick leave on 90th calendar day of employment;',
              'Unused sick leave does not carry over;',
              'Reinstated if rehired within 9 months.',
            ],
          },
          { t: 'p', text: '**Permitted uses:**' },
          {
            t: 'ul',
            items: [
              'Own or family member’s mental or physical illness, injury, or health condition;',
              'Medical diagnosis, care, treatment, or preventive care;',
              'Workplace or school closure due to public health emergency;',
              'Exposure to communicable disease;',
              'Absences due to domestic violence, sexual violence, abuse, or stalking.',
            ],
          },
          {
            t: 'ul',
            items: [
              '**Notice:** If foreseeable, make good-faith effort to provide advance notice. If unforeseeable, provide notice as soon as practical.',
              '**Documentation:** May be required for 3+ consecutive workdays. Reasonable documentation includes healthcare professional sign-off or specified domestic violence documentation.',
              '**Payment upon termination:** Unused sick leave is not paid out.',
              '**Complaints:** File with the Industrial Commission of Arizona at https://www.azica.gov/forms/earned-paid-sick-time-claim-form.',
            ],
          },
          { t: 'h', text: 'Voting Leave' },
          {
            t: 'p',
            text: 'If your work schedule prevents you from voting on Election Day, KATBOTZ LLC will allow reasonable paid time off to vote, scheduled at the discretion of your Reporting Manager consistent with legal requirements.',
          },
        ],
      },
      {
        id: 'us-ct',
        num: 'Connecticut',
        title: 'Connecticut State Policies',
        blocks: [
          { t: 'h', text: 'EEO Statement & Non-Harassment' },
          {
            t: 'p',
            text: 'Protected classes in Connecticut include: age, race (including traits historically associated with race such as hair texture and protective hairstyles), color, national origin, ancestry, religion, sex, sexual orientation (including transgender status, gender identity or expression), pregnancy, disability (physical, mental, intellectual, or learning), genetic information, erased criminal history record information, marital or civil union status, status as a victim of domestic violence/sexual assault/trafficking, veteran status, uniformed servicemember status, or any other protected status.',
          },
          {
            t: 'p',
            text: '**State and federal remedies:** Claims must be filed with the EEOC and the Connecticut Commission on Human Rights and Opportunities (CCHRO) within **300 days**.',
          },
          {
            t: 'table',
            head: ['Agency', 'Contact'],
            rows: [
              ['EEOC Boston', '800-669-4000'],
              ['CCHRO', '860-541-3400 / 800-477-5737'],
            ],
          },
          { t: 'h', text: 'Accommodations for Nursing Mothers' },
          {
            t: 'p',
            text: 'Private room or location (other than a restroom) in close proximity to work area, shielded from view, free from intrusion, with access to a refrigerator/cooler and an electrical outlet. Break time should run concurrently with existing breaks where possible.',
          },
          { t: 'h', text: 'Meal & Rest Periods' },
          {
            t: 'p',
            text: 'While the FLSA does not require meal and rest periods, short breaks (5–20 minutes) are compensable. Bona fide meal periods of 30+ minutes where the employee is completely relieved from duties are not considered hours worked.',
          },
          { t: 'h', text: 'Overtime & Pay Period' },
          { t: 'p', text: 'Same structure as Arizona (biweekly, every other Friday, 1.5× rate for hours over 40).' },
          { t: 'h', text: 'Leave for Victims of Domestic Violence, Sexual Assault, or Trafficking' },
          {
            t: 'p',
            text: 'Reasonable unpaid leave for employees who are victims or have a child who is a victim. Leave may be used to:',
          },
          {
            t: 'ul',
            items: [
              'Seek medical attention;',
              'Obtain services from a domestic violence agency or rape crisis center;',
              'Obtain psychological counseling;',
              'Take safety actions including relocation;',
              'Obtain legal services or participate in legal proceedings.',
            ],
          },
          {
            t: 'p',
            text: 'Advance notice is not required where not feasible. Certification may include police report, court order, or documentation from a medical professional or counselor.',
          },
          { t: 'h', text: 'Connecticut Family and Medical Leave (CTFMLA)' },
          { t: 'p', text: '**Eligibility:** Employed for the 3 months immediately preceding the request.' },
          {
            t: 'p',
            text: '**Leave entitlement:** Up to **12 weeks** of unpaid job-protected leave in any 12-month period (calendar year basis) for:',
          },
          {
            t: 'ul',
            items: [
              'Own serious health condition;',
              'Birth or adoption of child;',
              'Care for family member with serious health condition;',
              'Organ or bone marrow donation;',
              'Qualifying exigency arising from spouse/child/parent on active duty.',
            ],
          },
          {
            t: 'ul',
            items: [
              '**Military family leave:** Up to 26 weeks if spouse/child/parent/next of kin is a service member undergoing medical treatment for a serious injury or illness incurred in the line of duty.',
              '**Combined spousal limit:** If both spouses work for the Company, combined leave may not exceed 12 weeks (or 26 weeks for military) for birth/adoption/foster care/care of family member.',
              '**Intermittent leave:** Permitted if medically necessary. May require temporary transfer to an alternative position.',
              '**Substitution of paid leave:** CTFMLA is unpaid, but you may be required or choose to substitute accrued paid vacation, personal, or sick time in excess of two weeks.',
              '**Notice:** At least 30 days for foreseeable leave; as soon as possible for unforeseeable.',
              '**Certification:** Must include date of condition, probable duration, medical facts, and statement of need. Second and third opinions permitted at Company expense if validity is doubted.',
              '**Return to work:** Placed in original or equivalent job with equivalent pay and benefits.',
            ],
          },
          { t: 'h', text: 'Connecticut Paid Leave Program (CTPL)' },
          {
            t: 'p',
            text: 'Provides up to 12 weeks of partial wage replacement (plus 2 additional weeks for pregnancy-related incapacitation) for events covered under FMLA, CTFMLA, and the Connecticut Family Violence Leave Act. Funded by employee payroll deductions and administered by the CT Paid Leave Authority. Visit www.ctpaidleave.org.',
          },
          { t: 'h', text: 'Crime Victim and Witness Leave' },
          { t: 'p', text: 'Unpaid leave for:' },
          {
            t: 'ul',
            items: [
              'Victims of crime attending legal proceedings;',
              'Legally compelled witnesses;',
              'Immediate family members or guardians of minors, physically disabled, or incompetent victims, or homicide victims.',
            ],
          },
          { t: 'p', text: 'Provide reasonable advance notice where foreseeable. Company may request verification (summons/subpoena).' },
          { t: 'h', text: 'Employment Protections for Civil Air Patrol Members' },
          {
            t: 'p',
            text: 'No discrimination, discipline, or discharge for membership or absence due to emergency response or required training. Must notify Company upon hiring or upon joining. Time missed is unpaid. Provide written verification from Civil Air Patrol.',
          },
          { t: 'h', text: 'Leave for Victims of Family Violence or Sexual Assault' },
          { t: 'p', text: 'Up to **12 days** of unpaid leave per calendar year for:' },
          {
            t: 'ul',
            items: [
              'Medical care or counseling;',
              'Services from a victim services organization;',
              'Relocation;',
              'Participation in civil or criminal proceedings.',
            ],
          },
          {
            t: 'p',
            text: 'May substitute paid leave. If foreseeable, provide at least 7 days’ advance notice. Documentation may include police/court records or signed statements from victim services professionals.',
          },
        ],
      },
      {
        id: 'us-ga',
        num: 'Georgia',
        title: 'Georgia State Policies',
        blocks: [
          { t: 'h', text: 'EEO Statement & Non-Harassment' },
          {
            t: 'p',
            text: 'Protected classes: age (40+), race, color, national origin, ancestry, religion, sex, sexual orientation (including transgender status, gender identity or expression), pregnancy, physical or mental disability, genetic information, veteran status, uniformed servicemember status, or any other protected status.',
          },
          { t: 'h', text: 'Accommodations for Nursing Mothers' },
          {
            t: 'p',
            text: 'Reasonable **paid** break time to express milk. Private location other than a restroom. If salaried, salary will not be reduced nor paid leave required for break time.',
          },
          { t: 'h', text: 'Meal & Rest Periods, Overtime, Pay Period' },
          { t: 'p', text: 'Same general structure as other states (biweekly, 1.5× over 40 hours).' },
          { t: 'h', text: 'Court Attendance & Witness Leave' },
          {
            t: 'p',
            text: 'Employees subpoenaed or ordered to attend judicial proceedings receive regular compensation while attending. Does not apply if attending because charged with a crime. Company may require proof of need.',
          },
          { t: 'h', text: 'Voting Leave' },
          {
            t: 'p',
            text: 'Up to **2 hours** of unpaid time off to vote in any municipal, county, state, or federal primary or election. May be used on advance in-person voting days or Election Day. Provide reasonable advance notice. Company determines specific hours.',
          },
        ],
      },
      {
        id: 'us-ma',
        num: 'Massachusetts',
        title: 'Massachusetts State Policies',
        blocks: [
          { t: 'h', text: 'EEO Statement & Non-Harassment' },
          {
            t: 'p',
            text: 'Protected classes include race (including hair texture, type, length, and protective hairstyles), color, religion, creed, ancestry, national origin, sex, sexual orientation, pregnancy, disability, genetic information, marital status, arrest and conviction information, status as a registered qualifying medical marijuana patient or caregiver, military service, veteran status, or any other protected status.',
          },
          { t: 'p', text: '**State remedies:** File with EEOC or Massachusetts Commission Against Discrimination (MCAD) within **300 days**.' },
          {
            t: 'table',
            head: ['Agency', 'Contact'],
            rows: [
              ['EEOC Boston', '800-669-4000'],
              ['MCAD', '617-994-6000'],
            ],
          },
          { t: 'h', text: 'Pregnant Workers Fairness Act Notice' },
          {
            t: 'p',
            text: 'The Massachusetts Pregnant Workers Fairness Act prohibits discrimination due to pregnancy or conditions related to pregnancy (including morning sickness, lactation, or need to express breast milk). Reasonable accommodations must be provided.',
          },
          { t: 'h', text: 'Accommodations for Nursing Mothers' },
          {
            t: 'p',
            text: 'Private room or location other than a restroom, shielded from view and free from intrusion. Break time should run concurrently with existing breaks where possible.',
          },
          { t: 'h', text: 'Paid Family and Medical Leave (PFML)' },
          { t: 'p', text: '**Eligibility:** Work in Massachusetts and meet financial eligibility requirements for unemployment benefits.' },
          { t: 'p', text: '**Leave entitlement:**' },
          {
            t: 'ul',
            items: [
              'Up to **12 weeks** paid family leave per benefit year for: birth/adoption/foster care, care for family member with serious health condition, or qualifying exigency of military member;',
              'Up to **26 weeks** to care for covered service member with serious injury/illness;',
              'Up to **20 weeks** paid medical leave for own serious health condition.',
            ],
          },
          {
            t: 'ul',
            items: [
              '**Benefit year:** Consecutive 52-week period beginning Sunday before first day of leave.',
              '**Family member:** Spouse, domestic partner, child, parent, parent of spouse/domestic partner, person who stood in loco parentis, grandchild, grandparent, or sibling.',
              '**Intermittent leave:** Permitted if medically necessary for health conditions or qualifying exigency. For birth/adoption, only if employer and employee agree.',
              '**Concurrent leave:** Runs concurrently with FMLA and Massachusetts Parental Leave Act (MPLA).',
              '**Notice:** At least 30 days’ written notice for foreseeable leave; as soon as practical for unforeseeable.',
              '**Claims:** File with Massachusetts Department of Family and Medical Leave (DFML). Provide notice to Company before filing. Applications supported by certification. DFML notifies within 14 calendar days.',
              '**Fitness for duty:** Required before returning from own serious health condition leave (except intermittent).',
              '**Health benefits:** Maintained at same level during leave. If using paid time off, premiums continue through payroll deductions. If not using PTO, employee must remit premium share.',
              '**Reinstatement:** To previous or equivalent position with same status, pay, benefits, length-of-service credit, and seniority. Exception: layoffs due to economic conditions.',
              '**Benefit amount:** Calculated by Family and Employment Security Trust Fund. 7-calendar-day waiting period for initial claims counts against total available leave.',
            ],
          },
          { t: 'h', text: 'Crime Victim and Witness Leave' },
          { t: 'p', text: 'Unpaid leave to:' },
          {
            t: 'ul',
            items: [
              'Respond to subpoena as witness in criminal proceeding;',
              'Attend court proceeding or participate in police investigation as witness or victim;',
              'Attend civil court proceeding as victim of family violence;',
              'Obtain restraining or protective order.',
            ],
          },
          {
            t: 'p',
            text: 'Notify Reporting Manager as soon as possible. Documentation may be required. Does not apply to employees who committed or are alleged to have committed a crime.',
          },
          { t: 'h', text: 'Paid Sick Leave' },
          { t: 'p', text: '**Eligibility:** All employees whose primary place of employment is in Massachusetts.' },
          {
            t: 'p',
            text: '**Accrual:** 1 hour for every 30 hours worked, up to **40 hours** per calendar year. Begin accruing on first day; may use after 90th calendar day. Smallest increment: 1 hour. Carry over up to 40 hours. **Frontloading alternative:** 40 hours per year, no carryover.',
          },
          { t: 'p', text: '**Permitted uses:**' },
          {
            t: 'ul',
            items: [
              'Own or family member’s physical/mental illness, injury, or medical condition requiring home care, diagnosis, or preventive care;',
              'Medical appointments;',
              'Effects of domestic violence on employee or child;',
              'Physical/mental health needs after pregnancy loss or failed assisted reproduction, adoption, or surrogacy.',
            ],
          },
          {
            t: 'ul',
            items: [
              '**Documentation:** Required if absence exceeds 24 consecutive scheduled work hours or 3 consecutive scheduled days; within 2 weeks of final scheduled day; or after 4 unforeseeable undocumented absences in 3 months. Submit within 7 days.',
              '**Payment upon termination:** Unused sick leave not paid out.',
            ],
          },
          { t: 'h', text: 'Parental Leave' },
          {
            t: 'p',
            text: 'Up to **8 weeks** of unpaid parental leave in a 12-month period for birth or adoption. Must work full time and have 3 consecutive months of employment. Provide at least 2 weeks’ notice (or as soon as practicable). Returned to original or similar job with equivalent pay and benefits. Runs concurrently with FMLA/MPLA.',
          },
          { t: 'h', text: 'Voting Leave' },
          {
            t: 'p',
            text: 'Reasonable paid time off if work schedule prevents voting on Election Day, scheduled at manager’s discretion consistent with law.',
          },
        ],
      },
      {
        id: 'us-nj',
        num: 'New Jersey',
        title: 'New Jersey State Policies',
        blocks: [
          { t: 'note', text: 'New Jersey law governs the US employment agreement.' },
          { t: 'h', text: 'EEO Statement & Non-Harassment' },
          {
            t: 'p',
            text: 'Protected classes: age, race (including hair texture, type, and protective hairstyles), color, national origin, nationality, ancestry, creed, religion, sex, sexual orientation, pregnancy, marital status, civil union status, domestic partnership status, atypical hereditary cellular or blood trait, American flag display, physical or mental disability, genetic information, veteran status, uniformed servicemember status, or any other protected status.',
          },
          { t: 'h', text: 'Accommodations for Nursing Mothers' },
          {
            t: 'p',
            text: 'Private room or location other than a restroom, in close proximity to work area, shielded from view and free from intrusion. Includes access to refrigerator/cooler and electrical outlet.',
          },
          { t: 'h', text: 'Bone Marrow and Organ Donation Leave' },
          {
            t: 'p',
            text: 'Up to **26 weeks** of leave for organ or bone marrow donation. Generally unpaid, but may be eligible for partial wage replacement through NJ Temporary Disability Benefits Law. Restored to previous or equivalent position upon return.',
          },
          { t: 'h', text: 'Family Leave (NJFLA)' },
          {
            t: 'p',
            text: '**Eligibility:** Worked for Company for at least 3 months and at least 250 hours in the immediately preceding 12 months.',
          },
          {
            t: 'p',
            text: '**Leave entitlement:** Up to **12 weeks** of unpaid, job-protected leave during a rolling 24-month period for:',
          },
          {
            t: 'ul',
            items: [
              'Birth, adoption, or foster care placement of child (within one year);',
              'Care for family member or equivalent with serious health condition or isolation/quarantine due to communicable disease during state of emergency;',
              'Care for child during state of emergency if school/place of care closed by public official due to epidemic or public health emergency.',
            ],
          },
          {
            t: 'p',
            text: '**Family member:** Child, parent, spouse, domestic partner, civil union partner, sibling, grandparent, grandchild, or any individual related by blood or whose close association is equivalent to family.',
          },
          {
            t: 'ul',
            items: [
              '**Intermittent/reduced schedule:** Permitted subject to legal requirements. Make reasonable effort to schedule to not unduly disrupt operations.',
              '**Concurrent leave:** Runs concurrently with FMLA when reason is covered by both laws.',
              '**Notice:** Intermittent/reduced for child bonding/care — 15 days; consecutive for child bonding — 30 days; health condition/emergency — as soon as practicable. Written notice required except in emergencies.',
              '**Documentation:** May require signed attestation form. Refusal to sign may result in denial.',
              '**Reinstatement:** To same or similar position as required by law.',
            ],
          },
          { t: 'h', text: 'Family Leave Insurance (NJFLI)' },
          { t: 'p', text: 'Up to **12 weeks** (or 56 days intermittent) of partial wage replacement per year for:' },
          {
            t: 'ul',
            items: [
              'Bonding with newborn, adopted, or foster child;',
              'Care for family member with serious health condition;',
              'Handling matters related to domestic or sexual violence.',
            ],
          },
          { t: 'p', text: 'Restored to previous or equivalent position. Visit http://www.nj.gov/labor/.' },
          { t: 'h', text: 'Paid Sick Leave' },
          { t: 'p', text: '**Eligibility:** All employees who work in New Jersey.' },
          {
            t: 'p',
            text: '**Accrual:** 1 hour for every 30 hours worked, up to **40 hours** per calendar year. Begin accruing on first day; may use after 120 days. Carry over up to 40 hours, but use capped at 40 hours per year.',
          },
          { t: 'p', text: '**Permitted uses:**' },
          {
            t: 'ol',
            items: [
              'Own diagnosis, care, treatment, or recovery from mental/physical illness, injury, or adverse health condition, or preventive care;',
              'Family member’s diagnosis, care, treatment, or recovery, or preventive care;',
              'Domestic or sexual violence: medical attention, victim services, counseling, relocation, legal services, or court proceedings;',
              'Child’s school-related conference, meeting, function, or event requested by school staff, or meeting regarding child’s health condition or disability;',
              'Workplace/school closure due to public health emergency, state of emergency, or isolation/quarantine order.',
            ],
          },
          {
            t: 'p',
            text: '**Family member:** Child, grandchild, sibling, spouse, domestic partner, civil union partner, parent, grandparent, spouse/domestic partner/civil union partner of parent/grandparent, sibling of spouse/domestic partner/civil union partner, or any other individual related by blood or whose close association is equivalent to family.',
          },
          {
            t: 'ul',
            items: [
              '**Notice:** If foreseeable, 7 days’ advance notice and reasonable efforts to schedule to not unduly disrupt operations. If unforeseeable, as soon as practical.',
              '**Documentation:** May be required for 3+ consecutive days. Reasonable documentation includes healthcare professional sign-off, law enforcement records, court orders, or certification from domestic violence/victim services professionals.',
              '**Payment upon termination:** Unused sick leave not paid out.',
              '**Reinstatement upon rehire:** Previously accrued unused sick leave reinstated if rehired in New Jersey within 6 months.',
            ],
          },
          { t: 'h', text: 'Temporary Disability Insurance (NJTDI)' },
          {
            t: 'p',
            text: 'Up to **26 weeks** of partial wage replacement per year for non-work-related illness, injury, or pregnancy-related disability preventing work for more than 7 consecutive days. File claim within 30 days of becoming disabled. Restored to previous or equivalent position. Visit https://www.nj.gov/labor/.',
          },
          { t: 'h', text: 'Voting Leave' },
          {
            t: 'p',
            text: 'Reasonable time off to vote if work schedule prevents voting on Election Day, scheduled at manager’s discretion consistent with law.',
          },
        ],
      },
      {
        id: 'us-pa',
        num: 'Pennsylvania',
        title: 'Pennsylvania State Policies',
        blocks: [
          { t: 'h', text: 'EEO Statement & Non-Harassment' },
          {
            t: 'p',
            text: 'Protected classes: age (40+), race (including hair texture and protective hairstyles), color, national origin, ancestry, religion, religious creed (including head coverings and hairstyles historically associated with religious creeds), sex (including sex assigned at birth, sexual orientation, transgender identity, gender transition, and gender identity or expression), pregnancy, physical or mental disability (including use of guide/support animal), genetic information, veteran status, uniformed servicemember status, or any other protected status.',
          },
          { t: 'h', text: 'Accommodations for Nursing Mothers' },
          {
            t: 'p',
            text: 'Reasonable break time to express milk for up to one year following child’s birth. Space other than a restroom, shielded from view and free from intrusion. Break time should run concurrently with other breaks where possible.',
          },
          { t: 'h', text: 'Crime Victim and Witness Leave' },
          {
            t: 'p',
            text: 'Unpaid leave to attend criminal proceedings as witness or crime victim (or close family member/representative of victim). Notify Reporting Manager as soon as possible. Company may require proof. May use available paid leave. Information kept confidential. Does not apply to employees who committed or are alleged to have committed a crime.',
          },
          { t: 'h', text: 'Meal & Rest Periods, Overtime, Pay Period' },
          { t: 'p', text: 'Standard biweekly structure applies.' },
        ],
      },
      {
        id: 'us-tx',
        num: 'Texas',
        title: 'Texas State Policies',
        blocks: [
          { t: 'h', text: 'EEO Statement & Non-Harassment' },
          {
            t: 'p',
            text: 'Protected classes: age (40+), race (including hair texture or protective hairstyle such as braids, locks, and twists), religion, color, national origin, gender, sex, sexual orientation (including transgender status, gender identity or expression), pregnancy, physical or mental disability, genetic information, military service, veteran status, or any other protected status.',
          },
          { t: 'h', text: 'Accommodations for Nursing Mothers' },
          {
            t: 'p',
            text: 'Reasonable break time to express milk for up to one year following child’s birth. Space other than a restroom, shielded from view and free from intrusion.',
          },
          { t: 'h', text: 'Political Convention Leave' },
          { t: 'p', text: 'Unpaid leave to attend:' },
          {
            t: 'ul',
            items: [
              'A precinct convention for which they are eligible to participate; or',
              'A county, district, or state convention for which they are a delegate.',
            ],
          },
          { t: 'p', text: 'Provide as much notice as possible.' },
          { t: 'h', text: 'Voting Leave' },
          {
            t: 'p',
            text: 'Reasonable time off to vote if work schedule prevents voting on Election Day, scheduled at manager’s discretion consistent with law.',
          },
          { t: 'h', text: 'Witness Leave' },
          {
            t: 'p',
            text: 'Unpaid leave to attend civil, criminal, legislative, or administrative proceedings if subpoenaed. Notify Reporting Manager as soon as possible. May use available paid leave. Company may require proof.',
          },
          { t: 'h', text: 'Meal & Rest Periods, Overtime, Pay Period' },
          { t: 'p', text: 'Standard biweekly structure applies.' },
        ],
      },
      {
        id: 'us-ack',
        num: 'US Ack.',
        title: 'United States Acknowledgment of Receipt & Review',
        blocks: [
          {
            t: 'p',
            text: 'I acknowledge that I received and had an opportunity to review the KATBOTZ Global Employee Handbook, including the United States Country Addendum and the state policies applicable to my approved work location.',
          },
          {
            t: 'p',
            text: 'I understand that my employment with KATBOTZ LLC is **at will**, that this Handbook is not a contract or guarantee of continued employment, and that only a written agreement signed by the CEO may alter at-will status.',
          },
          {
            t: 'p',
            text: 'I agree to comply with lawful Company policies, including timekeeping, information security, confidentiality, acceptable use, client controls, and reporting obligations. I understand that the Company may amend policies prospectively, subject to applicable law.',
          },
          { t: 'sign', fields: ['Full Name', 'Employee ID', 'Approved Work State', 'Signature', 'Date'] },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────── Part III — India Addendum
  {
    id: 'part-3',
    label: 'Part III',
    title: 'India Country Addendum',
    scope: 'india',
    chapters: [
      {
        id: 'in-1',
        num: 'IN-1',
        title: 'Nature of Employment, Probation & Confirmation',
        blocks: [
          {
            t: 'note',
            text: 'This Addendum applies to employees of KATBOTZ India Private Limited. It must be read with the employee’s signed fixed-salary employment contract, offer letter, confirmation letter, and applicable central and state law.',
          },
          { t: 'h', text: 'A. Governing Documents' },
          {
            t: 'p',
            text: 'Employment is governed by the signed contract, this Handbook, and applicable Indian law. The Handbook does not create permanent tenure or a fixed-term guarantee unless a signed document expressly states otherwise.',
          },
          { t: 'h', text: 'B. Probation Period' },
          {
            t: 'ul',
            items: [
              'The initial probation period is **90 days** from the date of joining;',
              'KATBOTZ may shorten, extend, or terminate probation in writing based on performance, conduct, attendance, discipline, policy compliance, and role suitability;',
              'Completion of 90 days does not automatically confirm employment;',
              'Confirmation occurs only when HR issues a written confirmation email or letter.',
            ],
          },
          { t: 'h', text: 'C. Probation Entitlements & Termination' },
          {
            t: 'ul',
            items: [
              'During probation, either party may terminate employment with **five business days’** written notice or salary in lieu, subject to applicable law;',
              'KATBOTZ may terminate immediately for cause, misconduct, policy breach, or material prejudice to Company interests after following any legally required process;',
              'During probation, the employee is entitled to fixed salary and statutory leave or benefits required by law;',
              'Discretionary bonus, variable pay, insurance, retirement benefits, enhanced leave, allowances, or perquisites apply only when expressly approved in writing or legally mandatory.',
            ],
          },
          { t: 'h', text: 'Compliance' },
          {
            t: 'p',
            text: 'HR must document extensions, confirmation, or termination. Managers may not represent that probation has been completed without written HR confirmation.',
          },
        ],
      },
      {
        id: 'in-2',
        num: 'IN-2',
        title: 'Compensation Structure, Working Hours & Timekeeping',
        blocks: [
          { t: 'h', text: 'A. Compensation Structure' },
          {
            t: 'ul',
            items: [
              'Annual gross salary and monthly fixed salary are stated in the signed contract;',
              'The compensation structure may include basic salary, HRA, special allowance, and any other component documented in the offer or salary schedule;',
              'Statutory deductions and contributions apply when legally required.',
            ],
          },
          { t: 'h', text: 'B. Payroll Timing' },
          {
            t: 'ul',
            items: [
              'Salary is ordinarily paid on or before the date stated in the contract and no later than the legally required deadline;',
              'Digital payslips will be issued through the HR or payroll system;',
              'Discrepancies should be reported within five days of payment.',
            ],
          },
          { t: 'h', text: 'C. Working Hours' },
          {
            t: 'ul',
            items: [
              'The standard full-time schedule is **40 hours per week**, typically Monday through Friday, with reasonable flexibility for global clients and assigned duties;',
              'The annual scheduled-hours reference is 2,080 hours (40 × 52).',
            ],
          },
          { t: 'h', text: 'D. Utilization & Capacity (KPGF Context)' },
          { t: 'p', text: 'For KPGF utilization and capacity planning only:' },
          {
            t: 'ul',
            items: [
              '2,080 annual hours are designated as project/productive capacity;',
              '260 hours are reserved for administration, training, compliance, internal meetings, and other non-utilized responsibilities.',
            ],
          },
          {
            t: 'p',
            text: 'This does not reduce the 45-hour contractual schedule, change salary basis, or create an hourly wage entitlement.',
          },
          { t: 'h', text: 'E. Overtime' },
          {
            t: 'p',
            text: 'Salary covers reasonable additional work inherent in a professional, managerial, or specialized role. Separate overtime is payable only when required by applicable law and only after prior written approval and accurate recording. The absence of approval does not permit the Company to withhold overtime that the law requires.',
          },
          { t: 'h', text: 'F. Zoho Projects' },
          {
            t: 'p',
            text: 'Employees must maintain accurate Zoho Projects entries even though operational timekeeping does not by itself convert a salaried employee into an hourly employee or determine legal classification.',
          },
          { t: 'h', text: 'Compliance' },
          {
            t: 'p',
            text: 'Unpaid leave deductions will be proportionate, legally permitted, and calculated consistently with the employment contract and payroll rules.',
          },
        ],
      },
      {
        id: 'in-3',
        num: 'IN-3',
        title: 'Statutory Compliance: PF, ESI, Gratuity & Payroll',
        blocks: [
          {
            t: 'table',
            head: ['Compliance Area', 'Applicability', 'Company Commitment'],
            rows: [
              [
                'Code on Wages, 2019',
                'All employees and covered establishments',
                'Minimum wages, lawful deductions, wage statements, overtime where applicable, equal remuneration, and payment/final-wage timelines will be followed.',
              ],
              [
                'Code on Social Security, 2020',
                'According to statutory thresholds, notifications, wage ceilings, and coverage',
                'KATBOTZ will register, contribute, deduct, report, and provide benefits when PF, ESI, gratuity, maternity, or other social-security provisions apply.',
              ],
              [
                'Employees’ Provident Fund (EPF)',
                'Generally applicable when statutory establishment threshold or voluntary coverage is met',
                'The Company will activate and administer EPF promptly when legally applicable and will make employee deductions and employer contributions at statutory rates.',
              ],
              [
                'Employees’ State Insurance (ESI)',
                'Applicable to covered establishments/areas and employees within the notified wage ceiling',
                'The Company will monitor coverage by location, headcount, establishment type, and wage ceiling and will register when required.',
              ],
              [
                'Gratuity',
                'Applicable when statutory establishment coverage and employee eligibility requirements are met',
                'Gratuity will be calculated and paid under the Social Security Code, transition rules, and legally continuing provisions. Once an establishment is covered, continued coverage rules will be observed.',
              ],
              [
                'Maternity Benefit',
                'Eligible employees in covered establishments',
                'Statutory maternity benefit, nursing breaks, protection from dismissal, and related benefits will be provided.',
              ],
              [
                'State Employment Rules',
                'Based on actual approved work location and establishment coverage',
                'State registration, holidays, working-time, leave, notice, welfare, and record requirements will be monitored and applied.',
              ],
              [
                'Income Tax / TDS',
                'All taxable salary payments',
                'TDS will be deducted and deposited, and Form 16 or other required statements will be issued within statutory timelines.',
              ],
              [
                'Professional Tax',
                'Only where imposed by the employee’s work state or other competent jurisdiction',
                'No professional-tax deduction will be made unless legally applicable to the employee’s approved work location.',
              ],
            ],
          },
          { t: 'h', text: 'A. Automatic Activation' },
          {
            t: 'p',
            text: 'The Company will not represent that a threshold-based benefit is active before statutory coverage begins. Once a legal obligation becomes applicable, the Company will implement registration, payroll deductions, employer contributions, records, returns, notices, and employee communications without requiring a Handbook amendment.',
          },
          { t: 'h', text: 'B. Labour Code Transition' },
          {
            t: 'p',
            text: 'Where new Labour Code rules are not fully notified for a particular subject, legally continuing legacy rules will be followed to the extent consistent with the Codes and official transition guidance.',
          },
          { t: 'h', text: 'C. Employee Cooperation' },
          {
            t: 'p',
            text: 'Employees must provide information and nominations reasonably necessary for statutory registration, tax, insurance, gratuity, or benefit administration.',
          },
          { t: 'h', text: 'Compliance' },
          {
            t: 'p',
            text: 'Finance, HR, and the Company Secretary or designated compliance adviser will review headcount, wage ceilings, work locations, and statutory notifications at least quarterly.',
          },
        ],
      },
      {
        id: 'in-4',
        num: 'IN-4',
        title: 'Leave, Holidays, Encashment & Loss of Pay',
        blocks: [
          {
            t: 'note',
            text: 'Applies to regular full-time India employees. During probation, only statutory leave and any leave expressly approved in writing are guaranteed, consistent with the employment contract.',
          },
          {
            t: 'table',
            head: ['Leave Type', 'Entitlement', 'Carryover / Encashment / Conditions'],
            rows: [
              [
                'Earned Leave / Privilege Leave',
                '12 days annually after written confirmation; accrued monthly and prorated for partial years.',
                'May be carried forward up to 30 days unless a more protective state rule applies. Unused eligible earned leave will be encashed at separation where required by law or the written Company plan.',
              ],
              [
                'Casual Leave',
                '7 days annually after written confirmation.',
                'For urgent personal matters; ordinarily limited to 3 consecutive working days; no carry-forward or encashment unless law requires.',
              ],
              [
                'Sick Leave',
                '6 days annually after written confirmation.',
                'Medical certificate may be required for more than 2 consecutive working days. No carry-forward or encashment unless law requires.',
              ],
              [
                'Maternity Benefit',
                'Up to 26 weeks for eligible employees, together with other statutory maternity protections.',
                'Eligibility, payment, nursing breaks, work-from-home consideration, and related rights follow applicable law.',
              ],
              [
                'Bereavement Leave',
                '3 paid working days on the death of an immediate family member.',
                'May be extended through earned leave, casual leave, or approved unpaid leave.',
              ],
              [
                'Public / Festival Holidays',
                '10–15 holidays annually depending on work state and Company calendar, including 5 designated core holidays.',
                'Annual calendar published; alternate days may apply to client-support roles.',
              ],
              [
                'Unpaid Leave',
                'Available only with approval or where legally protected.',
                'Applied after available paid leave where permitted; may affect discretionary benefits and utilization but not protected rights.',
              ],
            ],
          },
          { t: 'h', text: 'A. Request Procedures' },
          {
            t: 'ul',
            items: [
              'Leave must be requested through the HR system;',
              'Earned leave should ordinarily be requested 5 business days in advance;',
              'Emergency absence must be communicated promptly and formally entered within 24 hours where practicable.',
            ],
          },
          { t: 'h', text: 'B. Manager Obligations' },
          {
            t: 'p',
            text: 'Managers must respond within **48 business hours** where practicable. Approval remains subject to law, client delivery, staffing, and operational continuity. A protected statutory leave cannot be denied because of project preference.',
          },
          { t: 'h', text: 'C. Loss of Pay' },
          {
            t: 'p',
            text: 'Loss-of-pay deductions may be made for unauthorized absence, absence beyond available leave, or approved unpaid leave. Deductions must be proportionate and permitted by law and the contract.',
          },
          { t: 'h', text: 'D. Encashment' },
          {
            t: 'p',
            text: 'Earned-leave encashment at separation will be calculated using the legally required wage base and state rule. Casual and sick leave are not encashable unless the applicable law or a written plan expressly requires it.',
          },
          { t: 'h', text: 'Compliance' },
          {
            t: 'p',
            text: 'HR will maintain leave balances, statutory records, and location-specific rules. Protected leave will not result in adverse performance treatment or retaliation.',
          },
        ],
      },
      {
        id: 'in-5',
        num: 'IN-5',
        title: 'POSH, Anti-Harassment & Internal Committee',
        blocks: [
          { t: 'h', text: 'Purpose' },
          {
            t: 'p',
            text: 'To prevent and redress sexual harassment in compliance with the Sexual Harassment of Women at Workplace (Prevention, Prohibition and Redressal) Act, 2013 (POSH Act) and to maintain a respectful physical and digital workplace.',
          },
          { t: 'h', text: 'Scope' },
          {
            t: 'p',
            text: 'All India employees, interns, contractors, visitors, and work-related interactions, including email, chat, video calls, travel, client sites, and off-site events.',
          },
          { t: 'h', text: 'A. Definition of Sexual Harassment' },
          {
            t: 'p',
            text: 'Includes unwelcome physical contact or advances, demands or requests for sexual favors, sexually colored remarks, showing pornography, and any other unwelcome physical, verbal, non-verbal, written, or digital conduct of a sexual nature.',
          },
          { t: 'h', text: 'B. Internal Committee (IC)' },
          { t: 'p', text: 'Where the statutory threshold is met, the Company will maintain an Internal Committee with:' },
          {
            t: 'ul',
            items: [
              'A senior woman as Presiding Officer;',
              'At least two employee members with appropriate commitment or knowledge;',
              'An external member familiar with sexual-harassment issues;',
              'At least one-half women members.',
            ],
          },
          {
            t: 'p',
            text: 'Where an Internal Committee is not legally constituted, employees retain access to the statutory Local Committee.',
          },
          { t: 'h', text: 'C. Complaint Process' },
          {
            t: 'ul',
            items: [
              'A complaint should ordinarily be submitted in writing within **3 months** of the incident or last incident, subject to statutory extension;',
              'HR or the Committee will provide reasonable assistance to reduce a verbal complaint to writing where required;',
              'The Committee may consider conciliation only at the complainant’s request and without monetary settlement;',
              'The Committee will conduct a confidential inquiry consistent with natural justice, recommend interim relief, and issue findings within statutory timelines.',
            ],
          },
          { t: 'h', text: 'D. Confidentiality & Non-Retaliation' },
          {
            t: 'ul',
            items: [
              'The identity of the parties, complaint, inquiry, evidence, recommendations, and action are confidential except as legally permitted;',
              'Retaliation, victimization, intimidation, or interference is prohibited;',
              'A complaint that is not substantiated is not automatically malicious;',
              'Action for a malicious complaint requires the statutory standard and due process.',
            ],
          },
          { t: 'h', text: 'Compliance' },
          {
            t: 'p',
            text: 'Substantiated misconduct may result in disciplinary action up to termination and statutory reporting. The Company will conduct awareness and Committee training and maintain required reports.',
          },
        ],
      },
      {
        id: 'in-6',
        num: 'IN-6',
        title: 'Non-Solicitation & Non-Diversion',
        blocks: [
          { t: 'h', text: 'Purpose' },
          {
            t: 'p',
            text: 'To protect confidential relationships, workforce stability, and legitimate business interests through a narrowly tailored covenant intended to operate without preventing lawful employment or trade.',
          },
          { t: 'h', text: 'Scope' },
          {
            t: 'p',
            text: 'All India employees during employment and for **12 months** after separation, to the maximum extent permitted by applicable law and the signed agreement.',
          },
          { t: 'h', text: 'A. Client Non-Solicitation' },
          {
            t: 'p',
            text: 'During employment and for 12 months after separation, the employee must not directly or indirectly solicit, induce, divert, or attempt to divert a client, active prospect, customer, or business partner with whom the employee had material dealings, responsibility, supervision, or access to Confidential Information during the final 12 months of employment, for the purpose of:',
          },
          {
            t: 'ul',
            items: ['Providing competing services; or', 'Causing a material reduction or termination of the relationship with KATBOTZ.'],
          },
          { t: 'h', text: 'B. Employee Non-Solicitation' },
          {
            t: 'p',
            text: 'During the same period, the employee must not directly target, solicit, induce, recruit, or encourage an employee, consultant, or contractor with whom the employee worked or about whom the employee obtained Confidential Information to leave KATBOTZ or materially reduce services.',
          },
          { t: 'p', text: 'General advertisements not targeted at KATBOTZ personnel and unsolicited applications are excluded.' },
          { t: 'h', text: 'C. Supplier Non-Diversion' },
          {
            t: 'p',
            text: 'The employee must not use Confidential Information to interfere with a material supplier or vendor relationship. Ordinary lawful competition, use of general skills, and acceptance of employment are not prohibited.',
          },
          { t: 'h', text: 'D. Enforceability' },
          {
            t: 'p',
            text: 'This policy is intended to protect confidential and proprietary relationships and is not intended as a blanket restraint on carrying on a lawful profession, trade, or business under **Section 27 of the Indian Contract Act, 1872**. It will be construed and, where legally permitted, narrowed to the maximum enforceable scope.',
          },
          { t: 'h', text: 'E. Remedies' },
          {
            t: 'p',
            text: 'The Company may seek injunctive relief, delivery-up of information, damages, accounting, or other lawful remedies for a breach.',
          },
          { t: 'h', text: 'Compliance' },
          {
            t: 'p',
            text: 'Any proposed enforcement must be reviewed by India employment counsel based on the employee’s role, relationships, access, conduct, and the current law.',
          },
        ],
      },
      {
        id: 'in-7',
        num: 'IN-7',
        title: 'Media & Publicity Consent',
        blocks: [
          { t: 'h', text: 'A. Authorization' },
          { t: 'p', text: 'The employee authorizes KATBOTZ to record, use, reproduce, edit, publish, display, distribute, archive, and communicate the employee’s:' },
          {
            t: 'ul',
            items: [
              'Name, designation, professional biography, voice, photograph, likeness, testimonial, presentation, and work-related contribution;',
              'In internal communications, training, recruitment, websites, social media, proposals, case studies, corporate events, and marketing materials.',
            ],
          },
          {
            t: 'p',
            text: 'The authorization is worldwide, media-neutral, and royalty-free for legitimate Company purposes. KATBOTZ will not knowingly use the material in a defamatory, misleading, humiliating, or unrelated manner.',
          },
          { t: 'h', text: 'B. Compensation' },
          {
            t: 'p',
            text: 'No additional compensation is payable unless separately agreed in writing. The Company may edit material for length, format, branding, accessibility, or technical quality without materially misrepresenting the employee’s statements.',
          },
          { t: 'h', text: 'C. Withdrawal of Consent' },
          {
            t: 'p',
            text: 'The employee may withdraw consent for future use of identified material by reasonable written notice to HR. Withdrawal does not require recall of material already published, printed, distributed, contractually committed, archived, or required for legal records, to the extent permitted by law.',
          },
          { t: 'h', text: 'D. Special Consent' },
          {
            t: 'p',
            text: 'Separate consent will be obtained where a particular use requires specific consent under applicable data-protection law or involves sensitive personal data, private medical information, or a context outside ordinary employment-related publicity.',
          },
          { t: 'h', text: 'Compliance' },
          {
            t: 'p',
            text: 'Marketing and HR must maintain approval records and honor valid future-use withdrawals. Client names, client material, and confidential content require separate authorization.',
          },
        ],
      },
      {
        id: 'in-8',
        num: 'IN-8',
        title: 'Intellectual Property, Work Product & Moral Rights',
        blocks: [
          { t: 'h', text: 'A. Ownership' },
          {
            t: 'p',
            text: 'All Work Product created in the course of employment, in connection with assigned duties, using Company or client resources, or derived from Confidential Information is intended to belong exclusively to KATBOTZ or its designated client.',
          },
          { t: 'h', text: 'B. Assignment' },
          {
            t: 'p',
            text: 'To the fullest extent permitted by law, the employee assigns to KATBOTZ all worldwide rights, title, and interest in Work Product, including:',
          },
          {
            t: 'ul',
            items: [
              'Copyright, patent rights, design rights, database rights, know-how;',
              'Rights in AI/ML systems, datasets, prompts, software, automations, and improvements.',
            ],
          },
          { t: 'h', text: 'C. Cooperation' },
          {
            t: 'p',
            text: 'The employee must promptly disclose Work Product and execute documents reasonably required to evidence, perfect, register, enforce, or transfer ownership during and after employment.',
          },
          { t: 'h', text: 'D. Moral Rights' },
          {
            t: 'p',
            text: 'To the extent legally permissible, the employee waives and agrees not to assert moral rights; where waiver is ineffective, the employee consents to reasonable modification and use.',
          },
          { t: 'h', text: 'E. Pre-Existing & Third-Party Materials' },
          {
            t: 'ul',
            items: [
              'Pre-existing materials must be disclosed in writing before or at signing;',
              'If approved pre-existing material is incorporated, the employee grants the perpetual, irrevocable, worldwide, royalty-free, transferable license stated in the employment agreement;',
              'Third-party, open-source, licensed, or client-owned materials may not be incorporated without approval, license review, attribution, and compliance with security and distribution obligations.',
            ],
          },
          { t: 'h', text: 'Compliance' },
          {
            t: 'p',
            text: 'Unauthorized retention, use, disclosure, licensing, publication, or commercialization of Work Product may result in termination and legal remedies.',
          },
        ],
      },
      {
        id: 'in-9',
        num: 'IN-9',
        title: 'Termination, Resignation, Notice & Dispute Resolution',
        blocks: [
          { t: 'h', text: 'A. Notice Periods' },
          {
            t: 'ul',
            items: [
              '**During probation:** 5 business days or salary in lieu, subject to law;',
              '**After written confirmation:** 30 days for termination by the Company or resignation by the employee, unless a signed amendment provides otherwise.',
            ],
          },
          { t: 'h', text: 'B. Waiver' },
          {
            t: 'p',
            text: 'KATBOTZ may waive all or part of a notice period and may make separation effective immediately, with or without payment in lieu, to the extent permitted by law and the contract.',
          },
          { t: 'h', text: 'C. Termination for Cause' },
          { t: 'p', text: 'Termination for cause may be immediate after any legally required inquiry or opportunity to respond. Cause includes:' },
          {
            t: 'ul',
            items: [
              'Material contract or policy breach;',
              'Fraud or dishonesty;',
              'Insubordination;',
              'Gross negligence;',
              'Confidentiality or security breach;',
              'Unlawful conduct;',
              'Serious harassment;',
              'Material harm to the Company or client.',
            ],
          },
          { t: 'h', text: 'D. Notice Period Obligations' },
          {
            t: 'p',
            text: 'The employee must continue duties, knowledge transfer, timesheets, and return-of-property obligations during notice unless directed otherwise. Discretionary compensation not approved and paid remains subject to the contract and bonus policy.',
          },
          { t: 'h', text: 'E. Final Settlement' },
          { t: 'p', text: 'Final settlement will include:' },
          {
            t: 'ul',
            items: ['Earned salary and legally payable amounts;', 'Approved expenses;', 'Earned-leave encashment where required.'],
          },
          { t: 'p', text: 'Lawful deductions or recoveries require proper basis and process.' },
          { t: 'h', text: 'F. Dispute Resolution' },
          {
            t: 'p',
            text: 'Disputes will first be addressed through good-faith internal resolution. Unresolved contractual disputes are subject to the arbitration clause in the employment agreement, with **seat and venue in Kullu, Himachal Pradesh**, while preserving access to non-waivable statutory labour forums.',
          },
          { t: 'h', text: 'Compliance' },
          {
            t: 'p',
            text: 'HR and legal counsel must review involuntary termination, cause determinations, notice waiver, final settlement, and arbitration notices.',
          },
        ],
      },
      {
        id: 'in-10',
        num: 'IN-10',
        title: 'Employee Data Privacy & Cross-Border Processing',
        blocks: [
          { t: 'h', text: 'A. Data Collection & Processing' },
          {
            t: 'p',
            text: 'KATBOTZ may collect and process identity, contact, tax, bank, payroll, attendance, performance, immigration, benefit, security, device, access, and work-product data for:',
          },
          {
            t: 'ul',
            items: [
              'Employment administration;',
              'Legal compliance;',
              'Security;',
              'Client delivery;',
              'Legitimate business operations.',
            ],
          },
          { t: 'h', text: 'B. Data Sharing' },
          {
            t: 'p',
            text: 'Data may be shared with affiliates, payroll and benefit providers, professional advisers, clients where necessary, regulators, and service providers under appropriate confidentiality and security controls, including lawful cross-border processing.',
          },
          { t: 'h', text: 'C. Monitoring' },
          {
            t: 'p',
            text: 'Monitoring may include Company email, access logs, authentication events, security alerts, Company-managed devices, client systems, Zoho records, and network activity for security, compliance, investigation, quality, and business-continuity purposes. Monitoring will be proportionate and subject to law.',
          },
          { t: 'h', text: 'D. Employee Responsibilities' },
          { t: 'p', text: 'Employees must:' },
          {
            t: 'ul',
            items: [
              'Provide accurate data;',
              'Follow privacy instructions;',
              'Limit access to need-to-know use;',
              'Report a suspected personal-data breach immediately.',
            ],
          },
          { t: 'h', text: 'E. Consent' },
          {
            t: 'p',
            text: 'Where consent is the legally required basis for a specific activity, separate and specific consent will be obtained; this Handbook does not replace any consent that law requires to be freely given and separately documented.',
          },
          { t: 'h', text: 'Compliance' },
          {
            t: 'p',
            text: 'HR and Security will apply retention, access, correction, deletion, breach-response, and data-principal procedures required by applicable law.',
          },
        ],
      },
      {
        id: 'in-ack',
        num: 'IN Ack.',
        title: 'India Employee Acknowledgment of Receipt & Review',
        blocks: [
          {
            t: 'p',
            text: 'I acknowledge that I received and had an opportunity to review the KATBOTZ Global Employee Handbook, including the India Country Addendum.',
          },
          {
            t: 'p',
            text: 'I understand that my signed employment contract controls specific terms including probation, salary, notice, confidentiality, intellectual property, dispute resolution, and other contractual obligations. This Handbook supplements and does not replace that contract.',
          },
          {
            t: 'p',
            text: 'I agree to comply with lawful Company policies, including Zoho timekeeping, information security, client controls, confidentiality, POSH, data protection, and reporting obligations. I understand that policies may be amended prospectively in accordance with law and my contract.',
          },
          {
            t: 'sign',
            fields: ['Full Name', 'Employee ID', 'Designation / Department', 'Approved Work State', 'Signature', 'Date', 'HR Receipt Date'],
          },
        ],
      },
    ],
  },

  // ──────────────────────────────────────────────── Part IV — Appendices
  {
    id: 'part-4',
    label: 'Part IV',
    title: 'Appendices & Control Schedules',
    scope: 'appendix',
    chapters: [
      {
        id: 'appendix-a',
        num: 'App. A',
        title: 'KPGF Performance Bands',
        blocks: [
          {
            t: 'table',
            head: ['Weighted Score', 'Performance Band', 'Typical Outcome'],
            rows: [
              [
                '4.50 – 5.00',
                'Outstanding',
                'Maximum discretionary payout consideration, fast-track promotion review, and leadership opportunities.',
              ],
              ['3.50 – 4.49', 'Exceeds Expectations', 'Above-average discretionary payout and merit increase consideration.'],
              ['3.00 – 3.49', 'Meets Expectations', 'Standard payout consideration, role continuation, and development goals.'],
              [
                'Below 3.00',
                'Below Expectations',
                '30–90 day performance improvement plan or other corrective action; incentive may be held.',
              ],
            ],
          },
          {
            t: 'note',
            text: 'The bands are decision inputs, not guarantees. Leadership calibration, conduct, security, utilization, financial performance, role scope, market conditions, and contract terms may affect outcomes.',
          },
        ],
      },
      {
        id: 'appendix-b',
        num: 'App. B',
        title: 'Information Security & SOC 2 Employee Checklist',
        blocks: [
          {
            t: 'check',
            items: [
              'Use only approved accounts, devices, repositories, and collaboration tools.',
              'Enable MFA and never share credentials or authentication tokens.',
              'Follow least privilege and report excessive or unnecessary access.',
              'Do not place restricted or internal data into public AI tools.',
              'Apply patches, encryption, endpoint protection, screen lock, and secure network controls.',
              'Report suspected incidents within one hour and preserve relevant evidence.',
              'Complete security and privacy training and required attestations.',
              'Return property, transfer accounts, and delete Company/client data at separation.',
              'Do not make public claims that KATBOTZ is SOC 2 certified or has a SOC 2 report unless formally authorized.',
            ],
          },
        ],
      },
      {
        id: 'appendix-c',
        num: 'App. C',
        title: 'Reporting Channels',
        blocks: [
          {
            t: 'table',
            head: ['Issue', 'Primary Channel', 'Alternate / Escalation'],
            rows: [
              ['General HR, leave, payroll, or grievance', 'peopleops@katbotz.com', 'Reporting Manager or CEO'],
              [
                'Security, privacy, phishing, lost device, or data incident',
                'security@katbotz.com and Reporting Manager',
                'CEO / IT Operations',
              ],
              ['POSH complaint — India', 'Designated Internal Committee / HR', 'Statutory Local Committee where applicable'],
              [
                'Harassment or discrimination — US',
                'HR or any manager',
                'Applicable government agency or alternate management channel',
              ],
              ['Expense or financial-control concern', 'Finance and Reporting Manager', 'CEO / HR'],
              ['Client delivery escalation', 'Project Manager / Global Functional Lead', 'People Operations, then CEO'],
            ],
          },
        ],
      },
      {
        id: 'appendix-d',
        num: 'App. D',
        title: 'Legal Reference Framework',
        blocks: [
          {
            t: 'p',
            text: 'This Handbook is intended to be administered consistently with applicable law as amended. Key legal frameworks include, without limitation:',
          },
          { t: 'h', text: 'United States' },
          {
            t: 'ul',
            items: [
              'Fair Labor Standards Act (FLSA)',
              'Title VII of the Civil Rights Act of 1964',
              'Americans with Disabilities Act (ADA)',
              'Pregnant Workers Fairness Act (PWFA)',
              'Providing Urgent Maternal Protections for Nursing Mothers Act (PUMP Act)',
              'Uniformed Services Employment and Reemployment Rights Act (USERRA)',
              'Form I-9 requirements',
              'National Labor Relations Act (NLRA)',
              'Family and Medical Leave Act (FMLA)',
              'Applicable state and local employment laws (Arizona, Connecticut, Georgia, Massachusetts, New Jersey, Pennsylvania, Texas)',
            ],
          },
          { t: 'h', text: 'India' },
          {
            t: 'ul',
            items: [
              'Indian Contract Act, 1872',
              'Sexual Harassment of Women at Workplace (Prevention, Prohibition and Redressal) Act, 2013 (POSH Act)',
              'Code on Wages, 2019',
              'Code on Social Security, 2020',
              'Industrial Relations Code, 2020',
              'Occupational Safety, Health and Working Conditions Code, 2020',
              'Applicable transition rules',
              'Income Tax Act, 1961',
              'Intellectual property law',
              'Data-protection law (Digital Personal Data Protection Act, 2023)',
              'State employment legislation',
            ],
          },
          { t: 'note', text: 'The applicable law in force at the time controls over any summary in this Handbook.' },
        ],
      },
    ],
  },
]
