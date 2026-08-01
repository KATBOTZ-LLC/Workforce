'use client'

/**
 * Client-side Workforce store implementing the verification-first onboarding
 * workflow (see 04-WORKFLOWS.md). State is persisted to localStorage so the
 * whole app shares one live dataset across pages without a backend.
 */

import React, { createContext, useContext, useEffect, useReducer, useRef } from 'react'

export type WorkerType = 'Employee' | 'Contractor' | 'Intern'
export type Region = 'India' | 'US'
export const regionOf = (location?: string): Region => (location === 'US' ? 'US' : 'India')
export type DocStatus = 'not_uploaded' | 'pending' | 'approved' | 'rejected'
export type Stage =
  | 'invited'            // token created, awaiting uploads
  | 'documents_submitted'// worker submitted all docs
  | 'verifying'          // HR reviewing
  | 'verified'           // all docs approved, ready for account
  | 'active'             // account created, worker onboarded

export const REJECT_REASONS = ['Unclear / Blurry', 'Expired', 'Invalid', 'Incomplete', 'Wrong Document']

export interface WorkerDoc {
  key: string
  label: string
  mandatory?: boolean   // true (default) = required; false = optional
  link?: string         // optional reference/download URL (e.g. a form to fill)
  fileName?: string
  status: DocStatus
  reason?: string
  uploadedAt?: string
}

// India contractors onboard either as an Independent Contractor or via a Staffing Agency (C2C).
export type ContractorMode = 'independent' | 'c2c'

export type GoalPeriod = 'weekly' | 'monthly' | 'yearly'
export interface Goal {
  id: string
  title: string
  deadline?: string
  status: 'todo' | 'in_progress' | 'completed'
  period: GoalPeriod
}

export interface NoteItem {
  id: string
  kind: 'note' | 'todo'
  text: string
  done?: boolean // only meaningful for kind === 'todo'
  createdAt: string
}

export type AttendanceStatus = 'present' | 'leave' | 'absent'
export type LeaveType = 'Paid Leave' | 'Unpaid Leave'
export const LEAVE_TYPES: LeaveType[] = ['Paid Leave', 'Unpaid Leave']

export interface AttendanceRecord {
  date: string // 'YYYY-MM-DD'
  status: AttendanceStatus
  leaveType?: LeaveType // only set when status === 'leave'
  markedAt: string
}

/* Clock in/out session for hourly time tracking */
export type PunchPlace = 'In office' | 'Remote' | 'Outside geofence' | 'Location off' | 'HR-entered'
export interface PunchMeta {
  source: 'self' | 'hr'   // who recorded it
  place: PunchPlace       // geofence classification at punch time
  lat?: number
  lon?: number
}
export interface TimeSession {
  id: string
  date: string   // 'YYYY-MM-DD' the session started on
  in: string     // ISO clock-in timestamp
  out?: string   // ISO clock-out timestamp; undefined = still clocked in
  inMeta?: PunchMeta
  outMeta?: PunchMeta
}

export type ProjectStatus = 'in_progress' | 'completed' | 'on_hold'
export interface Project {
  id: string
  name: string
  lead: string
  startDate: string
  status: ProjectStatus
}

/* Performance management */
export type ReviewPeriod = '30-day' | '60-day' | '90-day' | 'Annual'
export const REVIEW_PERIODS: ReviewPeriod[] = ['30-day', '60-day', '90-day', 'Annual']
export interface Review {
  id: string
  period: ReviewPeriod
  rating: number // 1–5
  feedback: string
  reviewer: string
  createdAt: string
}
export interface FeedbackNote {
  id: string
  text: string
  author: string
  createdAt: string
}

/* ---------- Monthly performance review workflow ---------- */
// Pending → Employee Submitted → Team Lead Review → HR Review → Finalized (Bonus Eligible flagged separately)
export type ReviewStage = 'pending' | 'employee_submitted' | 'team_lead_review' | 'hr_review' | 'finalized'
export const REVIEW_STAGES: ReviewStage[] = ['pending', 'employee_submitted', 'team_lead_review', 'hr_review', 'finalized']
export const REVIEW_STAGE_META: Record<ReviewStage, { label: string; color: string; bg: string }> = {
  pending:            { label: 'Pending',          color: '#64748B', bg: '#F1F5F9' },
  employee_submitted: { label: 'Employee Submitted', color: '#162660', bg: '#E8EEFB' },
  team_lead_review:   { label: 'Team Lead Review',  color: '#B45309', bg: '#FEF3E2' },
  hr_review:          { label: 'HR Review',         color: '#5B77C4', bg: '#EEF2F7' },
  finalized:          { label: 'Finalized',         color: '#0F7A46', bg: '#E8F6EF' },
}
export interface MonthlyReview {
  id: string
  workerId: string
  month: string          // 'YYYY-MM'
  stage: ReviewStage
  selfRating?: number     // 1–5
  selfComment?: string
  selfSubmittedAt?: string
  tlRating?: number
  tlFeedback?: string
  tlBy?: string
  tlAt?: string
  hrRating?: number
  hrFeedback?: string
  hrBy?: string
  hrAt?: string
  bonusApproved?: boolean
  bonusDecidedBy?: string
  bonusDecidedAt?: string
  finalizedAt?: string
  formSentAt?: string     // when HR/TL sent the review form link to the employee
}
export function currentMonth(): string { return todayStr().slice(0, 7) }
export function monthLabel(m: string): string {
  const [y, mo] = m.split('-').map(Number)
  return new Date(Date.UTC(y, mo - 1, 1)).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })
}
export function reviewStageIndex(s: ReviewStage): number { return REVIEW_STAGES.indexOf(s) }
// Bonus eligible when a manager rated the employee higher than their own self-rating.
export function bonusEligible(r: MonthlyReview): boolean {
  if (r.selfRating == null) return false
  return (r.tlRating != null && r.tlRating > r.selfRating) || (r.hrRating != null && r.hrRating > r.selfRating)
}
export function monthlyReviewFor(reviews: MonthlyReview[], workerId: string, month: string): MonthlyReview | undefined {
  return reviews.find(r => r.workerId === workerId && r.month === month)
}

/* Leave management */
export type LeaveStatus = 'pending' | 'approved' | 'rejected'
export interface LeaveRequest {
  id: string
  workerId: string
  type: LeaveType
  from: string   // 'YYYY-MM-DD'
  to: string     // 'YYYY-MM-DD'
  days: number   // business days (weekends excluded)
  reason: string
  status: LeaveStatus
  decidedBy?: string
  decidedAt?: string
  createdAt: string
}
export interface Holiday { id: string; date: string; name: string }

/** Annual leave quota per type; null = uncapped (Unpaid Leave). */
export const LEAVE_QUOTAS: Record<LeaveType, number | null> = {
  'Paid Leave': 12,
  'Unpaid Leave': null, // uncapped for now (quota TBD)
}

export type Gender = 'Male' | 'Female' | 'Other' | 'Prefer not to say'
export type EmploymentType = 'Full-time' | 'Part-time' | 'Contract'
export type EmployeeStatus = 'active' | 'inactive'

export const TIMEZONES = [
  'IST (UTC+5:30)', 'PST (UTC-8:00)', 'EST (UTC-5:00)', 'CST (UTC-6:00)', 'MST (UTC-7:00)',
]

export interface Worker {
  id: string
  token: string

  // Identity
  firstName: string
  lastName: string
  name: string // derived: `${firstName} ${lastName}`, kept for display convenience
  gender: Gender
  dob?: string
  about?: string

  // Contact
  personalEmail: string
  professionalEmail: string
  phone: string

  // Address
  country: string
  state: string
  address: string
  pincode: string
  timezone: string

  // Employment
  type: WorkerType             // Employee / Contractor / Intern / Global Contractor / Global Intern
  contractorMode?: ContractorMode // for India contractors: independent vs staffing-agency (C2C)
  employmentType: EmploymentType
  designation: string
  department: string
  hrLead: string                // exactly one HR lead per worker
  teamLeads: string[]           // one or more team leads
  location: string

  // Org structure (source of truth for access) — see OrgUnit / OrgRole
  unitId?: string               // the org unit (team/department) this person belongs to
  reportsToId?: string          // reporting manager (another worker id); undefined = top of chain
  orgRole?: OrgRole             // access tier; defaults derived from type/department
  status: EmployeeStatus
  dateOfJoining: string
  dateOfExit?: string
  workExperience?: string

  // Onboarding (verification-first workflow)
  createdAt: string
  expiresAt: string
  stage: Stage
  accountCreated: boolean
  documents: WorkerDoc[]

  // Performance & self-service
  goals: Goal[]
  notes: NoteItem[]
  attendance: AttendanceRecord[]
  timeSessions: TimeSession[]
  projects: Project[]
  reviews: Review[]
  feedback: FeedbackNote[]
}

export interface Notification {
  id: string
  workerId?: string
  title: string
  message: string
  kind: 'info' | 'success' | 'warning' | 'error'
  read: boolean
  createdAt: string
}

export interface Activity {
  id: string
  message: string
  color: string
  createdAt: string
}

/* ===================== Org structure & access control ===================== */

// Access tiers, highest authority first. The org chart derives access from these + reporting lines.
export type OrgRole = 'founder' | 'hr' | 'employee' | 'contractor' | 'intern'
export const ORG_ROLES: OrgRole[] = ['founder', 'hr', 'employee', 'contractor', 'intern']
export const ORG_ROLE_META: Record<OrgRole, { label: string; color: string; bg: string; rank: number }> = {
  founder:    { label: 'Founder',    color: '#162660', bg: '#E8EEFB', rank: 5 },
  hr:         { label: 'HR / Admin', color: '#0F7A46', bg: '#E8F6EF', rank: 4 },
  employee:   { label: 'Employee',   color: '#334155', bg: '#EEF2F7', rank: 3 },
  contractor: { label: 'Contractor', color: '#B45309', bg: '#FEF3E2', rank: 2 },
  intern:     { label: 'Intern',     color: '#800020', bg: '#F7E7EA', rank: 1 },
}

// An org unit is any node in the structure: company root, department, domain, team, or sub-team.
// Unlimited depth via parentId (null = company root). Fully dynamic — nothing hardcoded.
export type OrgUnitKind = 'company' | 'department' | 'domain' | 'team' | 'subteam'
export const ORG_UNIT_KINDS: OrgUnitKind[] = ['company', 'department', 'domain', 'team', 'subteam']
export interface OrgUnit {
  id: string
  name: string
  kind: OrgUnitKind
  parentId: string | null   // null = company root
  leadId?: string           // worker id of the unit's lead/head
  createdAt: string
}

// Immutable record of every structural change — who, what, before, after, when.
export interface AuditEntry {
  id: string
  actor: string             // who made the change
  action: string            // machine-ish verb, e.g. 'move_worker'
  summary: string           // human-readable one-liner
  before?: string
  after?: string
  createdAt: string
}

/* ---------- org-structure helpers ---------- */
export function unitById(units: OrgUnit[], id?: string): OrgUnit | undefined {
  return id ? units.find(u => u.id === id) : undefined
}
export function unitChildren(units: OrgUnit[], id: string | null): OrgUnit[] {
  return units.filter(u => u.parentId === id)
}
// Chain from a unit up to the company root (inclusive), leaf-first.
export function unitChain(units: OrgUnit[], id?: string): OrgUnit[] {
  const chain: OrgUnit[] = []
  let cur = unitById(units, id)
  const seen = new Set<string>()
  while (cur && !seen.has(cur.id)) { seen.add(cur.id); chain.push(cur); cur = unitById(units, cur.parentId || undefined) }
  return chain
}
// All descendant unit ids (inclusive of the unit itself).
export function unitDescendants(units: OrgUnit[], id: string): string[] {
  const out = [id]
  const stack = [id]
  while (stack.length) {
    const cur = stack.pop()!
    units.filter(u => u.parentId === cur).forEach(c => { out.push(c.id); stack.push(c.id) })
  }
  return out
}
// Nearest department-kind ancestor's name (for the denormalized worker.department).
export function departmentNameForUnit(units: OrgUnit[], id?: string): string | undefined {
  const chain = unitChain(units, id)
  return (chain.find(u => u.kind === 'department') || chain.find(u => u.kind !== 'company'))?.name
}
// Would moving `unitId` under `newParentId` create a cycle?
export function wouldCycle(units: OrgUnit[], unitId: string, newParentId: string | null): boolean {
  if (!newParentId) return false
  return unitDescendants(units, unitId).includes(newParentId)
}

// Default access tier from a worker's type/department — used to seed and to fill gaps.
export function defaultOrgRole(w: Pick<Worker, 'type' | 'department' | 'designation'>): OrgRole {
  if (w.type.includes('Intern')) return 'intern'
  if (w.type.includes('Contractor')) return 'contractor'
  if (w.department === 'HR' || /\bhr\b|people/i.test(w.designation)) return 'hr'
  return 'employee'
}

/* ---------- access control derived from the org chart ---------- */
export interface AccessScope {
  role: OrgRole
  canEditStructure: boolean          // may modify the org chart (founder + hr)
  unitIds: string[] | 'all'          // org units this person can see into
  workerIds: string[] | 'all'        // people this person can view
}
// Everyone who (transitively) reports to `managerId`.
export function reportsUnder(workers: Worker[], managerId: string): string[] {
  const out: string[] = []
  const stack = [managerId]
  const seen = new Set<string>()
  while (stack.length) {
    const cur = stack.pop()!
    workers.filter(w => w.reportsToId === cur).forEach(r => { if (!seen.has(r.id)) { seen.add(r.id); out.push(r.id); stack.push(r.id) } })
  }
  return out
}
// Compute what a given viewer can see, purely from their position in the chart.
export function accessScope(state: { workers: Worker[]; orgUnits: OrgUnit[] }, viewerId?: string): AccessScope {
  const me = viewerId ? state.workers.find(w => w.id === viewerId) : undefined
  const role: OrgRole = me?.orgRole || (me ? defaultOrgRole(me) : 'employee')
  // Founder & HR/Admin: unrestricted.
  if (role === 'founder' || role === 'hr') {
    return { role, canEditStructure: true, unitIds: 'all', workerIds: 'all' }
  }
  if (!me) return { role, canEditStructure: false, unitIds: [], workerIds: [] }
  // Units this person leads (their subtree) + their own unit.
  const ledUnitIds = state.orgUnits.filter(u => u.leadId === me.id).flatMap(u => unitDescendants(state.orgUnits, u.id))
  const ownUnit = me.unitId ? [me.unitId] : []
  const unitIds = Array.from(new Set([...ownUnit, ...ledUnitIds]))
  // People: self + everyone in visible units + everyone reporting under me.
  const inUnits = state.workers.filter(w => w.unitId && unitIds.includes(w.unitId)).map(w => w.id)
  const workerIds = Array.from(new Set([me.id, ...inUnits, ...reportsUnder(state.workers, me.id)]))
  return { role, canEditStructure: false, unitIds, workerIds }
}
export function scopeCanView(scope: AccessScope, workerId: string): boolean {
  return scope.workerIds === 'all' || scope.workerIds.includes(workerId)
}

/* Required documents per worker type */
export interface DocReq { key: string; label: string; mandatory: boolean; link?: string }

/* USA — Independent Contractor */
const US_CONTRACTOR_INDEPENDENT: DocReq[] = [
  { key: 'govid', label: 'Government-issued ID (Driver’s License, Passport, or State ID)', mandatory: true },
  { key: 'ssn', label: 'Social Security Number (SSN)', mandatory: true },
  { key: 'workauth', label: 'Work Authorization (Green Card, Work Visa, etc.)', mandatory: false },
  { key: 'edu', label: 'Educational Certificates (college / university degrees)', mandatory: true },
  { key: 'empverif', label: 'Previous Employment Verification (Offer / Experience Letters)', mandatory: true },
  { key: 'bank', label: 'Bank Account Details (Direct Deposit Form)', mandatory: true },
  { key: 'w9', label: 'Completed W-9 Form', mandatory: true, link: 'https://www.irs.gov/pub/irs-pdf/fw9.pdf' },
]

/* USA — Staffing Agency / C2C */
const US_CONTRACTOR_C2C: DocReq[] = [
  { key: 'ein', label: 'Employer Identification Number (EIN)', mandatory: true },
  { key: 'statereg', label: 'State Business & Tax Registration', mandatory: true },
  { key: 'bizlicense', label: 'Business License, Incorporation Certificate, or Operating Agreement', mandatory: true },
  { key: 'companybank', label: 'Bank Account Details of the Company', mandatory: true },
  { key: 'candidateid', label: 'Candidate’s Government-issued ID (Driver’s License, Passport, or State ID)', mandatory: true },
  { key: 'candidateedu', label: 'Candidate’s Educational Certificates and Work Experience Letters', mandatory: true },
]

/* India — Independent Contractor */
const IN_CONTRACTOR_INDEPENDENT: DocReq[] = [
  { key: 'poi', label: 'Proof of Identity (Passport / Aadhaar / Driving License)', mandatory: true },
  { key: 'poa', label: 'Proof of Address (Passport / Aadhaar / Utility Bill)', mandatory: true },
  { key: 'edu', label: 'Educational Certificates (latest degree/diploma)', mandatory: true },
  { key: 'expletter', label: 'Work Experience Letters', mandatory: true },
  { key: 'relieving', label: 'Relieving Letter from Previous Employer', mandatory: true },
  { key: 'bankdetails', label: 'Bank Account Details (for payroll setup)', mandatory: true },
  { key: 'bankproof', label: 'Proof of Bank Account (Cancelled Cheque / Passbook / Statement)', mandatory: true },
  { key: 'pan', label: 'PAN Card', mandatory: true },
  { key: 'photo', label: 'Recent passport-sized photograph', mandatory: true },
]

/* India — Staffing Agency / C2C */
const IN_CONTRACTOR_C2C: DocReq[] = [
  { key: 'agencyreg', label: 'Agency Registration Certificate (Incorporation / ROC)', mandatory: true },
  { key: 'gst', label: 'GST Registration Certificate', mandatory: true },
  { key: 'msmed', label: 'MSMED Registration Number', mandatory: true },
  { key: 'companypan', label: 'PAN Card of the Company', mandatory: true },
  { key: 'bizaddr', label: 'Proof of Business Address (Utility bill / Rent agreement)', mandatory: true },
  { key: 'companybank', label: 'Bank Account Details of the Company', mandatory: true },
  { key: 'bankproof', label: 'Proof of Bank Account (Cancelled Cheque / Passbook / Statement)', mandatory: true },
  { key: 'labourlicense', label: 'Labour License', mandatory: false },
  { key: 'ptax', label: 'Professional Tax Registration', mandatory: false },
  { key: 'compliance', label: 'Compliance Certificates', mandatory: false },
  { key: 'candidateaadhaar', label: "Candidate's Aadhaar Card", mandatory: true },
  { key: 'candidateedu', label: "Candidate's Educational & Work Experience Certificates", mandatory: true },
]

/* India — Employee */
const IN_EMPLOYEE: DocReq[] = [
  { key: 'pan', label: 'PAN Card', mandatory: true },
  { key: 'aadhaar', label: 'Aadhaar', mandatory: true },
  { key: 'degree', label: 'Degree Certificate', mandatory: true },
  { key: 'tenth', label: '10th Marksheet', mandatory: true },
  { key: 'twelfth', label: '12th Marksheet', mandatory: true },
  { key: 'bank', label: 'Bank Proof', mandatory: true },
]
/* USA — Employee */
const US_EMPLOYEE: DocReq[] = [
  { key: 'govid', label: 'Government-issued ID (Driver’s License, Passport, or State ID)', mandatory: true },
  { key: 'ssn', label: 'Social Security Number (SSN)', mandatory: true },
  { key: 'i9', label: 'Form I-9 (Employment Eligibility Verification)', mandatory: true },
  { key: 'w4', label: 'Completed W-4 Form', mandatory: true, link: 'https://www.irs.gov/pub/irs-pdf/fw4.pdf' },
  { key: 'workauth', label: 'Work Authorization (Green Card / Work Visa, if applicable)', mandatory: false },
  { key: 'edu', label: 'Educational Certificates (college / university degrees)', mandatory: true },
  { key: 'empverif', label: 'Previous Employment Verification (Offer / Experience Letters)', mandatory: true },
  { key: 'bank', label: 'Bank Account Details (Direct Deposit Form)', mandatory: true },
]

/* India — Intern */
const IN_INTERN: DocReq[] = [
  { key: 'passport', label: 'Copy of Passport (first and last pages)', mandatory: true },
  { key: 'pan', label: 'PAN Card', mandatory: true },
  { key: 'aadhaar', label: 'Aadhaar Card', mandatory: true },
  { key: 'edu', label: 'Educational certificates (latest degree / semester marksheets)', mandatory: true },
  { key: 'resume', label: 'Updated resume', mandatory: true },
  { key: 'bank', label: 'Bank account details (for stipend processing)', mandatory: false },
  { key: 'contract', label: 'Signed internship contract', mandatory: false },
  { key: 'emergency', label: 'Emergency contact information form', mandatory: true },
  { key: 'addressproof', label: 'Address proof (utility bill / bank statement, not older than 3 months)', mandatory: true },
]
/* USA — Intern */
const US_INTERN: DocReq[] = [
  { key: 'ead', label: 'Employment Authorization Document (EAD) Card', mandatory: true },
  { key: 'i20', label: 'Updated Form I-20 (with DSO signature reflecting OPT authorization)', mandatory: true },
  { key: 'passport', label: 'Passport copy (for identity verification)', mandatory: true },
  { key: 'ssn', label: 'Social Security Number (SSN)', mandatory: false },
  { key: 'i94', label: 'Form I-94 (Arrival / Departure Record)', mandatory: true },
  { key: 'f1visa', label: 'Copy of F-1 Visa', mandatory: false },
  { key: 'resume', label: 'Updated resume', mandatory: true },
  { key: 'contract', label: 'Signed internship contract', mandatory: false },
  { key: 'additional', label: 'Any additional documents requested by your DSO or university', mandatory: false },
]

// Resolve the required-document list from worker type × region (India/US) × contractor engagement mode.
export function docRequirements(o: { type: WorkerType; location?: string; contractorMode?: ContractorMode }): DocReq[] {
  const us = regionOf(o.location) === 'US'
  if (o.type === 'Contractor') {
    if (o.contractorMode === 'c2c') return us ? US_CONTRACTOR_C2C : IN_CONTRACTOR_C2C
    return us ? US_CONTRACTOR_INDEPENDENT : IN_CONTRACTOR_INDEPENDENT
  }
  if (o.type === 'Intern') return us ? US_INTERN : IN_INTERN
  return us ? US_EMPLOYEE : IN_EMPLOYEE
}

/* ---------------- helpers ---------------- */
function genToken() {
  const bytes = new Uint8Array(16)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) crypto.getRandomValues(bytes)
  else for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256)
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}
const now = () => new Date().toISOString()
const uid = () => Math.random().toString(36).slice(2, 10)
const plusDays = (d: number) => new Date(Date.now() + d * 864e5).toISOString()

export function docsFor(type: WorkerType, location?: string, contractorMode?: ContractorMode): WorkerDoc[] {
  return docRequirements({ type, location, contractorMode }).map(d => ({ key: d.key, label: d.label, mandatory: d.mandatory, link: d.link, status: 'not_uploaded' as DocStatus }))
}

/* ---------------- seed ---------------- */
// Deterministic seed so server and client first render match (no hydration mismatch).
const SEED_DATE = '2026-07-10T09:00:00.000Z'
function seed(): State {
  const mk = (o: Partial<Worker> & { id: string; token: string; firstName: string; lastName: string; type: WorkerType; stage: Stage }): Worker => {
    const name = `${o.firstName} ${o.lastName}`
    const slug = name.toLowerCase().replace(/\s+/g, '.')
    return {
      id: o.id, token: o.token, firstName: o.firstName, lastName: o.lastName, name,
      gender: o.gender || 'Prefer not to say', dob: o.dob, about: o.about,
      personalEmail: o.personalEmail || `${slug}@gmail.com`,
      professionalEmail: o.professionalEmail || `${slug}@katbotz.com`,
      phone: o.phone || '+91 90000 00000',
      country: o.country || 'India', state: o.state || 'Maharashtra', address: o.address || '—',
      pincode: o.pincode || '400001', timezone: o.timezone || TIMEZONES[0],
      type: o.type, employmentType: o.employmentType || (o.type === 'Intern' ? 'Part-time' : o.type === 'Contractor' ? 'Contract' : 'Full-time'),
      designation: o.designation || o.type, department: o.department || 'Engineering',
      hrLead: o.hrLead || 'Priya Nair', teamLeads: o.teamLeads || ['Ananya Rao'],
      location: o.location || 'India', status: o.status || 'active',
      dateOfJoining: o.dateOfJoining || SEED_DATE.slice(0, 10), dateOfExit: o.dateOfExit, workExperience: o.workExperience,
      createdAt: SEED_DATE, expiresAt: '2026-07-17T09:00:00.000Z',
      stage: o.stage, accountCreated: o.stage === 'active',
      documents: o.documents || docsFor(o.type, o.location), goals: o.goals || [],
      notes: o.notes || [], attendance: o.attendance || [], timeSessions: o.timeSessions || [], projects: o.projects || [],
      reviews: o.reviews || [], feedback: o.feedback || [],
    }
  }
  // doc helpers for seed variety
  const allApproved = (t: WorkerType, loc = 'India') => docsFor(t, loc).map(d => ({ ...d, status: 'approved' as DocStatus, fileName: `${d.key}.pdf`, uploadedAt: SEED_DATE }))
  const partial = (t: WorkerType, approvedCount: number, loc = 'India') => docsFor(t, loc).map((d, i) => ({
    ...d, status: (i < approvedCount ? 'approved' : 'pending') as DocStatus, fileName: `${d.key}.pdf`, uploadedAt: SEED_DATE,
  }))
  const workers: Worker[] = [
    mk({
      id: 'w-rajesh', token: 'seedrajesh0000000000000000000001',
      firstName: 'Rajesh', lastName: 'Kumar', gender: 'Male', dob: '1994-03-12', about: 'Backend engineer focused on platform reliability.',
      type: 'Employee', stage: 'verifying', department: 'Engineering', designation: 'Senior Developer',
      hrLead: 'Priya Nair', teamLeads: ['Ananya Rao'], workExperience: '5 years', dateOfJoining: '2026-07-01',
      documents: docsFor('Employee').map((d, i) => ({ ...d, status: (i === 0 ? 'approved' : 'pending') as DocStatus, fileName: `${d.key}.pdf`, uploadedAt: SEED_DATE })),
    }),
    mk({
      id: 'w-maya', token: 'seedmaya000000000000000000000002',
      firstName: 'Maya', lastName: 'Patel', gender: 'Female', dob: '1991-08-22', about: 'Founder & CEO.',
      type: 'Employee', stage: 'active', department: "CEO's Office", designation: 'Founder & CEO',
      hrLead: 'Priya Nair', teamLeads: ['Ravi Shah', 'Karan Singh'], workExperience: '8 years', dateOfJoining: '2024-01-10',
      documents: docsFor('Employee').map(d => ({ ...d, status: 'approved' as DocStatus, fileName: `${d.key}.pdf`, uploadedAt: SEED_DATE })),
      goals: [
        { id: 'g-maya-1', title: 'Ship onboarding revamp', deadline: '2026-07-17', status: 'in_progress', period: 'weekly' },
        { id: 'g-maya-2', title: 'Finalize Q3 roadmap', deadline: '2026-07-31', status: 'todo', period: 'monthly' },
        { id: 'g-maya-3', title: 'Grow product team to 12', deadline: '2026-12-31', status: 'in_progress', period: 'yearly' },
        { id: 'g-maya-4', title: 'Ship weekly release notes', deadline: '2026-07-10', status: 'completed', period: 'weekly' },
      ],
      notes: [
        { id: 'nt-maya-1', kind: 'todo', text: 'Review PR from Rajesh', done: false, createdAt: SEED_DATE },
        { id: 'nt-maya-2', kind: 'todo', text: 'Prep 1:1 notes for Friday', done: true, createdAt: SEED_DATE },
        { id: 'nt-maya-3', kind: 'note', text: 'Roadmap sync moved to Thursday 4pm', createdAt: SEED_DATE },
      ],
      attendance: [
        { date: '2026-07-06', status: 'present', markedAt: SEED_DATE },
        { date: '2026-07-07', status: 'present', markedAt: SEED_DATE },
        { date: '2026-07-08', status: 'present', markedAt: SEED_DATE },
        { date: '2026-07-09', status: 'present', markedAt: SEED_DATE },
        { date: '2026-07-10', status: 'leave', markedAt: SEED_DATE },
      ],
      timeSessions: [
        { id: 'ts-maya-1', date: '2026-07-08', in: '2026-07-08T09:05:00.000Z', out: '2026-07-08T17:30:00.000Z' },
        { id: 'ts-maya-2', date: '2026-07-09', in: '2026-07-09T09:15:00.000Z', out: '2026-07-09T13:00:00.000Z' },
        { id: 'ts-maya-3', date: '2026-07-09', in: '2026-07-09T14:00:00.000Z', out: '2026-07-09T18:10:00.000Z' },
      ],
      projects: [
        { id: 'pr-maya-1', name: 'Onboarding Revamp', lead: 'Ravi Shah', startDate: '2026-06-01', status: 'in_progress' },
      ],
      reviews: [
        { id: 'rv-maya-1', period: '30-day', rating: 4, feedback: 'Strong start — owned the onboarding revamp and shipped ahead of schedule. Could delegate more.', reviewer: 'Ravi Shah', createdAt: '2026-06-10T09:00:00.000Z' },
        { id: 'rv-maya-2', period: '60-day', rating: 5, feedback: 'Consistently high output and great cross-team communication. Ready for more scope.', reviewer: 'Ravi Shah', createdAt: '2026-07-08T09:00:00.000Z' },
      ],
      feedback: [
        { id: 'fb-maya-1', text: 'Discussed Q3 priorities in our 1:1 — aligned on the roadmap and hiring plan.', author: 'Ravi Shah', createdAt: '2026-07-09T09:00:00.000Z' },
        { id: 'fb-maya-2', text: 'Great job unblocking the design handoff this week.', author: 'Karan Singh', createdAt: '2026-07-11T09:00:00.000Z' },
      ],
    }),
    mk({
      id: 'w-john', token: 'seedjohn000000000000000000000003',
      firstName: 'John', lastName: 'Smith', gender: 'Male', dob: '1988-11-02', about: 'Creative contractor for the US region.',
      type: 'Contractor', stage: 'active', department: 'Social Media', designation: 'Creative Contractor',
      hrLead: 'Priya Nair', teamLeads: ['Ananya Rao'], location: 'US', country: 'United States', state: 'California',
      timezone: TIMEZONES[1], workExperience: '10 years', dateOfJoining: '2023-05-15',
      documents: docsFor('Contractor', 'US').map(d => ({ ...d, status: 'approved' as DocStatus, fileName: `${d.key}.pdf`, uploadedAt: SEED_DATE })),
    }),
    mk({
      id: 'w-sara', token: 'seedsara000000000000000000000004',
      firstName: 'Sara', lastName: 'Khan', gender: 'Female', dob: '2002-02-18', about: 'Social media intern.',
      type: 'Intern', stage: 'invited', department: 'Social Media', designation: 'Social Media Intern',
      hrLead: 'Priya Nair', teamLeads: ['Ravi Shah'], workExperience: '0 years', dateOfJoining: '2026-07-14',
    }),

    /* ---- extra demo variety ---- */
    mk({
      id: 'w-arjun', token: 'seedarjun00000000000000000000005',
      firstName: 'Arjun', lastName: 'Mehta', gender: 'Male', dob: '1993-06-30', about: 'Full-stack engineer, ready for account creation.',
      type: 'Employee', stage: 'verified', department: 'Engineering', designation: 'Software Engineer',
      hrLead: 'Priya Nair', teamLeads: ['Ananya Rao'], workExperience: '4 years', dateOfJoining: '2026-07-05',
      documents: allApproved('Employee'),
    }),
    mk({
      id: 'w-neha', token: 'seedneha00000000000000000000006',
      firstName: 'Neha', lastName: 'Gupta', gender: 'Female', dob: '1990-01-14', about: 'Regional sales lead for North India.',
      type: 'Employee', stage: 'active', department: 'Sales', designation: 'Sales Manager',
      hrLead: 'Karan Singh', teamLeads: ['Ravi Shah'], workExperience: '9 years', dateOfJoining: '2022-09-01',
      documents: allApproved('Employee'),
      goals: [
        { id: 'g-neha-1', title: 'Close Q3 enterprise pipeline', deadline: '2026-09-30', status: 'in_progress', period: 'monthly' },
        { id: 'g-neha-2', title: 'Onboard 3 channel partners', deadline: '2026-12-31', status: 'todo', period: 'yearly' },
      ],
      projects: [{ id: 'pr-neha-1', name: 'Enterprise GTM', lead: 'Ravi Shah', startDate: '2026-04-01', status: 'in_progress' }],
      attendance: [
        { date: '2026-07-13', status: 'present', markedAt: SEED_DATE },
        { date: '2026-07-14', status: 'present', markedAt: SEED_DATE },
        { date: '2026-07-15', status: 'present', markedAt: SEED_DATE },
      ],
    }),
    mk({
      id: 'w-wei', token: 'seedwei000000000000000000000007',
      firstName: 'Wei', lastName: 'Chen', gender: 'Male', dob: '2001-10-05', about: 'Social media intern (US, on OPT).',
      type: 'Intern', stage: 'invited', department: 'Social Media', designation: 'Content Intern',
      hrLead: 'Priya Nair', teamLeads: ['Ananya Rao'], location: 'US', country: 'United States', state: 'California',
      timezone: TIMEZONES[1], workExperience: '0 years', dateOfJoining: '2026-07-20',
    }),
    mk({
      id: 'w-fatima', token: 'seedfatima0000000000000000000008',
      firstName: 'Fatima', lastName: 'Sheikh', gender: 'Female', dob: '1989-04-19', about: 'HR generalist supporting onboarding.',
      type: 'Employee', stage: 'active', department: 'HR', designation: 'HR Associate',
      hrLead: 'Priya Nair', teamLeads: ['Priya Nair'], workExperience: '7 years', dateOfJoining: '2021-11-20',
      documents: allApproved('Employee'),
      goals: [{ id: 'g-fatima-1', title: 'Roll out attendance policy', deadline: '2026-08-15', status: 'in_progress', period: 'monthly' }],
    }),
    mk({
      id: 'w-carlos', token: 'seedcarlos0000000000000000000009',
      firstName: 'Carlos', lastName: 'Ruiz', gender: 'Male', dob: '1992-12-11', about: 'Growth / social contractor (US, via staffing agency).',
      type: 'Contractor', contractorMode: 'c2c', stage: 'verifying', department: 'Social Media', designation: 'Growth Contractor',
      hrLead: 'Karan Singh', teamLeads: ['Ravi Shah'], location: 'US', country: 'United States', state: 'Texas',
      timezone: TIMEZONES[3], workExperience: '6 years', dateOfJoining: '2026-07-08',
      documents: docsFor('Contractor', 'US', 'c2c').map((d, i) => ({ ...d, status: (i < 2 ? 'approved' : 'pending') as DocStatus, fileName: `${d.key}.pdf`, uploadedAt: SEED_DATE })),
    }),
    mk({
      id: 'w-ananya-i', token: 'seedananyai000000000000000000010',
      firstName: 'Ananya', lastName: 'Iyer', gender: 'Female', dob: '2000-07-25', about: 'Engineering intern, converting to full-time.',
      type: 'Intern', stage: 'active', department: 'Engineering', designation: 'Engineering Intern',
      hrLead: 'Priya Nair', teamLeads: ['Ravi Shah', 'Karan Singh'], workExperience: '1 year', dateOfJoining: '2026-02-01',
      documents: allApproved('Intern'),
      goals: [
        { id: 'g-ananyai-1', title: 'Ship user research summary', deadline: '2026-07-18', status: 'completed', period: 'weekly' },
        { id: 'g-ananyai-2', title: 'Own the changelog', deadline: '2026-07-31', status: 'in_progress', period: 'monthly' },
      ],
    }),
    mk({
      id: 'w-diego', token: 'seeddiego00000000000000000000011',
      firstName: 'Diego', lastName: 'Alvarez', gender: 'Male', dob: '1995-03-08', about: 'Backend contractor, mid-verification.',
      type: 'Contractor', stage: 'verifying', department: 'Engineering', designation: 'Backend Contractor',
      hrLead: 'Karan Singh', teamLeads: ['Ananya Rao'], workExperience: '5 years', dateOfJoining: '2026-07-09',
      documents: partial('Contractor', 1),
    }),
    mk({
      id: 'w-mei', token: 'seedmei000000000000000000000012',
      firstName: 'Mei', lastName: 'Lin', gender: 'Female', dob: '1991-09-16', about: 'Engineering manager.',
      type: 'Employee', stage: 'active', department: 'Engineering', designation: 'Engineering Manager',
      hrLead: 'Priya Nair', teamLeads: ['Ravi Shah'], workExperience: '11 years', dateOfJoining: '2020-06-15',
      documents: allApproved('Employee'),
      projects: [{ id: 'pr-mei-1', name: 'Analytics 2.0', lead: 'Karan Singh', startDate: '2026-05-10', status: 'in_progress' }],
    }),
    mk({
      id: 'w-tom', token: 'seedtom000000000000000000000013',
      firstName: 'Tom', lastName: 'Baker', gender: 'Male', dob: '1985-05-02', about: 'Former finance analyst (offboarded).',
      type: 'Employee', stage: 'active', department: 'Finance', designation: 'Finance Analyst',
      hrLead: 'Karan Singh', teamLeads: ['Karan Singh'], workExperience: '12 years', dateOfJoining: '2019-03-01',
      status: 'inactive', dateOfExit: '2026-06-30',
      documents: allApproved('Employee'),
    }),

    /* ---- CEO's Office ---- */
    mk({
      id: 'w-ravi', token: 'seedravi000000000000000000000014',
      firstName: 'Ravi', lastName: 'Shah', gender: 'Male', dob: '1986-02-09', about: 'Chief Operating Officer.',
      type: 'Employee', stage: 'active', department: "CEO's Office", designation: 'Chief Operating Officer',
      hrLead: 'Priya Nair', teamLeads: ['Maya Patel'], workExperience: '14 years', dateOfJoining: '2020-01-05',
      documents: allApproved('Employee'),
    }),

    /* ---- HR ---- */
    mk({
      id: 'w-priya', token: 'seedpriya00000000000000000000015',
      firstName: 'Priya', lastName: 'Nair', gender: 'Female', dob: '1987-06-28', about: 'Head of People & HR.',
      type: 'Employee', stage: 'active', department: 'HR', designation: 'HR Manager',
      hrLead: 'Priya Nair', teamLeads: ['Maya Patel'], workExperience: '13 years', dateOfJoining: '2020-08-01',
      documents: allApproved('Employee'),
    }),
    mk({
      id: 'w-tara', token: 'seedtara00000000000000000000016',
      firstName: 'Tara', lastName: 'Bose', gender: 'Female', dob: '2003-01-30', about: 'HR intern.',
      type: 'Intern', stage: 'active', department: 'HR', designation: 'HR Intern',
      hrLead: 'Priya Nair', teamLeads: ['Priya Nair'], workExperience: '0 years', dateOfJoining: '2026-06-15',
      documents: allApproved('Intern'),
    }),

    /* ---- Finance ---- */
    mk({
      id: 'w-karan', token: 'seedkaran00000000000000000000017',
      firstName: 'Karan', lastName: 'Singh', gender: 'Male', dob: '1984-10-12', about: 'Head of Finance.',
      type: 'Employee', stage: 'active', department: 'Finance', designation: 'Finance Head',
      hrLead: 'Priya Nair', teamLeads: ['Maya Patel'], workExperience: '15 years', dateOfJoining: '2019-07-01',
      documents: allApproved('Employee'),
    }),
    mk({
      id: 'w-dev', token: 'seeddev0000000000000000000000018',
      firstName: 'Dev', lastName: 'Malhotra', gender: 'Male', dob: '2002-11-08', about: 'Finance intern.',
      type: 'Intern', stage: 'active', department: 'Finance', designation: 'Finance Intern',
      hrLead: 'Karan Singh', teamLeads: ['Karan Singh'], workExperience: '0 years', dateOfJoining: '2026-06-20',
      documents: allApproved('Intern'),
    }),

    /* ---- Engineering (more depth) ---- */
    mk({
      id: 'w-isha', token: 'seedisha00000000000000000000019',
      firstName: 'Isha', lastName: 'Verma', gender: 'Female', dob: '1996-04-17', about: 'Frontend developer (US, remote).',
      type: 'Employee', stage: 'active', department: 'Engineering', designation: 'Frontend Developer',
      hrLead: 'Priya Nair', teamLeads: ['Mei Lin'], workExperience: '3 years', dateOfJoining: '2024-09-01',
      location: 'US', country: 'United States', state: 'Washington', timezone: TIMEZONES[1],
      documents: allApproved('Employee', 'US'),
    }),
    mk({
      id: 'w-kabir', token: 'seedkabir00000000000000000000020',
      firstName: 'Kabir', lastName: 'Anand', gender: 'Male', dob: '2003-05-22', about: 'Engineering intern.',
      type: 'Intern', stage: 'active', department: 'Engineering', designation: 'Engineering Intern',
      hrLead: 'Priya Nair', teamLeads: ['Mei Lin'], workExperience: '0 years', dateOfJoining: '2026-06-10',
      documents: allApproved('Intern'),
    }),

    /* ---- Sales (more depth) ---- */
    mk({
      id: 'w-riya', token: 'seedriya00000000000000000000021',
      firstName: 'Riya', lastName: 'Sen', gender: 'Female', dob: '1997-08-03', about: 'Sales executive.',
      type: 'Employee', stage: 'active', department: 'Sales', designation: 'Sales Executive',
      hrLead: 'Karan Singh', teamLeads: ['Neha Gupta'], workExperience: '2 years', dateOfJoining: '2025-02-01',
      documents: allApproved('Employee'),
    }),
    mk({
      id: 'w-aditya', token: 'seedaditya0000000000000000000022',
      firstName: 'Aditya', lastName: 'Rao', gender: 'Male', dob: '2002-12-19', about: 'Sales intern.',
      type: 'Intern', stage: 'active', department: 'Sales', designation: 'Sales Intern',
      hrLead: 'Karan Singh', teamLeads: ['Neha Gupta'], workExperience: '0 years', dateOfJoining: '2026-06-25',
      documents: allApproved('Intern'),
    }),

    /* ---- Social Media (lead) ---- */
    mk({
      id: 'w-zoya', token: 'seedzoya00000000000000000000023',
      firstName: 'Zoya', lastName: 'Khan', gender: 'Female', dob: '1993-03-27', about: 'Social media manager.',
      type: 'Employee', stage: 'active', department: 'Social Media', designation: 'Social Media Manager',
      hrLead: 'Priya Nair', teamLeads: ['Maya Patel'], workExperience: '8 years', dateOfJoining: '2022-04-01',
      documents: allApproved('Employee'),
    }),
  ]
  const notifications: Notification[] = [
    { id: 'n-1', title: 'Documents submitted', message: 'Rajesh Kumar submitted documents for review.', kind: 'info', read: false, createdAt: SEED_DATE },
    { id: 'n-2', title: 'Ready for account', message: 'All documents verified for Arjun Mehta.', kind: 'success', read: false, createdAt: SEED_DATE },
    { id: 'n-3', title: 'Documents submitted', message: 'Carlos Ruiz submitted documents for review.', kind: 'info', read: false, createdAt: SEED_DATE },
    { id: 'n-4', title: 'Onboarding complete', message: 'Maya Patel is fully onboarded.', kind: 'success', read: true, createdAt: SEED_DATE },
    { id: 'n-5', title: 'Worker offboarded', message: 'Tom Baker was marked inactive (exit 30 Jun).', kind: 'warning', read: true, createdAt: SEED_DATE },
  ]
  const activity: Activity[] = [
    { id: 'a-1', message: 'Carlos Ruiz submitted documents', color: '#162660', createdAt: SEED_DATE },
    { id: 'a-2', message: 'Arjun Mehta fully verified', color: '#10B981', createdAt: SEED_DATE },
    { id: 'a-3', message: 'Neha Gupta assigned to Enterprise GTM', color: '#5B77C4', createdAt: SEED_DATE },
    { id: 'a-4', message: 'Rajesh Kumar submitted documents', color: '#162660', createdAt: SEED_DATE },
    { id: 'a-5', message: 'Maya Patel completed onboarding', color: '#10B981', createdAt: SEED_DATE },
    { id: 'a-6', message: 'Tom Baker marked inactive', color: '#800020', createdAt: SEED_DATE },
  ]
  const leaveRequests: LeaveRequest[] = [
    { id: 'lr-1', workerId: 'w-neha', type: 'Paid Leave', from: '2026-07-24', to: '2026-07-25', days: 2, reason: 'Family function', status: 'pending', createdAt: SEED_DATE },
    { id: 'lr-2', workerId: 'w-ananya-i', type: 'Unpaid Leave', from: '2026-07-21', to: '2026-07-21', days: 1, reason: 'Fever', status: 'pending', createdAt: SEED_DATE },
    { id: 'lr-3', workerId: 'w-maya', type: 'Paid Leave', from: '2026-07-14', to: '2026-07-15', days: 2, reason: 'Short trip', status: 'approved', decidedBy: 'Priya Nair', decidedAt: SEED_DATE, createdAt: SEED_DATE },
  ]
  const holidays: Holiday[] = [
    { id: 'h-1', date: '2026-08-15', name: 'Independence Day' },
    { id: 'h-2', date: '2026-10-02', name: 'Gandhi Jayanti' },
    { id: 'h-3', date: '2026-10-20', name: 'Diwali' },
    { id: 'h-4', date: '2026-12-25', name: 'Christmas' },
  ]
  /* --- build the dynamic org structure from the seeded departments --- */
  const FOUNDER_ID = 'w-maya'
  const rootUnit: OrgUnit = { id: 'unit-root', name: 'Katbotz', kind: 'company', parentId: null, createdAt: SEED_DATE }
  const activeWorkers = workers.filter(w => w.status === 'active')
  const deptNames = Array.from(new Set(activeWorkers.map(w => w.department)))
  const deptUnits: OrgUnit[] = deptNames.map((d, i) => ({ id: `unit-dept-${i}`, name: d, kind: 'department', parentId: rootUnit.id, createdAt: SEED_DATE }))
  const orgUnits: OrgUnit[] = [rootUnit, ...deptUnits]
  const rank = (w: Worker) => {
    const s = w.designation.toLowerCase()
    if (/head|director|lead|manager/.test(s)) return 4
    if (/senior|principal|staff/.test(s)) return 3
    if (/contractor|consultant/.test(s)) return 2
    return 1
  }
  // base role + unit assignment
  workers.forEach(w => {
    w.orgRole = w.orgRole || defaultOrgRole(w)
    if (w.status === 'active') { const u = deptUnits.find(x => x.name === w.department); if (u) w.unitId = u.id }
  })
  // department leads = most senior active member (excluding the founder)
  deptUnits.forEach(u => {
    const members = activeWorkers.filter(w => w.department === u.name && w.id !== FOUNDER_ID)
    const lead = [...members].sort((a, b) => rank(b) - rank(a))[0]
    if (lead) u.leadId = lead.id
  })
  // founder sits at the company root
  const founder = workers.find(w => w.id === FOUNDER_ID)
  if (founder) { founder.orgRole = 'founder'; founder.unitId = rootUnit.id; founder.reportsToId = undefined }
  // reporting lines: members → dept lead; dept lead → founder
  activeWorkers.forEach(w => {
    if (w.id === FOUNDER_ID) return
    const u = deptUnits.find(x => x.name === w.department)
    w.reportsToId = u && u.leadId && u.leadId !== w.id ? u.leadId : FOUNDER_ID
  })
  const auditLog: AuditEntry[] = []
  const monthlyReviews: MonthlyReview[] = [
    // finalized months with all three ratings + a bonus example
    { id: 'mr-maya-5', workerId: 'w-maya', month: '2026-05', stage: 'finalized', selfRating: 4, selfComment: 'Shipped the onboarding revamp.', selfSubmittedAt: '2026-05-31T09:00:00.000Z', tlRating: 4, tlFeedback: 'Strong delivery.', tlBy: 'Ravi Shah', tlAt: '2026-06-02T09:00:00.000Z', hrRating: 5, hrFeedback: 'Exceptional cross-team leadership.', hrBy: 'Priya Nair', hrAt: '2026-06-03T09:00:00.000Z', bonusApproved: true, bonusDecidedBy: 'Priya Nair', bonusDecidedAt: '2026-06-04T09:00:00.000Z', finalizedAt: '2026-06-04T09:00:00.000Z' },
    { id: 'mr-maya-6', workerId: 'w-maya', month: '2026-06', stage: 'finalized', selfRating: 5, selfComment: 'Great month.', selfSubmittedAt: '2026-06-30T09:00:00.000Z', tlRating: 4, tlFeedback: 'Consistent.', tlBy: 'Ravi Shah', tlAt: '2026-07-02T09:00:00.000Z', hrRating: 4, hrFeedback: 'Solid.', hrBy: 'Priya Nair', hrAt: '2026-07-03T09:00:00.000Z', finalizedAt: '2026-07-03T09:00:00.000Z' },
    // current month — employee submitted, awaiting reviews
    { id: 'mr-maya-7', workerId: 'w-maya', month: '2026-07', stage: 'employee_submitted', selfRating: 4, selfComment: 'On track with Q3 roadmap.', selfSubmittedAt: SEED_DATE },
    // Rajesh — bonus-eligible finalized (managers rated above self)
    { id: 'mr-rajesh-6', workerId: 'w-rajesh', month: '2026-06', stage: 'finalized', selfRating: 3, selfComment: 'Steady progress.', selfSubmittedAt: '2026-06-30T09:00:00.000Z', tlRating: 4, tlFeedback: 'Underrates himself — great work.', tlBy: 'Mei Lin', tlAt: '2026-07-02T09:00:00.000Z', hrRating: 4, hrFeedback: 'Reliable contributor.', hrBy: 'Priya Nair', hrAt: '2026-07-03T09:00:00.000Z', finalizedAt: '2026-07-03T09:00:00.000Z' },
    // Neha — team-lead review done, awaiting HR
    { id: 'mr-neha-7', workerId: 'w-neha', month: '2026-07', stage: 'team_lead_review', selfRating: 4, selfComment: 'Closed two big deals.', selfSubmittedAt: SEED_DATE, tlRating: 5, tlFeedback: 'Outstanding quarter.', tlBy: 'Ravi Shah', tlAt: SEED_DATE },
  ]
  return { workers, notifications, activity, leaveRequests, holidays, orgUnits, auditLog, monthlyReviews }
}

/* ---------------- reducer ---------------- */
interface State { workers: Worker[]; notifications: Notification[]; activity: Activity[]; leaveRequests: LeaveRequest[]; holidays: Holiday[]; orgUnits: OrgUnit[]; auditLog: AuditEntry[]; monthlyReviews: MonthlyReview[] }

export type NewWorkerInput = Omit<Worker, 'id' | 'token' | 'name' | 'createdAt' | 'expiresAt' | 'stage' | 'accountCreated' | 'documents' | 'goals' | 'notes' | 'attendance' | 'timeSessions' | 'projects' | 'reviews' | 'feedback'>

type Action =
  | { type: 'HYDRATE'; state: State }
  | { type: 'ADD_WORKER'; worker: Worker }
  | { type: 'UPLOAD_DOC'; workerId: string; docKey: string; fileName: string }
  | { type: 'SUBMIT_ALL'; workerId: string }
  | { type: 'VERIFY_DOC'; workerId: string; docKey: string }
  | { type: 'REJECT_DOC'; workerId: string; docKey: string; reason: string }
  | { type: 'CREATE_ACCOUNT'; workerId: string }
  | { type: 'ADD_GOAL'; workerId: string; title: string; deadline?: string; period: GoalPeriod }
  | { type: 'SET_GOAL'; workerId: string; goalId: string; status: Goal['status'] }
  | { type: 'READ_NOTIF'; id: string }
  | { type: 'READ_ALL_NOTIF' }
  | { type: 'ADD_NOTE'; workerId: string; kind: NoteItem['kind']; text: string }
  | { type: 'TOGGLE_NOTE'; workerId: string; noteId: string }
  | { type: 'DELETE_NOTE'; workerId: string; noteId: string }
  | { type: 'MARK_ATTENDANCE'; workerId: string; date: string; status: AttendanceStatus; leaveType?: LeaveType }
  | { type: 'CLOCK_IN'; workerId: string; meta?: PunchMeta }
  | { type: 'CLOCK_OUT'; workerId: string; meta?: PunchMeta }
  | { type: 'ADD_REVIEW'; workerId: string; period: ReviewPeriod; rating: number; feedback: string; reviewer: string }
  | { type: 'ADD_FEEDBACK'; workerId: string; text: string; author: string }
  | { type: 'APPLY_LEAVE'; req: LeaveRequest }
  | { type: 'DECIDE_LEAVE'; id: string; decision: 'approved' | 'rejected'; decidedBy: string }
  | { type: 'ADD_HOLIDAY'; date: string; name: string }
  | { type: 'REMOVE_HOLIDAY'; id: string }
  | { type: 'ASSIGN_PROJECT'; workerId: string; name: string; lead: string; startDate: string }
  | { type: 'SET_PROJECT_STATUS'; workerId: string; projectId: string; status: ProjectStatus }
  | { type: 'SET_EMPLOYEE_STATUS'; workerId: string; status: EmployeeStatus; dateOfExit?: string }
  | { type: 'UPDATE_WORKER'; workerId: string; patch: Partial<Worker> }
  | { type: 'ADD_DOC'; workerId: string; label: string }
  | { type: 'REMOVE_DOC'; workerId: string; docKey: string }
  // Org structure (admin-only) — each mutation appends an AuditEntry
  | { type: 'ADD_UNIT'; unit: OrgUnit; actor: string }
  | { type: 'RENAME_UNIT'; unitId: string; name: string; actor: string }
  | { type: 'SET_UNIT_LEAD'; unitId: string; leadId?: string; actor: string }
  | { type: 'MOVE_UNIT'; unitId: string; parentId: string | null; actor: string }
  | { type: 'DELETE_UNIT'; unitId: string; actor: string }
  | { type: 'MERGE_UNITS'; sourceId: string; targetId: string; actor: string }
  | { type: 'ASSIGN_WORKER_UNIT'; workerId: string; unitId?: string; actor: string }
  | { type: 'SET_MANAGER'; workerId: string; reportsToId?: string; actor: string }
  | { type: 'SET_ORG_ROLE'; workerId: string; orgRole: OrgRole; actor: string }
  | { type: 'SET_DESIGNATION'; workerId: string; designation: string; actor: string }
  // Monthly performance review workflow
  | { type: 'SUBMIT_SELF_REVIEW'; workerId: string; month: string; rating: number; comment: string }
  | { type: 'TL_REVIEW'; reviewId: string; rating: number; feedback: string; by: string }
  | { type: 'HR_REVIEW'; reviewId: string; rating: number; feedback: string; by: string }
  | { type: 'FINALIZE_REVIEW'; reviewId: string; by: string }
  | { type: 'APPROVE_BONUS'; reviewId: string; by: string }
  | { type: 'SEND_REVIEW_FORM'; reviewId: string; by: string }

function pushNotif(s: State, n: Omit<Notification, 'id' | 'read' | 'createdAt'>): Notification[] {
  return [{ id: uid(), read: false, createdAt: now(), ...n }, ...s.notifications]
}
function pushActivity(s: State, message: string, color: string): Activity[] {
  return [{ id: uid(), message, color, createdAt: now() }, ...s.activity].slice(0, 30)
}
function pushAudit(s: State, e: Omit<AuditEntry, 'id' | 'createdAt'>): AuditEntry[] {
  return [{ id: uid(), createdAt: now(), ...e }, ...(s.auditLog || [])].slice(0, 200)
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'HYDRATE':
      return action.state

    case 'ADD_WORKER': {
      const w = action.worker
      return {
        ...state,
        workers: [w, ...state.workers],
        notifications: pushNotif(state, { workerId: w.id, title: 'Onboarding link created', message: `Link generated for ${w.name}.`, kind: 'info' }),
        activity: pushActivity(state, `Onboarding link created for ${w.name}`, '#5B77C4'),
      }
    }

    case 'UPLOAD_DOC': {
      const workers = state.workers.map(w => {
        if (w.id !== action.workerId) return w
        const documents = w.documents.map(d =>
          d.key === action.docKey ? { ...d, fileName: action.fileName, status: 'pending' as DocStatus, reason: undefined, uploadedAt: now() } : d
        )
        return { ...w, documents }
      })
      return { ...state, workers }
    }

    case 'SUBMIT_ALL': {
      const w = state.workers.find(x => x.id === action.workerId)
      const workers = state.workers.map(x => x.id === action.workerId ? { ...x, stage: 'verifying' as Stage } : x)
      return {
        ...state, workers,
        notifications: w ? pushNotif(state, { workerId: w.id, title: 'Documents submitted', message: `${w.name} submitted documents for review.`, kind: 'info' }) : state.notifications,
        activity: w ? pushActivity(state, `${w.name} submitted documents`, '#162660') : state.activity,
      }
    }

    case 'VERIFY_DOC': {
      const before = state.workers.find(w => w.id === action.workerId)
      const workers = state.workers.map(w => {
        if (w.id !== action.workerId) return w
        const documents = w.documents.map(d => d.key === action.docKey ? { ...d, status: 'approved' as DocStatus, reason: undefined } : d)
        // Ready for account when every MANDATORY doc is approved; optional docs don't block.
        const allApproved = documents.every(d => d.mandatory === false || d.status === 'approved')
        return { ...w, documents, stage: allApproved ? ('verified' as Stage) : w.stage }
      })
      const after = workers.find(w => w.id === action.workerId)
      const becameVerified = before?.stage !== 'verified' && after?.stage === 'verified' ? after : null
      let s: State = { ...state, workers }
      if (becameVerified) {
        s = {
          ...s,
          notifications: pushNotif(s, { workerId: becameVerified.id, title: 'Ready for account', message: `All documents verified for ${becameVerified.name}.`, kind: 'success' }),
          activity: pushActivity(s, `${becameVerified.name} fully verified`, '#10B981'),
        }
      }
      return s
    }

    case 'REJECT_DOC': {
      const w = state.workers.find(x => x.id === action.workerId)
      const workers = state.workers.map(x => {
        if (x.id !== action.workerId) return x
        const documents = x.documents.map(d => d.key === action.docKey ? { ...d, status: 'rejected' as DocStatus, reason: action.reason } : d)
        return { ...x, documents }
      })
      const doc = w?.documents.find(d => d.key === action.docKey)
      return {
        ...state, workers,
        notifications: w ? pushNotif(state, { workerId: w.id, title: 'Document rejected', message: `${doc?.label} rejected: ${action.reason}. Please re-upload.`, kind: 'error' }) : state.notifications,
        activity: w ? pushActivity(state, `${doc?.label} rejected for ${w.name}`, '#800020') : state.activity,
      }
    }

    case 'CREATE_ACCOUNT': {
      const w = state.workers.find(x => x.id === action.workerId)
      const workers = state.workers.map(x => x.id === action.workerId ? { ...x, accountCreated: true, stage: 'active' as Stage } : x)
      return {
        ...state, workers,
        notifications: w ? pushNotif(state, { workerId: w.id, title: 'Account created', message: `${w.professionalEmail} is ready. Welcome email sent.`, kind: 'success' }) : state.notifications,
        activity: w ? pushActivity(state, `${w.name} account created`, '#162660') : state.activity,
      }
    }

    case 'ADD_GOAL': {
      const workers = state.workers.map(w => w.id === action.workerId
        ? { ...w, goals: [...w.goals, { id: uid(), title: action.title, deadline: action.deadline, status: 'todo' as Goal['status'], period: action.period }] }
        : w)
      return { ...state, workers }
    }

    case 'SET_GOAL': {
      const workers = state.workers.map(w => w.id === action.workerId
        ? { ...w, goals: w.goals.map(g => g.id === action.goalId ? { ...g, status: action.status } : g) }
        : w)
      return { ...state, workers }
    }

    case 'READ_NOTIF':
      return { ...state, notifications: state.notifications.map(n => n.id === action.id ? { ...n, read: true } : n) }
    case 'READ_ALL_NOTIF':
      return { ...state, notifications: state.notifications.map(n => ({ ...n, read: true })) }

    case 'ADD_NOTE': {
      const workers = state.workers.map(w => w.id === action.workerId
        ? { ...w, notes: [{ id: uid(), kind: action.kind, text: action.text, done: action.kind === 'todo' ? false : undefined, createdAt: now() }, ...w.notes] }
        : w)
      return { ...state, workers }
    }

    case 'TOGGLE_NOTE': {
      const workers = state.workers.map(w => w.id === action.workerId
        ? { ...w, notes: w.notes.map(n => n.id === action.noteId ? { ...n, done: !n.done } : n) }
        : w)
      return { ...state, workers }
    }

    case 'DELETE_NOTE': {
      const workers = state.workers.map(w => w.id === action.workerId
        ? { ...w, notes: w.notes.filter(n => n.id !== action.noteId) }
        : w)
      return { ...state, workers }
    }

    case 'MARK_ATTENDANCE': {
      const leaveType = action.status === 'leave' ? action.leaveType : undefined
      const workers = state.workers.map(w => {
        if (w.id !== action.workerId) return w
        const existing = w.attendance.find(a => a.date === action.date)
        const attendance = existing
          ? w.attendance.map(a => a.date === action.date ? { ...a, status: action.status, leaveType, markedAt: now() } : a)
          : [...w.attendance, { date: action.date, status: action.status, leaveType, markedAt: now() }]
        return { ...w, attendance }
      })
      return { ...state, workers }
    }

    case 'CLOCK_IN': {
      const workers = state.workers.map(w => {
        if (w.id !== action.workerId) return w
        // ignore if already clocked in (an open session exists)
        if (w.timeSessions.some(s => !s.out)) return w
        return { ...w, timeSessions: [...w.timeSessions, { id: uid(), date: todayStr(), in: now(), inMeta: action.meta }] }
      })
      return { ...state, workers }
    }

    case 'CLOCK_OUT': {
      const workers = state.workers.map(w => {
        if (w.id !== action.workerId) return w
        // close the most recent open session
        const openIdx = [...w.timeSessions].reverse().findIndex(s => !s.out)
        if (openIdx === -1) return w
        const realIdx = w.timeSessions.length - 1 - openIdx
        const timeSessions = w.timeSessions.map((s, i) => i === realIdx ? { ...s, out: now(), outMeta: action.meta } : s)
        return { ...w, timeSessions }
      })
      return { ...state, workers }
    }

    case 'ADD_REVIEW': {
      const w = state.workers.find(x => x.id === action.workerId)
      const workers = state.workers.map(x => x.id === action.workerId
        ? { ...x, reviews: [{ id: uid(), period: action.period, rating: action.rating, feedback: action.feedback, reviewer: action.reviewer, createdAt: now() }, ...x.reviews] }
        : x)
      return {
        ...state, workers,
        notifications: w ? pushNotif(state, { workerId: w.id, title: 'New performance review', message: `${action.reviewer} submitted a ${action.period} review (${action.rating}/5).`, kind: 'info' }) : state.notifications,
        activity: w ? pushActivity(state, `${action.period} review added for ${w.name}`, '#162660') : state.activity,
      }
    }

    case 'ADD_FEEDBACK': {
      const workers = state.workers.map(x => x.id === action.workerId
        ? { ...x, feedback: [{ id: uid(), text: action.text, author: action.author, createdAt: now() }, ...x.feedback] }
        : x)
      return { ...state, workers }
    }

    case 'APPLY_LEAVE': {
      const w = state.workers.find(x => x.id === action.req.workerId)
      return {
        ...state,
        leaveRequests: [action.req, ...state.leaveRequests],
        notifications: w ? pushNotif(state, { workerId: w.id, title: 'Leave request submitted', message: `${w.name} requested ${action.req.days}d ${action.req.type}.`, kind: 'info' }) : state.notifications,
        activity: w ? pushActivity(state, `${w.name} applied for ${action.req.type}`, '#5B77C4') : state.activity,
      }
    }

    case 'DECIDE_LEAVE': {
      const req = state.leaveRequests.find(r => r.id === action.id)
      if (!req || req.status !== 'pending') return state
      const leaveRequests = state.leaveRequests.map(r => r.id === action.id
        ? { ...r, status: action.decision, decidedBy: action.decidedBy, decidedAt: now() } : r)
      let workers = state.workers
      // on approval, auto-mark those weekdays as leave on the attendance calendar
      if (action.decision === 'approved') {
        const dates = businessDaysBetween(req.from, req.to)
        workers = state.workers.map(w => {
          if (w.id !== req.workerId) return w
          let attendance = w.attendance
          for (const d of dates) {
            const exists = attendance.find(a => a.date === d)
            attendance = exists
              ? attendance.map(a => a.date === d ? { ...a, status: 'leave' as AttendanceStatus, leaveType: req.type, markedAt: now() } : a)
              : [...attendance, { date: d, status: 'leave' as AttendanceStatus, leaveType: req.type, markedAt: now() }]
          }
          return { ...w, attendance }
        })
      }
      const w = state.workers.find(x => x.id === req.workerId)
      return {
        ...state, leaveRequests, workers,
        notifications: w ? pushNotif(state, { workerId: w.id, title: `Leave ${action.decision}`, message: `${req.type} (${req.from} → ${req.to}) was ${action.decision} by ${action.decidedBy}.`, kind: action.decision === 'approved' ? 'success' : 'error' }) : state.notifications,
        activity: w ? pushActivity(state, `${w.name}'s ${req.type} ${action.decision}`, action.decision === 'approved' ? '#10B981' : '#800020') : state.activity,
      }
    }

    case 'ADD_HOLIDAY':
      return { ...state, holidays: [...state.holidays, { id: uid(), date: action.date, name: action.name }].sort((a, b) => a.date.localeCompare(b.date)) }
    case 'REMOVE_HOLIDAY':
      return { ...state, holidays: state.holidays.filter(h => h.id !== action.id) }

    case 'ASSIGN_PROJECT': {
      const w = state.workers.find(x => x.id === action.workerId)
      const workers = state.workers.map(x => x.id === action.workerId
        ? { ...x, projects: [...x.projects, { id: uid(), name: action.name, lead: action.lead, startDate: action.startDate, status: 'in_progress' as ProjectStatus }] }
        : x)
      return {
        ...state, workers,
        notifications: w ? pushNotif(state, { workerId: w.id, title: 'Project assigned', message: `${w.name} was assigned to ${action.name}.`, kind: 'info' }) : state.notifications,
        activity: w ? pushActivity(state, `${w.name} assigned to ${action.name}`, '#5B77C4') : state.activity,
      }
    }

    case 'SET_PROJECT_STATUS': {
      const workers = state.workers.map(w => w.id === action.workerId
        ? { ...w, projects: w.projects.map(p => p.id === action.projectId ? { ...p, status: action.status } : p) }
        : w)
      return { ...state, workers }
    }

    case 'SET_EMPLOYEE_STATUS': {
      const w = state.workers.find(x => x.id === action.workerId)
      const workers = state.workers.map(x => x.id === action.workerId
        ? { ...x, status: action.status, dateOfExit: action.status === 'inactive' ? (action.dateOfExit || todayStr()) : undefined }
        : x)
      return {
        ...state, workers,
        activity: w ? pushActivity(state, `${w.name} marked ${action.status}`, action.status === 'active' ? '#10B981' : '#800020') : state.activity,
      }
    }

    case 'UPDATE_WORKER': {
      const workers = state.workers.map(x => {
        if (x.id !== action.workerId) return x
        const merged = { ...x, ...action.patch }
        // Keep the derived display name in sync when either name part changes.
        merged.name = `${merged.firstName} ${merged.lastName}`.trim()
        return merged
      })
      const w = workers.find(x => x.id === action.workerId)
      return {
        ...state, workers,
        activity: w ? pushActivity(state, `${w.name}'s profile updated`, '#5B77C4') : state.activity,
      }
    }

    case 'ADD_DOC': {
      const key = `custom-${uid()}`
      const workers = state.workers.map(x => x.id === action.workerId
        ? { ...x, documents: [...x.documents, { key, label: action.label, status: 'not_uploaded' as DocStatus }] }
        : x)
      return { ...state, workers }
    }

    case 'REMOVE_DOC': {
      const workers = state.workers.map(x => x.id === action.workerId
        ? { ...x, documents: x.documents.filter(d => d.key !== action.docKey) }
        : x)
      return { ...state, workers }
    }

    /* ---------- org structure (audited) ---------- */
    case 'ADD_UNIT': {
      const parent = action.unit.parentId ? state.orgUnits.find(u => u.id === action.unit.parentId) : null
      return {
        ...state,
        orgUnits: [...state.orgUnits, action.unit],
        auditLog: pushAudit(state, { actor: action.actor, action: 'add_unit', summary: `Created ${action.unit.kind} “${action.unit.name}”${parent ? ` under ${parent.name}` : ''}`, after: action.unit.name }),
        activity: pushActivity(state, `${action.unit.kind} created: ${action.unit.name}`, '#5B77C4'),
      }
    }
    case 'RENAME_UNIT': {
      const u = state.orgUnits.find(x => x.id === action.unitId)
      if (!u) return state
      return {
        ...state,
        orgUnits: state.orgUnits.map(x => x.id === action.unitId ? { ...x, name: action.name } : x),
        // keep denormalized worker.department in sync when a department is renamed
        workers: u.kind === 'department' ? state.workers.map(w => w.department === u.name ? { ...w, department: action.name } : w) : state.workers,
        auditLog: pushAudit(state, { actor: action.actor, action: 'rename_unit', summary: `Renamed unit “${u.name}” → “${action.name}”`, before: u.name, after: action.name }),
      }
    }
    case 'SET_UNIT_LEAD': {
      const u = state.orgUnits.find(x => x.id === action.unitId)
      if (!u) return state
      const leadName = action.leadId ? state.workers.find(w => w.id === action.leadId)?.name : undefined
      return {
        ...state,
        orgUnits: state.orgUnits.map(x => x.id === action.unitId ? { ...x, leadId: action.leadId } : x),
        auditLog: pushAudit(state, { actor: action.actor, action: 'set_unit_lead', summary: `Set lead of “${u.name}” to ${leadName || '—'}`, after: leadName }),
      }
    }
    case 'MOVE_UNIT': {
      const u = state.orgUnits.find(x => x.id === action.unitId)
      if (!u || action.unitId === action.parentId) return state
      const parent = action.parentId ? state.orgUnits.find(p => p.id === action.parentId) : null
      return {
        ...state,
        orgUnits: state.orgUnits.map(x => x.id === action.unitId ? { ...x, parentId: action.parentId } : x),
        auditLog: pushAudit(state, { actor: action.actor, action: 'move_unit', summary: `Moved “${u.name}” under ${parent ? parent.name : 'company root'}`, after: parent?.name }),
      }
    }
    case 'DELETE_UNIT': {
      const u = state.orgUnits.find(x => x.id === action.unitId)
      if (!u || u.kind === 'company') return state
      // Re-parent any children and detach members to the deleted unit's parent.
      return {
        ...state,
        orgUnits: state.orgUnits
          .filter(x => x.id !== action.unitId)
          .map(x => x.parentId === action.unitId ? { ...x, parentId: u.parentId } : x),
        workers: state.workers.map(w => w.unitId === action.unitId ? { ...w, unitId: u.parentId || undefined } : w),
        auditLog: pushAudit(state, { actor: action.actor, action: 'delete_unit', summary: `Deleted unit “${u.name}” (children re-parented)`, before: u.name }),
      }
    }
    case 'MERGE_UNITS': {
      const src = state.orgUnits.find(x => x.id === action.sourceId)
      const tgt = state.orgUnits.find(x => x.id === action.targetId)
      if (!src || !tgt || src.id === tgt.id || src.kind === 'company') return state
      return {
        ...state,
        orgUnits: state.orgUnits
          .filter(x => x.id !== action.sourceId)
          .map(x => x.parentId === action.sourceId ? { ...x, parentId: action.targetId } : x),
        workers: state.workers.map(w => w.unitId === action.sourceId ? { ...w, unitId: action.targetId, department: tgt.kind === 'department' ? tgt.name : w.department } : w),
        auditLog: pushAudit(state, { actor: action.actor, action: 'merge_units', summary: `Merged “${src.name}” into “${tgt.name}”`, before: src.name, after: tgt.name }),
      }
    }
    case 'ASSIGN_WORKER_UNIT': {
      const w = state.workers.find(x => x.id === action.workerId)
      if (!w) return state
      const from = w.unitId ? state.orgUnits.find(u => u.id === w.unitId)?.name : '—'
      const unit = action.unitId ? state.orgUnits.find(u => u.id === action.unitId) : null
      // sync denormalized department to nearest department ancestor
      const deptName = unit ? departmentNameForUnit(state.orgUnits, unit.id) : w.department
      return {
        ...state,
        workers: state.workers.map(x => x.id === action.workerId ? { ...x, unitId: action.unitId, department: deptName || x.department } : x),
        auditLog: pushAudit(state, { actor: action.actor, action: 'move_worker', summary: `Moved ${w.name}: ${from || '—'} → ${unit?.name || '—'}`, before: from, after: unit?.name }),
        activity: pushActivity(state, `${w.name} moved to ${unit?.name || 'unassigned'}`, '#5B77C4'),
      }
    }
    case 'SET_MANAGER': {
      const w = state.workers.find(x => x.id === action.workerId)
      if (!w) return state
      const fromM = w.reportsToId ? state.workers.find(m => m.id === w.reportsToId)?.name : '—'
      const toM = action.reportsToId ? state.workers.find(m => m.id === action.reportsToId)?.name : '—'
      return {
        ...state,
        workers: state.workers.map(x => x.id === action.workerId ? { ...x, reportsToId: action.reportsToId } : x),
        auditLog: pushAudit(state, { actor: action.actor, action: 'set_manager', summary: `${w.name} now reports to ${toM}`, before: fromM, after: toM }),
      }
    }
    case 'SET_ORG_ROLE': {
      const w = state.workers.find(x => x.id === action.workerId)
      if (!w) return state
      return {
        ...state,
        workers: state.workers.map(x => x.id === action.workerId ? { ...x, orgRole: action.orgRole } : x),
        auditLog: pushAudit(state, { actor: action.actor, action: 'set_org_role', summary: `${w.name} access tier → ${ORG_ROLE_META[action.orgRole].label}`, before: w.orgRole, after: action.orgRole }),
      }
    }
    case 'SET_DESIGNATION': {
      const w = state.workers.find(x => x.id === action.workerId)
      if (!w) return state
      return {
        ...state,
        workers: state.workers.map(x => x.id === action.workerId ? { ...x, designation: action.designation } : x),
        auditLog: pushAudit(state, { actor: action.actor, action: 'set_designation', summary: `${w.name} designation → “${action.designation}”`, before: w.designation, after: action.designation }),
      }
    }

    /* ---------- monthly performance reviews ---------- */
    case 'SUBMIT_SELF_REVIEW': {
      const existing = state.monthlyReviews.find(r => r.workerId === action.workerId && r.month === action.month)
      const w = state.workers.find(x => x.id === action.workerId)
      const patch = { selfRating: action.rating, selfComment: action.comment, selfSubmittedAt: now(), stage: 'employee_submitted' as ReviewStage }
      const reviews = existing
        ? state.monthlyReviews.map(r => r.id === existing.id ? { ...r, ...patch } : r)
        : [{ id: uid(), workerId: action.workerId, month: action.month, ...patch }, ...state.monthlyReviews]
      return {
        ...state,
        monthlyReviews: reviews,
        notifications: pushNotif(state, { workerId: action.workerId, title: 'Monthly review submitted', message: `${w?.name || 'An employee'} submitted the ${monthLabel(action.month)} self-review.`, kind: 'info' }),
        activity: pushActivity(state, `${w?.name || 'Employee'} submitted ${monthLabel(action.month)} self-review`, '#162660'),
      }
    }
    case 'TL_REVIEW': {
      return {
        ...state,
        monthlyReviews: state.monthlyReviews.map(r => r.id === action.reviewId
          ? { ...r, tlRating: action.rating, tlFeedback: action.feedback, tlBy: action.by, tlAt: now(), stage: reviewStageIndex(r.stage) < reviewStageIndex('team_lead_review') ? 'team_lead_review' as ReviewStage : r.stage }
          : r),
      }
    }
    case 'HR_REVIEW': {
      return {
        ...state,
        monthlyReviews: state.monthlyReviews.map(r => r.id === action.reviewId
          ? { ...r, hrRating: action.rating, hrFeedback: action.feedback, hrBy: action.by, hrAt: now(), stage: reviewStageIndex(r.stage) < reviewStageIndex('hr_review') ? 'hr_review' as ReviewStage : r.stage }
          : r),
      }
    }
    case 'FINALIZE_REVIEW': {
      const r0 = state.monthlyReviews.find(r => r.id === action.reviewId)
      const w = r0 && state.workers.find(x => x.id === r0.workerId)
      return {
        ...state,
        monthlyReviews: state.monthlyReviews.map(r => r.id === action.reviewId ? { ...r, stage: 'finalized' as ReviewStage, finalizedAt: now() } : r),
        activity: pushActivity(state, `${w?.name || 'Employee'} ${r0 ? monthLabel(r0.month) : ''} review finalized`, '#0F7A46'),
      }
    }
    case 'SEND_REVIEW_FORM': {
      return {
        ...state,
        monthlyReviews: state.monthlyReviews.map(r => r.id === action.reviewId ? { ...r, formSentAt: r.formSentAt || now() } : r),
      }
    }
    case 'APPROVE_BONUS': {
      const r0 = state.monthlyReviews.find(r => r.id === action.reviewId)
      const w = r0 && state.workers.find(x => x.id === r0.workerId)
      return {
        ...state,
        monthlyReviews: state.monthlyReviews.map(r => r.id === action.reviewId ? { ...r, bonusApproved: true, bonusDecidedBy: action.by, bonusDecidedAt: now() } : r),
        notifications: r0 ? pushNotif(state, { workerId: r0.workerId, title: 'Bonus approved', message: `Bonus approved for ${w?.name || 'employee'} (${monthLabel(r0.month)}).`, kind: 'success' }) : state.notifications,
        activity: pushActivity(state, `Bonus approved for ${w?.name || 'employee'}`, '#F59E0B'),
      }
    }

    default:
      return state
  }
}

/* ---------------- context ---------------- */
const KEY = 'wop-store-v4' // bumped: monthly performance reviews (v3 sessions re-seed)
interface Ctx extends State {
  createWorker: (p: NewWorkerInput, docs?: WorkerDoc[]) => Worker
  uploadDoc: (workerId: string, docKey: string, fileName: string) => void
  submitAll: (workerId: string) => void
  verifyDoc: (workerId: string, docKey: string) => void
  rejectDoc: (workerId: string, docKey: string, reason: string) => void
  createAccount: (workerId: string) => void
  addGoal: (workerId: string, title: string, deadline: string | undefined, period: GoalPeriod) => void
  setGoal: (workerId: string, goalId: string, status: Goal['status']) => void
  readNotif: (id: string) => void
  readAllNotif: () => void
  addNote: (workerId: string, kind: NoteItem['kind'], text: string) => void
  toggleNote: (workerId: string, noteId: string) => void
  deleteNote: (workerId: string, noteId: string) => void
  markAttendance: (workerId: string, date: string, status: AttendanceStatus, leaveType?: LeaveType) => void
  clockIn: (workerId: string, meta?: PunchMeta) => void
  clockOut: (workerId: string, meta?: PunchMeta) => void
  addReview: (workerId: string, period: ReviewPeriod, rating: number, feedback: string, reviewer: string) => void
  addFeedback: (workerId: string, text: string, author: string) => void
  submitSelfReview: (workerId: string, month: string, rating: number, comment: string) => void
  teamLeadReview: (reviewId: string, rating: number, feedback: string, by: string) => void
  hrReview: (reviewId: string, rating: number, feedback: string, by: string) => void
  finalizeReview: (reviewId: string, by: string) => void
  approveBonus: (reviewId: string, by: string) => void
  sendReviewForm: (reviewId: string, by: string) => void
  applyLeave: (req: Omit<LeaveRequest, 'id' | 'status' | 'createdAt'>) => void
  decideLeave: (id: string, decision: 'approved' | 'rejected', decidedBy: string) => void
  addHoliday: (date: string, name: string) => void
  removeHoliday: (id: string) => void
  assignProject: (workerId: string, name: string, lead: string, startDate: string) => void
  setProjectStatus: (workerId: string, projectId: string, status: ProjectStatus) => void
  setEmployeeStatus: (workerId: string, status: EmployeeStatus, dateOfExit?: string) => void
  updateWorker: (workerId: string, patch: Partial<Worker>) => void
  addDoc: (workerId: string, label: string) => void
  removeDoc: (workerId: string, docKey: string) => void
  workerByToken: (token: string) => Worker | undefined
  workerById: (id: string) => Worker | undefined
  // org structure (admin-only) — actor is the acting admin's name
  addUnit: (name: string, kind: OrgUnitKind, parentId: string | null, actor: string) => void
  renameUnit: (unitId: string, name: string, actor: string) => void
  setUnitLead: (unitId: string, leadId: string | undefined, actor: string) => void
  moveUnit: (unitId: string, parentId: string | null, actor: string) => void
  deleteUnit: (unitId: string, actor: string) => void
  mergeUnits: (sourceId: string, targetId: string, actor: string) => void
  assignWorkerUnit: (workerId: string, unitId: string | undefined, actor: string) => void
  setManager: (workerId: string, reportsToId: string | undefined, actor: string) => void
  setOrgRole: (workerId: string, orgRole: OrgRole, actor: string) => void
  setDesignation: (workerId: string, designation: string, actor: string) => void
}

const WorkforceContext = createContext<Ctx | null>(null)

/* Defensively fill any fields missing from older persisted state so array
   accesses (.map/.filter) never crash after a schema change. */
function normalize(s: unknown): State {
  const st = (s || {}) as { workers?: unknown[]; notifications?: unknown[]; activity?: unknown[] }
  const workers = (st.workers || []).map((raw) => {
    const w = raw as Record<string, unknown>
    return {
      ...w,
      documents: (w.documents as unknown[]) || [],
      goals: (w.goals as unknown[]) || [],
      notes: (w.notes as unknown[]) || [],
      attendance: (w.attendance as unknown[]) || [],
      timeSessions: (w.timeSessions as unknown[]) || [],
      projects: (w.projects as unknown[]) || [],
      reviews: (w.reviews as unknown[]) || [],
      feedback: (w.feedback as unknown[]) || [],
      teamLeads: (w.teamLeads as unknown[]) || (w.teamLead ? [w.teamLead] : []),
      name: (w.name as string) || `${(w.firstName as string) || ''} ${(w.lastName as string) || ''}`.trim(),
      orgRole: (w.orgRole as OrgRole) || defaultOrgRole(w as unknown as Worker),
    }
  }) as unknown as Worker[]
  const orgUnits = ((st as { orgUnits?: OrgUnit[] }).orgUnits) || []
  return {
    workers,
    notifications: (st.notifications as Notification[]) || [],
    activity: (st.activity as Activity[]) || [],
    leaveRequests: ((st as { leaveRequests?: LeaveRequest[] }).leaveRequests) || [],
    holidays: ((st as { holidays?: Holiday[] }).holidays) || [],
    orgUnits,
    auditLog: ((st as { auditLog?: AuditEntry[] }).auditLog) || [],
    monthlyReviews: ((st as { monthlyReviews?: MonthlyReview[] }).monthlyReviews) || [],
  }
}

export function WorkforceProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined as unknown as State, seed)

  // hydrate from localStorage once on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY)
      if (raw) dispatch({ type: 'HYDRATE', state: normalize(JSON.parse(raw)) })
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // persist on change — but skip the initial render so the fresh seed never overwrites
  // persisted data before hydration runs (also safe under StrictMode double-mount).
  const skipFirstPersist = useRef(true)
  useEffect(() => {
    if (skipFirstPersist.current) { skipFirstPersist.current = false; return }
    try { localStorage.setItem(KEY, JSON.stringify(state)) } catch { /* ignore */ }
  }, [state])

  const value: Ctx = {
    ...state,
    createWorker: (p, docs) => {
      const worker: Worker = {
        ...p,
        name: `${p.firstName} ${p.lastName}`,
        id: uid(), token: genToken(), createdAt: now(), expiresAt: plusDays(7),
        stage: 'invited', accountCreated: false,
        documents: docs && docs.length ? docs : docsFor(p.type, p.location, p.contractorMode), goals: [],
        notes: [], attendance: [], timeSessions: [], projects: [], reviews: [], feedback: [],
      }
      dispatch({ type: 'ADD_WORKER', worker })
      return worker
    },
    uploadDoc: (workerId, docKey, fileName) => dispatch({ type: 'UPLOAD_DOC', workerId, docKey, fileName }),
    submitAll: workerId => dispatch({ type: 'SUBMIT_ALL', workerId }),
    verifyDoc: (workerId, docKey) => dispatch({ type: 'VERIFY_DOC', workerId, docKey }),
    rejectDoc: (workerId, docKey, reason) => dispatch({ type: 'REJECT_DOC', workerId, docKey, reason }),
    createAccount: workerId => dispatch({ type: 'CREATE_ACCOUNT', workerId }),
    addGoal: (workerId, title, deadline, period) => dispatch({ type: 'ADD_GOAL', workerId, title, deadline, period }),
    setGoal: (workerId, goalId, status) => dispatch({ type: 'SET_GOAL', workerId, goalId, status }),
    readNotif: id => dispatch({ type: 'READ_NOTIF', id }),
    readAllNotif: () => dispatch({ type: 'READ_ALL_NOTIF' }),
    addNote: (workerId, kind, text) => dispatch({ type: 'ADD_NOTE', workerId, kind, text }),
    toggleNote: (workerId, noteId) => dispatch({ type: 'TOGGLE_NOTE', workerId, noteId }),
    deleteNote: (workerId, noteId) => dispatch({ type: 'DELETE_NOTE', workerId, noteId }),
    markAttendance: (workerId, date, status, leaveType) => dispatch({ type: 'MARK_ATTENDANCE', workerId, date, status, leaveType }),
    clockIn: (workerId, meta) => dispatch({ type: 'CLOCK_IN', workerId, meta }),
    clockOut: (workerId, meta) => dispatch({ type: 'CLOCK_OUT', workerId, meta }),
    addReview: (workerId, period, rating, feedback, reviewer) => dispatch({ type: 'ADD_REVIEW', workerId, period, rating, feedback, reviewer }),
    addFeedback: (workerId, text, author) => dispatch({ type: 'ADD_FEEDBACK', workerId, text, author }),
    submitSelfReview: (workerId, month, rating, comment) => dispatch({ type: 'SUBMIT_SELF_REVIEW', workerId, month, rating, comment }),
    teamLeadReview: (reviewId, rating, feedback, by) => dispatch({ type: 'TL_REVIEW', reviewId, rating, feedback, by }),
    hrReview: (reviewId, rating, feedback, by) => dispatch({ type: 'HR_REVIEW', reviewId, rating, feedback, by }),
    finalizeReview: (reviewId, by) => dispatch({ type: 'FINALIZE_REVIEW', reviewId, by }),
    approveBonus: (reviewId, by) => dispatch({ type: 'APPROVE_BONUS', reviewId, by }),
    sendReviewForm: (reviewId, by) => dispatch({ type: 'SEND_REVIEW_FORM', reviewId, by }),
    applyLeave: req => dispatch({ type: 'APPLY_LEAVE', req: { ...req, id: uid(), status: 'pending', createdAt: now() } }),
    decideLeave: (id, decision, decidedBy) => dispatch({ type: 'DECIDE_LEAVE', id, decision, decidedBy }),
    addHoliday: (date, name) => dispatch({ type: 'ADD_HOLIDAY', date, name }),
    removeHoliday: id => dispatch({ type: 'REMOVE_HOLIDAY', id }),
    assignProject: (workerId, name, lead, startDate) => dispatch({ type: 'ASSIGN_PROJECT', workerId, name, lead, startDate }),
    setProjectStatus: (workerId, projectId, status) => dispatch({ type: 'SET_PROJECT_STATUS', workerId, projectId, status }),
    setEmployeeStatus: (workerId, status, dateOfExit) => dispatch({ type: 'SET_EMPLOYEE_STATUS', workerId, status, dateOfExit }),
    updateWorker: (workerId, patch) => dispatch({ type: 'UPDATE_WORKER', workerId, patch }),
    addDoc: (workerId, label) => dispatch({ type: 'ADD_DOC', workerId, label }),
    removeDoc: (workerId, docKey) => dispatch({ type: 'REMOVE_DOC', workerId, docKey }),
    workerByToken: token => state.workers.find(w => w.token === token),
    workerById: id => state.workers.find(w => w.id === id),
    addUnit: (name, kind, parentId, actor) => dispatch({ type: 'ADD_UNIT', unit: { id: uid(), name, kind, parentId, createdAt: now() }, actor }),
    renameUnit: (unitId, name, actor) => dispatch({ type: 'RENAME_UNIT', unitId, name, actor }),
    setUnitLead: (unitId, leadId, actor) => dispatch({ type: 'SET_UNIT_LEAD', unitId, leadId, actor }),
    moveUnit: (unitId, parentId, actor) => dispatch({ type: 'MOVE_UNIT', unitId, parentId, actor }),
    deleteUnit: (unitId, actor) => dispatch({ type: 'DELETE_UNIT', unitId, actor }),
    mergeUnits: (sourceId, targetId, actor) => dispatch({ type: 'MERGE_UNITS', sourceId, targetId, actor }),
    assignWorkerUnit: (workerId, unitId, actor) => dispatch({ type: 'ASSIGN_WORKER_UNIT', workerId, unitId, actor }),
    setManager: (workerId, reportsToId, actor) => dispatch({ type: 'SET_MANAGER', workerId, reportsToId, actor }),
    setOrgRole: (workerId, orgRole, actor) => dispatch({ type: 'SET_ORG_ROLE', workerId, orgRole, actor }),
    setDesignation: (workerId, designation, actor) => dispatch({ type: 'SET_DESIGNATION', workerId, designation, actor }),
  }

  return <WorkforceContext.Provider value={value}>{children}</WorkforceContext.Provider>
}

export function useWorkforce() {
  const ctx = useContext(WorkforceContext)
  if (!ctx) throw new Error('useWorkforce must be used within WorkforceProvider')
  return ctx
}

/* Deterministic date formatting (fixed locale + UTC) to avoid SSR/client
   hydration mismatches from differing system locales/timezones. */
export function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'UTC' })
}
export function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
}

/* stage → label + color for badges */
export const STAGE_META: Record<Stage, { label: string; color: string; bg: string }> = {
  invited: { label: 'Invited', color: '#5B77C4', bg: '#E8EEFB' },
  documents_submitted: { label: 'Submitted', color: '#162660', bg: '#E8EEFB' },
  verifying: { label: 'Verifying', color: '#F59E0B', bg: '#FEF3E2' },
  verified: { label: 'Verified', color: '#10B981', bg: '#E8F6EF' },
  active: { label: 'Active', color: '#0F7A46', bg: '#E8F6EF' },
}

export const GOAL_PERIOD_META: Record<GoalPeriod, { label: string }> = {
  weekly: { label: 'Weekly' },
  monthly: { label: 'Monthly' },
  yearly: { label: 'Yearly' },
}

export const ATTENDANCE_META: Record<AttendanceStatus, { label: string; color: string; bg: string }> = {
  present: { label: 'Present', color: '#0F7A46', bg: '#E8F6EF' },
  leave: { label: 'Leave', color: '#B45309', bg: '#FEF3E2' },
  absent: { label: 'Absent', color: '#800020', bg: '#F7E7EA' },
}

export function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

/* ---------- Time-tracking helpers ---------- */
/** Total hours worked on a given date (open sessions counted up to `nowMs`). */
export function hoursForDate(sessions: TimeSession[], date: string, nowMs = Date.now()): number {
  const ms = sessions.filter(s => s.date === date).reduce((sum, s) => {
    const start = new Date(s.in).getTime()
    const end = s.out ? new Date(s.out).getTime() : nowMs
    return sum + Math.max(0, end - start)
  }, 0)
  return Math.round((ms / 3_600_000) * 100) / 100
}
/** The currently-open (clocked-in, not out) session for a worker, if any. */
export function openSession(sessions: TimeSession[]): TimeSession | undefined {
  return [...sessions].reverse().find(s => !s.out)
}
export function fmtClock(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}
/** Format hours (e.g. 7.5) as "7h 30m". */
export function fmtHours(hours: number): string {
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

/* ---------- Clock-in verification (geofence + anomaly flags) ---------- */
export interface OfficeGeofence { lat: number; lon: number; radiusM: number; label: string }
const OFFICE_DEFAULT: OfficeGeofence = { lat: 26.9124, lon: 75.7873, radiusM: 300, label: 'HQ' }

/** Office geofence config (from Settings in localStorage, else a default). */
export function getOfficeGeofence(): OfficeGeofence {
  try {
    const raw = localStorage.getItem('wop-settings-v1')
    if (raw) {
      const s = JSON.parse(raw)
      if (typeof s.officeLat === 'number' && typeof s.officeLon === 'number') {
        return { lat: s.officeLat, lon: s.officeLon, radiusM: s.officeRadiusM || 300, label: s.companyName || 'Office' }
      }
    }
  } catch { /* ignore */ }
  return OFFICE_DEFAULT
}

function distanceM(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const R = 6371000, toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(bLat - aLat), dLon = toRad(bLon - aLon)
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(s))
}

/** Classify a lat/lon against the office geofence. */
export function classifyPlace(lat: number, lon: number): PunchPlace {
  const g = getOfficeGeofence()
  const d = distanceM(lat, lon, g.lat, g.lon)
  if (d <= g.radiusM) return 'In office'
  if (d <= 5000) return 'Remote'        // nearby but outside the office radius → working remotely
  return 'Outside geofence'             // far from office → flag for review
}

/** Capture a punch: HR entries are tagged; self-punches try browser geolocation. */
export function capturePunch(source: 'self' | 'hr'): Promise<PunchMeta> {
  if (source === 'hr') return Promise.resolve({ source: 'hr', place: 'HR-entered' })
  return new Promise(resolve => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return resolve({ source: 'self', place: 'Location off' })
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ source: 'self', place: classifyPlace(pos.coords.latitude, pos.coords.longitude), lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => resolve({ source: 'self', place: 'Location off' }),
      { timeout: 8000, enableHighAccuracy: true }
    )
  })
}

/** Advisory anomaly flags for a session (demo-grade — real enforcement needs a backend). */
export function sessionFlags(s: TimeSession): string[] {
  const flags: string[] = []
  if (s.inMeta?.place === 'Outside geofence') flags.push('Outside office')
  if (s.inMeta?.place === 'Location off') flags.push('No location')
  if (s.inMeta?.source === 'hr') flags.push('HR-entered')
  if (s.out) {
    const hrs = (new Date(s.out).getTime() - new Date(s.in).getTime()) / 3_600_000
    if (hrs > 12) flags.push('Long session (>12h)')
  }
  return flags
}

export const PLACE_META: Record<PunchPlace, { color: string; bg: string }> = {
  'In office': { color: '#0F7A46', bg: '#E8F6EF' },
  Remote: { color: '#162660', bg: '#E8EEFB' },
  'Outside geofence': { color: '#800020', bg: '#F7E7EA' },
  'Location off': { color: '#B45309', bg: '#FEF3E2' },
  'HR-entered': { color: '#64748B', bg: '#F1F5F9' },
}

/* ---------- Leave helpers ---------- */
/** Weekday dates (Mon–Fri) inclusive between two 'YYYY-MM-DD' strings. */
export function businessDaysBetween(from: string, to: string): string[] {
  const out: string[] = []
  const d = new Date(from + 'T00:00:00Z')
  const end = new Date(to + 'T00:00:00Z')
  while (d <= end) {
    const wd = d.getUTCDay()
    if (wd !== 0 && wd !== 6) out.push(d.toISOString().slice(0, 10))
    d.setUTCDate(d.getUTCDate() + 1)
  }
  return out
}
export function countBusinessDays(from: string, to: string): number {
  return businessDaysBetween(from, to).length
}
/** Approved days used for a worker + leave type. */
export function leaveTaken(requests: LeaveRequest[], workerId: string, type: LeaveType): number {
  return requests.filter(r => r.workerId === workerId && r.type === type && r.status === 'approved').reduce((s, r) => s + r.days, 0)
}
/** Remaining balance (null = uncapped). */
export function leaveBalance(requests: LeaveRequest[], workerId: string, type: LeaveType): number | null {
  const quota = LEAVE_QUOTAS[type]
  if (quota == null) return null
  return quota - leaveTaken(requests, workerId, type)
}

/** Last N calendar days (oldest -> newest) as 'YYYY-MM-DD', anchored to `today` for determinism. */
export function lastNDays(n: number, today = todayStr()) {
  const base = new Date(today + 'T00:00:00Z')
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(base)
    d.setUTCDate(d.getUTCDate() - (n - 1 - i))
    return d.toISOString().slice(0, 10)
  })
}

export interface Performance {
  attendanceRate: number // % present, over last 30 marked days
  goalRate: number // % of goals completed
  hoursRate: number // avg daily hours vs an 8h target, capped 100
  reviewRate: number // avg of all submitted review ratings this year, as %
  reviewAvg: number  // avg rating this year (0–5)
  reviewCount: number // how many ratings averaged
  hasReview: boolean
  daysMarked: number
  daysWorked: number
  goalsTotal: number
  avgDailyHours: number
  score: number // weighted overall 0-100 (missing metrics excluded)
}

/* Configurable score weights (sum need not be 100 — normalized at use). */
export interface PerfWeights { reviews: number; goals: number; attendance: number; hours: number }
export const DEFAULT_PERF_WEIGHTS: PerfWeights = { reviews: 35, goals: 30, attendance: 20, hours: 15 }
export function getPerfWeights(): PerfWeights {
  try {
    const raw = localStorage.getItem('wop-settings-v1')
    if (raw) { const s = JSON.parse(raw); if (s.perfWeights) return { ...DEFAULT_PERF_WEIGHTS, ...s.perfWeights } }
  } catch { /* ignore */ }
  return DEFAULT_PERF_WEIGHTS
}

/** Age in whole years from a 'YYYY-MM-DD' date of birth, anchored to `today` for determinism. */
export function ageFromDob(dob: string | undefined, today = todayStr()): number | null {
  if (!dob) return null
  const [by, bm, bd] = dob.split('-').map(Number)
  const [ty, tm, td] = today.split('-').map(Number)
  let age = ty - by
  if (tm < bm || (tm === bm && td < bd)) age--
  return age
}

/** Human-readable "current experience" duration since date of joining. */
export function experienceDuration(dateOfJoining: string, today = todayStr()): string {
  const start = new Date(dateOfJoining + 'T00:00:00Z')
  const end = new Date(today + 'T00:00:00Z')
  let months = (end.getUTCFullYear() - start.getUTCFullYear()) * 12 + (end.getUTCMonth() - start.getUTCMonth())
  if (end.getUTCDate() < start.getUTCDate()) months--
  months = Math.max(0, months)
  const years = Math.floor(months / 12)
  const rem = months % 12
  if (years === 0) return `${rem} mo${rem === 1 ? '' : 's'}`
  if (rem === 0) return `${years} yr${years === 1 ? '' : 's'}`
  return `${years} yr${years === 1 ? '' : 's'} ${rem} mo${rem === 1 ? '' : 's'}`
}

/** Weighted scorecard over the last 30 days. Weights (reviews/goals/attendance/
 *  hours) are configurable in Settings. Metrics with no data are excluded and the
 *  remaining weights renormalized, so a worker isn't penalized for a dimension
 *  that simply hasn't been recorded. */
export function computePerformance(w: Worker, monthlyReviews: MonthlyReview[] = []): Performance {
  const last30 = lastNDays(30)

  // attendance
  const recent = w.attendance.filter(a => last30.includes(a.date))
  const present = recent.filter(a => a.status === 'present').length
  const attendanceRate = recent.length ? Math.round((present / recent.length) * 100) : 0

  // goals
  const goalsTotal = w.goals.length
  const goalsDone = w.goals.filter(g => g.status === 'completed').length
  const goalRate = goalsTotal ? Math.round((goalsDone / goalsTotal) * 100) : 0

  // hours (8h/day target)
  const workedDays = last30.filter(d => w.timeSessions.some(s => s.date === d))
  const totalHours = workedDays.reduce((sum, d) => sum + hoursForDate(w.timeSessions, d), 0)
  const avgDailyHours = workedDays.length ? Math.round((totalHours / workedDays.length) * 10) / 10 : 0
  const hoursRate = workedDays.length ? Math.min(100, Math.round((avgDailyHours / 8) * 100)) : 0

  // reviews — average of ALL ratings submitted this calendar year across monthly reviews (self, TL, HR)
  const year = todayStr().slice(0, 4)
  const ratings: number[] = []
  monthlyReviews.filter(r => r.workerId === w.id && r.month.startsWith(year)).forEach(r => {
    ;[r.selfRating, r.tlRating, r.hrRating].forEach(v => { if (v != null) ratings.push(v) })
  })
  const reviewCount = ratings.length
  const hasReview = reviewCount > 0
  const reviewAvg = hasReview ? ratings.reduce((s, v) => s + v, 0) / reviewCount : 0
  const reviewRate = hasReview ? Math.round((reviewAvg / 5) * 100) : 0

  // weighted, renormalized over metrics that have data
  const wt = getPerfWeights()
  const parts: [number, number][] = []
  if (hasReview) parts.push([reviewRate, wt.reviews])
  if (goalsTotal) parts.push([goalRate, wt.goals])
  if (recent.length) parts.push([attendanceRate, wt.attendance])
  if (workedDays.length) parts.push([hoursRate, wt.hours])
  const wsum = parts.reduce((s, [, k]) => s + k, 0)
  const score = wsum ? Math.round(parts.reduce((s, [v, k]) => s + v * k, 0) / wsum) : 0

  return { attendanceRate, goalRate, hoursRate, reviewRate, reviewAvg, reviewCount, hasReview, daysMarked: recent.length, daysWorked: workedDays.length, goalsTotal, avgDailyHours, score }
}

/* ---------- Performance trend (recent 7 days vs the prior 7) ---------- */
function shiftYmd(ymd: string, days: number): string {
  const d = new Date(ymd + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + days); return d.toISOString().slice(0, 10)
}
function windowStat(w: Worker, days: string[]): number | null {
  const marked = days.filter(d => w.attendance.some(a => a.date === d))
  const present = marked.filter(d => { const a = w.attendance.find(x => x.date === d)!; return a.status === 'present' }).length
  const attRate = marked.length ? (present / marked.length) * 100 : null
  const worked = days.filter(d => w.timeSessions.some(s => s.date === d))
  const hrs = worked.reduce((s, d) => s + hoursForDate(w.timeSessions, d), 0)
  const hrsRate = worked.length ? Math.min(100, (hrs / worked.length / 8) * 100) : null
  const vals = [attRate, hrsRate].filter((v): v is number => v !== null)
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null
}
/** Momentum: (recent 7-day attendance+hours) minus (prior 7-day). Positive = improving. */
export function performanceTrend(w: Worker): number {
  const cur = windowStat(w, lastNDays(7))
  const prev = windowStat(w, lastNDays(7, shiftYmd(todayStr(), -7)))
  if (cur === null || prev === null) return 0
  return Math.round(cur - prev)
}

/* ---------- Employee lifecycle ---------- */
export type LifecycleStage = 'Onboarding' | 'Probation' | 'Active' | 'Exited'
export const LIFECYCLE_META: Record<LifecycleStage, { color: string; bg: string }> = {
  Onboarding: { color: '#B45309', bg: '#FEF3E2' },
  Probation: { color: '#162660', bg: '#E8EEFB' },
  Active: { color: '#0F7A46', bg: '#E8F6EF' },
  Exited: { color: '#800020', bg: '#F7E7EA' },
}
export function lifecycleStage(w: Worker): LifecycleStage {
  if (w.status === 'inactive') return 'Exited'
  if (w.stage !== 'active') return 'Onboarding'
  const probEnd = shiftYmd(w.dateOfJoining, 90)
  return todayStr() < probEnd ? 'Probation' : 'Active'
}

export interface Milestone { label: string; date: string; done: boolean }
/** Upcoming/past lifecycle milestones: probation end, next work anniversary, next review due. */
export function milestones(w: Worker): Milestone[] {
  const today = todayStr()
  const out: Milestone[] = []
  const probEnd = shiftYmd(w.dateOfJoining, 90)
  out.push({ label: 'Probation ends', date: probEnd, done: today >= probEnd })
  // next work anniversary
  const [jy, jm, jd] = w.dateOfJoining.split('-').map(Number)
  let annYear = Number(today.slice(0, 4))
  const annThis = `${annYear}-${String(jm).padStart(2, '0')}-${String(jd).padStart(2, '0')}`
  if (annThis < today) annYear++
  const ann = `${annYear}-${String(jm).padStart(2, '0')}-${String(jd).padStart(2, '0')}`
  const years = annYear - jy
  out.push({ label: `${years}-year work anniversary`, date: ann, done: false })
  // next review due (last review + 90d, else joining + 90d)
  const lastReview = w.reviews[0]?.createdAt?.slice(0, 10) || w.dateOfJoining
  const reviewDue = shiftYmd(lastReview, 90)
  out.push({ label: 'Next review due', date: reviewDue, done: false })
  return out.sort((a, b) => a.date.localeCompare(b.date))
}

export interface JourneyEvent { date: string; label: string; color: string }
/** A per-employee chronological journey derived from existing records (newest first). */
export function journeyEvents(w: Worker, leaveRequests: LeaveRequest[]): JourneyEvent[] {
  const evs: JourneyEvent[] = []
  evs.push({ date: w.dateOfJoining, label: `Joined as ${w.designation}`, color: '#162660' })
  if (w.accountCreated) evs.push({ date: w.createdAt.slice(0, 10), label: 'Onboarding completed · account created', color: '#10B981' })
  w.projects.forEach(p => evs.push({ date: p.startDate, label: `Assigned to ${p.name}`, color: '#5B77C4' }))
  w.reviews.forEach(r => evs.push({ date: r.createdAt.slice(0, 10), label: `${r.period} review · ${r.rating}★ by ${r.reviewer}`, color: '#0F7A46' }))
  w.feedback.forEach(f => evs.push({ date: f.createdAt.slice(0, 10), label: `1:1 note: ${f.text.length > 48 ? f.text.slice(0, 48) + '…' : f.text}`, color: '#64748B' }))
  leaveRequests.filter(r => r.workerId === w.id && r.status === 'approved').forEach(r => evs.push({ date: r.from, label: `${r.type} — ${r.days}d`, color: '#B45309' }))
  if (w.dateOfExit) evs.push({ date: w.dateOfExit, label: 'Marked inactive / exited', color: '#800020' })
  return evs.sort((a, b) => b.date.localeCompare(a.date))
}
