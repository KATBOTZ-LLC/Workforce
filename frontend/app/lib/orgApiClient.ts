'use client'

/**
 * HTTP client for the real org-chart API (backend/app/org.py), plus the
 * snake_case (backend) <-> camelCase (frontend OrgData) mapping. Used only by
 * orgStore.tsx's ApiOrgProvider — the local/reducer path never touches this.
 */

import { API_BASE, AuthError, getSessionToken } from './authClient'
import { Edge, EdgeType, Level, OrgData, Person, Role, Unit } from './orgModel'

async function authedFetch(path: string, init: RequestInit = {}): Promise<any> {
  const token = getSessionToken()
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { ...(init.headers || {}), Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  })
  if (!res.ok) {
    let detail = res.statusText
    try { detail = (await res.json()).detail || detail } catch { /* ignore */ }
    throw new AuthError(detail)
  }
  if (res.status === 204) return null
  return res.json()
}

type ApiPerson = { id: string; display_name: string }
type ApiUnit = { id: string; name: string; parent_id: string | null }
type ApiRole = { id: string; person_id: string | null; unit_id: string; level: number; title: string; is_primary: boolean }
type ApiEdge = { id: string; from_role_id: string; to_role_id: string; type: string }
type ApiSnapshot = { people: ApiPerson[]; units: ApiUnit[]; roles: ApiRole[]; edges: ApiEdge[] }
type ApiAuditEntry = { id: string; actor: string; summary: string; before: string | null; after: string | null; created_at: string | null }

// aliases aren't stored by the backend yet (nobody in the real org chart has any
// today) — mapping to [] here is a known simplification, not data loss.
const toPerson = (p: ApiPerson): Person => ({ id: p.id, displayName: p.display_name, aliases: [] })
const toUnit = (u: ApiUnit): Unit => ({ id: u.id, name: u.name, parentId: u.parent_id })
const toRole = (r: ApiRole): Role => ({
  id: r.id, personId: r.person_id, unitId: r.unit_id, level: r.level as Level,
  title: r.title, isPrimary: r.is_primary, isOpen: r.person_id === null,
})
const toEdge = (e: ApiEdge): Edge => ({ id: e.id, fromRoleId: e.from_role_id, toRoleId: e.to_role_id, type: e.type as EdgeType })

export async function fetchOrgSnapshot(): Promise<Omit<OrgData, 'unresolvedRefs'>> {
  const snap: ApiSnapshot = await authedFetch('/api/org')
  return {
    people: snap.people.map(toPerson),
    units: snap.units.map(toUnit),
    roles: snap.roles.map(toRole),
    edges: snap.edges.map(toEdge),
  }
}

export interface ApiAuditEntryOut {
  id: string; actor: string; summary: string; before?: string; after?: string; createdAt: string
}
export async function fetchAuditLog(): Promise<ApiAuditEntryOut[]> {
  const entries: ApiAuditEntry[] = await authedFetch('/api/org/audit-log')
  return entries.map(e => ({
    id: e.id, actor: e.actor, summary: e.summary,
    before: e.before ?? undefined, after: e.after ?? undefined, createdAt: e.created_at || '',
  }))
}

export const orgApi = {
  addPerson: (displayName: string): Promise<ApiPerson> =>
    authedFetch('/api/org/people', { method: 'POST', body: JSON.stringify({ display_name: displayName }) }),
  updatePerson: (id: string, displayName: string): Promise<void> =>
    authedFetch(`/api/org/people/${id}`, { method: 'PATCH', body: JSON.stringify({ display_name: displayName }) }),
  deletePerson: (id: string): Promise<void> =>
    authedFetch(`/api/org/people/${id}`, { method: 'DELETE' }),

  addRole: (r: { personId: string | null; unitId: string; level: number; title: string; isPrimary?: boolean }): Promise<ApiRole> =>
    authedFetch('/api/org/roles', {
      method: 'POST',
      body: JSON.stringify({ person_id: r.personId, unit_id: r.unitId, level: r.level, title: r.title, is_primary: !!r.isPrimary }),
    }),
  updateRole: (id: string, patch: { personId?: string | null; unitId?: string; level?: number; title?: string }): Promise<void> =>
    authedFetch(`/api/org/roles/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ person_id: patch.personId, unit_id: patch.unitId, level: patch.level, title: patch.title }),
    }),
  deleteRole: (id: string): Promise<void> =>
    authedFetch(`/api/org/roles/${id}`, { method: 'DELETE' }),

  addUnit: (name: string, parentId: string | null): Promise<{ id: string }> =>
    authedFetch('/api/org/units', { method: 'POST', body: JSON.stringify({ name, parent_id: parentId }) }),
  renameUnit: (id: string, name: string): Promise<void> =>
    authedFetch(`/api/org/units/${id}`, { method: 'PATCH', body: JSON.stringify({ name }) }),
  deleteUnit: (id: string): Promise<void> =>
    authedFetch(`/api/org/units/${id}`, { method: 'DELETE' }),

  addEdge: (fromRoleId: string, toRoleId: string, type: EdgeType): Promise<{ id: string }> =>
    authedFetch('/api/org/edges', { method: 'POST', body: JSON.stringify({ from_role_id: fromRoleId, to_role_id: toRoleId, type }) }),
  deleteEdge: (id: string): Promise<void> =>
    authedFetch(`/api/org/edges/${id}`, { method: 'DELETE' }),

  reset: (): Promise<void> => authedFetch('/api/org/reset', { method: 'POST' }),
}
