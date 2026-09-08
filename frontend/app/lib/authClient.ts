'use client'

/**
 * Real Google Sign-In, talking to the FastAPI backend (backend/app/auth.py,
 * backend/app/me.py). Nothing here decides who has what access — the backend's
 * /api/me derives that fresh from the org chart on every call. This module only
 * carries the session token and exposes what the backend said.
 */

// Empty means "same origin": requests go to /api/... and Next.js rewrites them
// to the backend (see next.config.js). Set NEXT_PUBLIC_API_BASE_URL only if the
// API really is on a different host, which also reintroduces CORS.
export const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || ''
export const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ''

const SESSION_KEY = 'wop-session-token'

export function getSessionToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(SESSION_KEY)
}
export function setSessionToken(token: string) {
  localStorage.setItem(SESSION_KEY, token)
}
export function clearSession() {
  localStorage.removeItem(SESSION_KEY)
}

export type AccessTier = 'founder' | 'hr' | 'employee' | 'intern'

export interface MeProfile {
  person_id: string
  display_name: string
  email: string
  role_title: string | null
  department: string | null
  tier: AccessTier
  can_edit_structure: boolean
  visible_person_ids: string[] | 'all'
}

export class AuthError extends Error {}

async function parseErrorDetail(res: Response): Promise<string> {
  try {
    const body = await res.json()
    return body.detail || res.statusText
  } catch {
    return res.statusText
  }
}

/** Exchanges a Google ID token (from Google Identity Services) for our own session
 * token. Throws AuthError with the backend's reason (e.g. wrong domain) on failure. */
export async function loginWithGoogleIdToken(idToken: string): Promise<{ session_token: string; email: string; name: string }> {
  const res = await fetch(`${API_BASE}/api/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id_token: idToken }),
  })
  if (!res.ok) throw new AuthError(await parseErrorDetail(res))
  return res.json()
}

/** Who the current session is, and what they're allowed to see — always re-derived
 * server-side, never cached client-side beyond this one call. */
export async function fetchMe(sessionToken: string): Promise<MeProfile> {
  const res = await fetch(`${API_BASE}/api/me`, {
    headers: { Authorization: `Bearer ${sessionToken}` },
  })
  if (!res.ok) throw new AuthError(await parseErrorDetail(res))
  return res.json()
}

/** Bridges a real access tier into the app's existing internal `?role=` param, so
 * pages that still branch on role=='employee' keep working during the migration off
 * that pattern. Founder/HR get the admin experience; everyone else gets employee. */
export function internalRoleFor(tier: AccessTier): 'admin' | 'employee' {
  return tier === 'founder' || tier === 'hr' ? 'admin' : 'employee'
}

/** The workforce store's Worker id for this org person — see workforceStore.tsx's
 * seed(), which derives `w-<suffix>` from the same `person_<suffix>` id. */
export function workerIdFor(personId: string): string {
  return `w-${personId.replace(/^person_/, '')}`
}

/** Loads the Google Identity Services script once and resolves when `window.google`
 * is ready. Safe to call multiple times — later calls reuse the same promise. */
let gisPromise: Promise<void> | null = null
export function loadGoogleIdentityServices(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'))
  if ((window as any).google?.accounts?.id) return Promise.resolve()
  if (gisPromise) return gisPromise
  gisPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Google Identity Services'))
    document.head.appendChild(script)
  })
  return gisPromise
}
