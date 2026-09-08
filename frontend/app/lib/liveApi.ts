'use client'

/**
 * Client for the PostgreSQL-backed endpoints (backend/app/directory.py).
 *
 * Nothing here decides what the caller may see. The backend resolves that from
 * the org chart on every single request, so this module cannot widen access by
 * asking differently — a 403 here is the database's answer, not a UI state.
 */

import { API_BASE, getSessionToken, setSessionToken } from './authClient'

export interface Seat {
  role_id: string
  title: string
  department: string
  level: number | null
  is_primary: boolean
  base_tier: string
}

export interface DirectoryEntry {
  person_id: string
  display_name: string
  email: string | null
  seats: Seat[]
  resolved_tier: string
}

export interface HeadcountRow {
  department: string
  filled_seats: number
  open_seats: number
  people: number
}

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function authed<T>(path: string): Promise<T> {
  const token = getSessionToken()
  if (!token) throw new ApiError(401, 'Not signed in')
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    let detail = res.statusText
    try { detail = (await res.json()).detail || detail } catch { /* keep statusText */ }
    throw new ApiError(res.status, detail)
  }
  return res.json()
}

export const fetchDirectory = () => authed<DirectoryEntry[]>('/api/directory')
export const fetchHeadcount = () => authed<HeadcountRow[]>('/api/directory/headcount')
export const searchDirectory = (q: string) =>
  authed<DirectoryEntry[]>(`/api/directory/search?q=${encodeURIComponent(q)}`)

export interface DevSignIn {
  passcodeRequired: boolean
  emails: string[]
}

/** What the dev sign-in will accept. null means the route does not exist, which
 * is the normal state — treat it as "dev sign-in unavailable", not an error.
 *
 * When a passcode is required and not yet supplied, `emails` comes back empty:
 * the list is 34 real names and addresses, so the backend withholds it rather
 * than showing it to anyone who loads the page. */
export async function fetchDevSignIn(passcode?: string): Promise<DevSignIn | null> {
  try {
    const q = passcode ? `?passcode=${encodeURIComponent(passcode)}` : ''
    const res = await fetch(`${API_BASE}/api/dev/emails${q}`)
    if (!res.ok) return null
    const body = await res.json()
    return { passcodeRequired: !!body.passcode_required, emails: body.emails || [] }
  } catch {
    return null
  }
}

export async function devLogin(email: string, passcode?: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/dev/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, passcode: passcode || null }),
  })
  if (!res.ok) {
    let detail = res.statusText
    try { detail = (await res.json()).detail || detail } catch { /* keep statusText */ }
    throw new ApiError(res.status, detail)
  }
  setSessionToken((await res.json()).session_token)
}

/* ---------------- Onboarding (backend/app/employees.py) ---------------- */

export interface RosterRow {
  employment_id: string
  employment_code: string
  person_id: string
  display_name: string
  professional_email: string | null
  worker_type: string
  contractor_mode: string | null
  designation: string
  department: string | null
  work_location: string | null
  region: string | null
  hr_lead: string | null
  joined_on: string
  exited_on: string | null
  stage: string
  docs_total: number
  docs_approved: number
  docs_mandatory_outstanding: number
  can_activate: boolean
}

export interface FormOptions {
  departments: { id: string; name: string }[]
  work_locations: { id: string; name: string; region: string }[]
  hr_leads: { id: string; name: string }[]
}

export interface CreatedWorker {
  employment_code: string
  region: string
  documents_required: number
  documents_mandatory: number
  onboarding_url: string
  onboarding_token: string
}

export interface NewWorker {
  first_name: string
  last_name?: string | null
  professional_email: string
  personal_email?: string | null
  worker_type: 'Employee' | 'Contractor' | 'Intern'
  contractor_mode?: 'independent' | 'c2c' | null
  designation: string
  department_id: string
  work_location_id: string
  hr_lead_person_id?: string | null
  joined_on: string
}

export const fetchRoster = () => authed<RosterRow[]>('/api/employees')
export const fetchFormOptions = () => authed<FormOptions>('/api/employees/options')

/** Creates PERSON, PERSON_EMAIL, EMPLOYMENT, EMPLOYMENT_ASSIGNMENT, the whole
 * WORKER_DOCUMENT checklist and an ONBOARDING_TOKEN — in one transaction. The
 * returned link is the only time the raw token exists; the database keeps only
 * its hash. */
export async function createWorker(input: NewWorker): Promise<CreatedWorker> {
  const token = getSessionToken()
  if (!token) throw new ApiError(401, 'Not signed in')
  const res = await fetch(`${API_BASE}/api/employees`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!res.ok) {
    let detail = res.statusText
    try {
      const body = await res.json()
      // FastAPI validation errors arrive as a list of per-field objects.
      detail = Array.isArray(body.detail)
        ? body.detail.map((d: any) => `${d.loc?.slice(1).join('.') || 'field'}: ${d.msg}`).join('; ')
        : body.detail || detail
    } catch { /* keep statusText */ }
    throw new ApiError(res.status, detail)
  }
  return res.json()
}

// ---------------------------------------------------------------------------
// Roster, checklists and verification (backend/app/employees.py, documents.py)
// ---------------------------------------------------------------------------


export interface ChecklistItem {
  document_id: string
  document_name: string
  is_mandatory: boolean
  status: string
  reference_url: string | null
  expiry_date: string | null
  current_file_id: string | null
  current_file_name: string | null
  review_status: string | null
  rejection_reason: string | null
  scan_state: string | null
  version_count: number
}

export interface Checklist {
  employment_id: string
  employment_code: string
  display_name: string
  worker_type: string
  region: string | null
  stage: string
  items: ChecklistItem[]
  mandatory_outstanding: number
  can_activate: boolean
}

async function send<T>(path: string, init: RequestInit): Promise<T> {
  const token = getSessionToken()
  if (!token) throw new ApiError(401, 'Not signed in')
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { ...(init.headers || {}), Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    let detail = res.statusText
    try { detail = (await res.json()).detail || detail } catch { /* keep statusText */ }
    throw new ApiError(res.status, detail)
  }
  return res.status === 204 ? (null as T) : res.json()
}

export const fetchChecklistFor = (employmentId: string) =>
  authed<Checklist>(`/api/documents/checklist/${employmentId}`)

/** Approve or reject one FILE VERSION, not the checklist item. A change of mind
 * is a new upload, so both decisions stay on record — the backend refuses a
 * second review of the same version. */
export const reviewFile = (fileId: string, decision: 'Approved' | 'Rejected', reason?: string) =>
  send<{ mandatory_outstanding: number; can_activate: boolean }>(
    `/api/documents/files/${fileId}/review`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision, rejection_reason: reason || null }),
    },
  )

export const activateEmployment = (employmentId: string) =>
  send<{ employment_code: string; stage: string; message: string }>(
    `/api/employees/${employmentId}/activate`, { method: 'POST' },
  )

/** HR uploading on a worker's behalf — for someone who emails their documents
 * instead of using their link. */
export async function uploadAsHr(documentId: string, file: File): Promise<void> {
  const body = new FormData()
  body.append('file', file)
  await send(`/api/documents/${documentId}/upload`, { method: 'POST', body })
}
