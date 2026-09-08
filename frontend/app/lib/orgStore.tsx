'use client'

/**
 * The single source of truth for the organization.
 *
 * Edit Structure writes here; the Org Chart and the dashboard counts read from here.
 *
 * Two implementations, same OrgCtx interface, so no consumer needs to know or care
 * which one is active:
 *   - ApiOrgProvider   — a real session exists (real Google login happened): every
 *                        read/write goes through the backend's /api/org/* (Firestore).
 *   - LocalOrgProvider — no session (demo login, or the backend/Firestore isn't set
 *                        up yet): the original localStorage-backed reducer.
 * This means the app keeps working exactly as before under demo login, while a real
 * logged-in session is genuinely backed by the org chart's real data layer.
 */

import React, { createContext, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import {
  Edge, EdgeType, Issue, Level, OrgCounts, OrgData, Person, PersonId, Role, RoleId, Unit, UnitId,
  oid, orgCounts, validateOrg,
} from './orgModel'
import { ROOT_UNIT, SEED_EDGES, SEED_PEOPLE, SEED_ROLES, SEED_UNITS } from './orgSource'
import { getSessionToken } from './authClient'
import { fetchAuditLog, fetchOrgSnapshot, orgApi } from './orgApiClient'

const KEY = 'wop-org-v1'
const AUDIT_KEY = 'wop-org-audit-v1'

/** Every structural change to the org, independent of the workforce store's own audit
 * log — the two track different mutations and must not be conflated. */
export interface OrgAuditEntry {
  id: string
  actor: string
  summary: string
  before?: string
  after?: string
  createdAt: string
}
export const ORG_ADMIN_ACTOR = 'HR Manager' // acting admin for audit attribution (demo/local mode only)

const seed = (): OrgData => ({
  people: SEED_PEOPLE.map(p => ({ ...p, aliases: [...p.aliases] })),
  units: SEED_UNITS.map(u => ({ ...u })),
  roles: SEED_ROLES.map(r => ({ ...r })),
  edges: SEED_EDGES.map(e => ({ ...e })),
  unresolvedRefs: [],
})

type Action =
  | { type: 'HYDRATE'; data: OrgData }
  | { type: 'RESET' }
  | { type: 'ADD_PERSON'; person: Person }
  | { type: 'UPDATE_PERSON'; id: PersonId; patch: Partial<Person> }
  | { type: 'DELETE_PERSON'; id: PersonId }
  | { type: 'ADD_ROLE'; role: Role }
  | { type: 'UPDATE_ROLE'; id: RoleId; patch: Partial<Role> }
  | { type: 'DELETE_ROLE'; id: RoleId }
  | { type: 'ADD_UNIT'; unit: Unit }
  | { type: 'RENAME_UNIT'; id: UnitId; name: string }
  | { type: 'DELETE_UNIT'; id: UnitId }
  | { type: 'ADD_EDGE'; edge: Edge }
  | { type: 'DELETE_EDGE'; id: string }
  | { type: 'SET_UNRESOLVED'; refs: string[] }

/** Drop every edge that touches any of these roles — no edge may outlive its endpoints. */
const pruneEdges = (edges: Edge[], roleIds: Set<RoleId>) =>
  edges.filter(e => !roleIds.has(e.fromRoleId) && !roleIds.has(e.toRoleId))

function reducer(state: OrgData, action: Action): OrgData {
  switch (action.type) {
    case 'HYDRATE': return action.data
    case 'RESET': return seed()

    case 'ADD_PERSON':
      return { ...state, people: [...state.people, action.person] }

    case 'UPDATE_PERSON':
      return { ...state, people: state.people.map(p => (p.id === action.id ? { ...p, ...action.patch } : p)) }

    case 'DELETE_PERSON': {
      // removing a person removes the roles they held and every edge on those roles
      const gone = new Set(state.roles.filter(r => r.personId === action.id).map(r => r.id))
      return {
        ...state,
        people: state.people.filter(p => p.id !== action.id),
        roles: state.roles.filter(r => r.personId !== action.id),
        edges: pruneEdges(state.edges, gone),
      }
    }

    case 'ADD_ROLE':
      return { ...state, roles: [...state.roles, action.role] }

    case 'UPDATE_ROLE':
      return {
        ...state,
        roles: state.roles.map(r => {
          if (r.id !== action.id) return r
          const next = { ...r, ...action.patch }
          // isOpen is derived from personId, never set independently
          next.isOpen = next.personId === null
          return next
        }),
      }

    case 'DELETE_ROLE':
      return {
        ...state,
        roles: state.roles.filter(r => r.id !== action.id),
        edges: pruneEdges(state.edges, new Set([action.id])),
      }

    case 'ADD_UNIT':
      return { ...state, units: [...state.units, action.unit] }

    case 'RENAME_UNIT':
      return { ...state, units: state.units.map(u => (u.id === action.id ? { ...u, name: action.name } : u)) }

    case 'DELETE_UNIT': {
      if (action.id === ROOT_UNIT) return state
      const unit = state.units.find(u => u.id === action.id)
      if (!unit) return state
      // children move up a level; roles in the unit move to its parent rather than vanishing
      const parent = unit.parentId || ROOT_UNIT
      return {
        ...state,
        units: state.units.filter(u => u.id !== action.id).map(u => (u.parentId === action.id ? { ...u, parentId: parent } : u)),
        roles: state.roles.map(r => (r.unitId === action.id ? { ...r, unitId: parent } : r)),
      }
    }

    case 'ADD_EDGE': {
      const dup = state.edges.some(e =>
        e.fromRoleId === action.edge.fromRoleId && e.toRoleId === action.edge.toRoleId && e.type === action.edge.type)
      if (dup || action.edge.fromRoleId === action.edge.toRoleId) return state
      return { ...state, edges: [...state.edges, action.edge] }
    }

    case 'DELETE_EDGE':
      return { ...state, edges: state.edges.filter(e => e.id !== action.id) }

    case 'SET_UNRESOLVED':
      return { ...state, unresolvedRefs: action.refs }

    default: return state
  }
}

/** Tolerate older/partial persisted shapes without throwing. */
function normalize(raw: unknown): OrgData {
  const s = (raw || {}) as Partial<OrgData>
  return {
    people: Array.isArray(s.people) ? s.people : [],
    units: Array.isArray(s.units) && s.units.length ? s.units : SEED_UNITS.map(u => ({ ...u })),
    roles: Array.isArray(s.roles) ? s.roles : [],
    edges: Array.isArray(s.edges) ? s.edges : [],
    unresolvedRefs: Array.isArray(s.unresolvedRefs) ? s.unresolvedRefs : [],
  }
}

export type OrgCtx = OrgData & {
  counts: OrgCounts
  issues: Issue[]
  auditLog: OrgAuditEntry[]
  apiError: string | null
  addPerson: (displayName: string, aliases?: string[]) => Promise<Person>
  updatePerson: (id: PersonId, patch: Partial<Person>) => Promise<void>
  deletePerson: (id: PersonId) => Promise<void>
  addRole: (r: { personId: PersonId | null; unitId: UnitId; level: Level; title: string; isPrimary?: boolean }) => Promise<Role>
  updateRole: (id: RoleId, patch: Partial<Role>) => Promise<void>
  deleteRole: (id: RoleId) => Promise<void>
  addUnit: (name: string, parentId: UnitId | null) => Promise<void>
  renameUnit: (id: UnitId, name: string) => Promise<void>
  deleteUnit: (id: UnitId) => Promise<void>
  addEdge: (fromRoleId: RoleId, toRoleId: RoleId, type: EdgeType) => Promise<void>
  deleteEdge: (id: string) => Promise<void>
  setUnresolvedRefs: (refs: string[]) => void
  resetToSource: () => Promise<void>
}

const Ctx = createContext<OrgCtx | null>(null)

function normalizeAudit(raw: unknown): OrgAuditEntry[] {
  return Array.isArray(raw) ? raw as OrgAuditEntry[] : []
}

/* ============================== local / demo mode ============================== */

function LocalOrgProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined as unknown as OrgData, seed)
  const [auditLog, setAuditLog] = useState<OrgAuditEntry[]>([])
  const logAudit = (summary: string, before?: string, after?: string) => {
    setAuditLog(prev => [{ id: oid('audit'), actor: ORG_ADMIN_ACTOR, summary, before, after, createdAt: new Date().toISOString() }, ...prev])
  }

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY)
      if (raw) dispatch({ type: 'HYDRATE', data: normalize(JSON.parse(raw)) })
      const rawAudit = localStorage.getItem(AUDIT_KEY)
      if (rawAudit) setAuditLog(normalizeAudit(JSON.parse(rawAudit)))
    } catch { /* ignore */ }
  }, [])

  // skip the first write so the fresh seed cannot clobber persisted data before hydration
  const skipFirst = useRef(true)
  useEffect(() => {
    if (skipFirst.current) { skipFirst.current = false; return }
    try { localStorage.setItem(KEY, JSON.stringify(state)) } catch { /* ignore */ }
  }, [state])

  const skipFirstAudit = useRef(true)
  useEffect(() => {
    if (skipFirstAudit.current) { skipFirstAudit.current = false; return }
    try { localStorage.setItem(AUDIT_KEY, JSON.stringify(auditLog)) } catch { /* ignore */ }
  }, [auditLog])

  const value: OrgCtx = useMemo(() => ({
    ...state,
    counts: orgCounts(state),
    issues: validateOrg(state),
    auditLog,
    apiError: null,

    addPerson: async (displayName, aliases = []) => {
      const person: Person = { id: oid('person'), displayName: displayName.trim(), aliases }
      dispatch({ type: 'ADD_PERSON', person })
      logAudit(`Added ${person.displayName}`)
      return person
    },
    updatePerson: async (id, patch) => {
      const before = state.people.find(p => p.id === id)
      dispatch({ type: 'UPDATE_PERSON', id, patch })
      if (patch.displayName && before && patch.displayName !== before.displayName) {
        logAudit(`Renamed a person`, before.displayName, patch.displayName)
      }
    },
    deletePerson: async id => {
      const person = state.people.find(p => p.id === id)
      dispatch({ type: 'DELETE_PERSON', id })
      logAudit(`Deleted ${person?.displayName || id} and their roles/relationships`)
    },

    addRole: async r => {
      const role: Role = {
        id: oid('role'), personId: r.personId, unitId: r.unitId, level: r.level,
        title: r.title.trim(), isPrimary: !!r.isPrimary, isOpen: r.personId === null,
      }
      dispatch({ type: 'ADD_ROLE', role })
      logAudit(`Added role "${role.title}"`)
      return role
    },
    updateRole: async (id, patch) => {
      const before = state.roles.find(r => r.id === id)
      dispatch({ type: 'UPDATE_ROLE', id, patch })
      if (before) logAudit(`Updated role "${before.title}"`)
    },
    deleteRole: async id => {
      const role = state.roles.find(r => r.id === id)
      dispatch({ type: 'DELETE_ROLE', id })
      logAudit(`Removed role "${role?.title || id}"`)
    },

    addUnit: async (name, parentId) => {
      dispatch({ type: 'ADD_UNIT', unit: { id: oid('unit'), name: name.trim(), parentId: parentId || ROOT_UNIT } })
      logAudit(`Added department "${name.trim()}"`)
    },
    renameUnit: async (id, name) => {
      const before = state.units.find(u => u.id === id)
      dispatch({ type: 'RENAME_UNIT', id, name: name.trim() })
      if (before) logAudit(`Renamed department`, before.name, name.trim())
    },
    deleteUnit: async id => {
      const unit = state.units.find(u => u.id === id)
      dispatch({ type: 'DELETE_UNIT', id })
      logAudit(`Deleted department "${unit?.name || id}"`)
    },

    addEdge: async (fromRoleId, toRoleId, type) => {
      dispatch({ type: 'ADD_EDGE', edge: { id: oid('edge'), fromRoleId, toRoleId, type } })
      logAudit(`Added relationship (${type})`)
    },
    deleteEdge: async id => {
      dispatch({ type: 'DELETE_EDGE', id })
      logAudit(`Removed a relationship`)
    },

    setUnresolvedRefs: refs => dispatch({ type: 'SET_UNRESOLVED', refs }),
    resetToSource: async () => {
      dispatch({ type: 'RESET' })
      logAudit(`Reset the entire organization to the HR matrix source`)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [state, auditLog])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

/* ============================== real / API mode ============================== */

function ApiOrgProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<OrgData>({ people: [], units: [], roles: [], edges: [], unresolvedRefs: [] })
  const [auditLog, setAuditLog] = useState<OrgAuditEntry[]>([])
  const [apiError, setApiError] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)

  const refresh = async () => {
    try {
      const [snapshot, audit] = await Promise.all([fetchOrgSnapshot(), fetchAuditLog()])
      setData(d => ({ ...snapshot, unresolvedRefs: d.unresolvedRefs }))
      setAuditLog(audit)
      setApiError(null)
    } catch (e) {
      setApiError(e instanceof Error ? e.message : 'Could not reach the org API')
    } finally {
      setLoaded(true)
    }
  }

  useEffect(() => { refresh() }, [])

  /** Every mutation: call the API, then re-fetch — the backend is the only source of
   * truth here, so we don't duplicate its reducer logic (pruning, reparenting, etc.)
   * on the client. Errors surface via apiError rather than throwing into onClick
   * handlers that don't await these calls. */
  const mutate = async <T,>(fn: () => Promise<T>): Promise<T> => {
    try {
      const result = await fn()
      await refresh()
      return result
    } catch (e) {
      setApiError(e instanceof Error ? e.message : 'That change could not be saved')
      throw e
    }
  }

  const value: OrgCtx = useMemo(() => ({
    ...data,
    counts: orgCounts(data),
    issues: validateOrg(data),
    auditLog,
    apiError: loaded ? apiError : null,

    addPerson: (displayName) => mutate(async () => {
      const p = await orgApi.addPerson(displayName.trim())
      return { id: p.id, displayName: p.display_name, aliases: [] }
    }),
    updatePerson: (id, patch) => mutate(async () => {
      if (patch.displayName) await orgApi.updatePerson(id, patch.displayName)
    }),
    deletePerson: (id) => mutate(() => orgApi.deletePerson(id)),

    addRole: (r) => mutate(async () => {
      const role = await orgApi.addRole(r)
      return { id: role.id, personId: role.person_id, unitId: role.unit_id, level: role.level as Level, title: role.title, isPrimary: role.is_primary, isOpen: role.person_id === null }
    }),
    updateRole: (id, patch) => mutate(() => orgApi.updateRole(id, patch)),
    deleteRole: (id) => mutate(() => orgApi.deleteRole(id)),

    addUnit: (name, parentId) => mutate(async () => { await orgApi.addUnit(name.trim(), parentId) }),
    renameUnit: (id, name) => mutate(() => orgApi.renameUnit(id, name.trim())),
    deleteUnit: (id) => mutate(() => orgApi.deleteUnit(id)),

    addEdge: (fromRoleId, toRoleId, type) => mutate(async () => { await orgApi.addEdge(fromRoleId, toRoleId, type) }),
    deleteEdge: (id) => mutate(() => orgApi.deleteEdge(id)),

    setUnresolvedRefs: refs => setData(d => ({ ...d, unresolvedRefs: refs })),
    resetToSource: () => mutate(() => orgApi.reset()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [data, auditLog, apiError, loaded])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

/* ============================== entry point ============================== */

export function OrgProvider({ children }: { children: React.ReactNode }) {
  // Starts 'local' unconditionally — matching what the server renders, since
  // localStorage (and therefore any session) doesn't exist during SSR. Checking the
  // session in a plain useState initializer would make the client's first render
  // diverge from the server's, which React flags as a hydration error. Instead the
  // session check happens in an effect, after hydration — a real session flips to
  // 'api' one render later, briefly showing local/seed data first.
  const [mode, setMode] = useState<'local' | 'api'>('local')
  useEffect(() => {
    if (getSessionToken()) setMode('api')
  }, [])
  return mode === 'api' ? <ApiOrgProvider>{children}</ApiOrgProvider> : <LocalOrgProvider>{children}</LocalOrgProvider>
}

export function useOrg(): OrgCtx {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useOrg must be used within OrgProvider')
  return ctx
}
