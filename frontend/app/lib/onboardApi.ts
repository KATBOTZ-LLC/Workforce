'use client'

/**
 * The worker's own side of onboarding, reached by their emailed link.
 *
 * There is no sign-in here: the token in the URL IS the credential. That is why
 * the backend stores only its SHA-256 hash, expires it after seven days, and
 * answers 404 identically for a wrong token and an expired one — so the
 * endpoint cannot be used to discover which links exist.
 */

import { API_BASE } from './authClient'

export interface OnboardItem {
  document_id: string
  document_name: string
  is_mandatory: boolean
  status: 'Outstanding' | 'Pending' | 'Approved' | 'Rejected'
  reference_url: string | null
  expiry_date: string | null
  current_file_id: string | null
  current_file_name: string | null
  review_status: string | null
  rejection_reason: string | null
  scan_state: string | null
  version_count: number
}

export interface OnboardChecklist {
  employment_id: string
  employment_code: string
  display_name: string
  worker_type: string
  region: string | null
  stage: string
  items: OnboardItem[]
  mandatory_outstanding: number
  can_activate: boolean
}

export class LinkInvalid extends Error {}

export async function fetchChecklist(token: string): Promise<OnboardChecklist> {
  const res = await fetch(`${API_BASE}/api/onboard/${encodeURIComponent(token)}`, {
    cache: 'no-store',
  })
  if (res.status === 404) throw new LinkInvalid('This onboarding link is not valid or has expired')
  if (!res.ok) throw new Error(`Could not load your checklist (${res.status})`)
  return res.json()
}

export async function uploadDocument(
  token: string, documentId: string, file: File,
): Promise<void> {
  const body = new FormData()
  body.append('file', file)
  const res = await fetch(
    `${API_BASE}/api/onboard/${encodeURIComponent(token)}/upload/${documentId}`,
    { method: 'POST', body },
  )
  if (!res.ok) {
    let detail = `Upload failed (${res.status})`
    try { detail = (await res.json()).detail || detail } catch { /* keep the status */ }
    throw new Error(detail)
  }
}

/** Kept in one place so the page and the API cannot disagree about what is
 * accepted — the backend refuses anything else regardless. */
export const ACCEPTED = '.pdf,.jpg,.jpeg,.png,.heic'
export const MAX_MB = 15
