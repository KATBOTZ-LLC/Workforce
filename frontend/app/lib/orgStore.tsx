'use client'

/**
 * The single source of truth for the organization.
 *
 * Edit Structure writes here; the Org Chart and the dashboard counts read from here.
 * There is no second dataset and no hardcoded chart state — a change dispatched by the
 * editor re-renders the chart in the same React commit, with no refresh.
 *
 * State is persisted to localStorage using the same pattern as the workforce store.
 */

import React, { createContext, useContext, useEffect, useMemo, useReducer, useRef } from 'react'
import {
  Edge, EdgeType, Issue, Level, OrgCounts, OrgData, Person, PersonId, Role, RoleId, Unit, UnitId,
  oid, orgCounts, validateOrg,
} from './orgModel'
import { ROOT_UNIT, SEED_EDGES, SEED_PEOPLE, SEED_ROLES, SEED_UNITS } from './orgSource'

const KEY = 'wop-org-v1'

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
  addPerson: (displayName: string, aliases?: string[]) => Person
  updatePerson: (id: PersonId, patch: Partial<Person>) => void
  deletePerson: (id: PersonId) => void
  addRole: (r: { personId: PersonId | null; unitId: UnitId; level: Level; title: string; isPrimary?: boolean }) => Role
  updateRole: (id: RoleId, patch: Partial<Role>) => void
  deleteRole: (id: RoleId) => void
  addUnit: (name: string, parentId: UnitId | null) => void
  renameUnit: (id: UnitId, name: string) => void
  deleteUnit: (id: UnitId) => void
  addEdge: (fromRoleId: RoleId, toRoleId: RoleId, type: EdgeType) => void
  deleteEdge: (id: string) => void
  setUnresolvedRefs: (refs: string[]) => void
  resetToSource: () => void
}

const Ctx = createContext<OrgCtx | null>(null)

export function OrgProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined as unknown as OrgData, seed)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY)
      if (raw) dispatch({ type: 'HYDRATE', data: normalize(JSON.parse(raw)) })
    } catch { /* ignore */ }
  }, [])

  // skip the first write so the fresh seed cannot clobber persisted data before hydration
  const skipFirst = useRef(true)
  useEffect(() => {
    if (skipFirst.current) { skipFirst.current = false; return }
    try { localStorage.setItem(KEY, JSON.stringify(state)) } catch { /* ignore */ }
  }, [state])

  const value: OrgCtx = useMemo(() => ({
    ...state,
    counts: orgCounts(state),
    issues: validateOrg(state),

    addPerson: (displayName, aliases = []) => {
      const person: Person = { id: oid('person'), displayName: displayName.trim(), aliases }
      dispatch({ type: 'ADD_PERSON', person })
      return person
    },
    updatePerson: (id, patch) => dispatch({ type: 'UPDATE_PERSON', id, patch }),
    deletePerson: id => dispatch({ type: 'DELETE_PERSON', id }),

    addRole: r => {
      const role: Role = {
        id: oid('role'), personId: r.personId, unitId: r.unitId, level: r.level,
        title: r.title.trim(), isPrimary: !!r.isPrimary, isOpen: r.personId === null,
      }
      dispatch({ type: 'ADD_ROLE', role })
      return role
    },
    updateRole: (id, patch) => dispatch({ type: 'UPDATE_ROLE', id, patch }),
    deleteRole: id => dispatch({ type: 'DELETE_ROLE', id }),

    addUnit: (name, parentId) =>
      dispatch({ type: 'ADD_UNIT', unit: { id: oid('unit'), name: name.trim(), parentId: parentId || ROOT_UNIT } }),
    renameUnit: (id, name) => dispatch({ type: 'RENAME_UNIT', id, name: name.trim() }),
    deleteUnit: id => dispatch({ type: 'DELETE_UNIT', id }),

    addEdge: (fromRoleId, toRoleId, type) =>
      dispatch({ type: 'ADD_EDGE', edge: { id: oid('edge'), fromRoleId, toRoleId, type } }),
    deleteEdge: id => dispatch({ type: 'DELETE_EDGE', id }),

    setUnresolvedRefs: refs => dispatch({ type: 'SET_UNRESOLVED', refs }),
    resetToSource: () => dispatch({ type: 'RESET' }),
  }), [state])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useOrg(): OrgCtx {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useOrg must be used within OrgProvider')
  return ctx
}
