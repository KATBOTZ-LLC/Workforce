/**
 * Canonical organization model.
 *
 * Three things are kept strictly separate, because conflating them is what broke the
 * previous org chart:
 *
 *   Person  — a unique human. One record, however many hats they wear.
 *   Role    — a position inside a Unit at a Level. A Person may hold several; a Role
 *             with `personId: null` is an open vacancy, NOT a fake person.
 *   Edge    — an explicit relationship between two Roles.
 *
 * LEVEL AND DEPARTMENT ARE PRESENTATION ONLY. Level sets the vertical band, Unit sets
 * the column. Neither creates a connector. A connector exists if and only if there is
 * an Edge. Where a relationship is unknown, there is no edge — nothing is inferred.
 */

export type PersonId = string
export type UnitId = string
export type RoleId = string

export type Person = {
  id: PersonId
  displayName: string
  /** Other spellings that resolve to this same human (confirmed identities only). */
  aliases: string[]
}

export type Unit = {
  id: UnitId
  name: string
  parentId: UnitId | null
}

/** 0 = executive band … 4 = interns / junior. Visual grouping only. */
export type Level = 0 | 1 | 2 | 3 | 4
export const LEVELS: Level[] = [0, 1, 2, 3, 4]
export const LEVEL_LABEL: Record<Level, string> = {
  0: 'Level 0', 1: 'Level 1', 2: 'Level 2', 3: 'Level 3', 4: 'Level 4',
}

export type Role = {
  id: RoleId
  /** null = the position exists but nobody holds it yet. */
  personId: PersonId | null
  unitId: UnitId
  level: Level
  title: string
  /** The person's main role, when they hold more than one. */
  isPrimary: boolean
  isOpen: boolean
}

export type EdgeType = 'reports_to' | 'accountable_to' | 'dotted'
export const EDGE_TYPES: EdgeType[] = ['reports_to', 'accountable_to', 'dotted']
export const EDGE_TYPE_LABEL: Record<EdgeType, string> = {
  reports_to: 'Reports to',
  accountable_to: 'Accountable to',
  dotted: 'Dotted line',
}

export type Edge = {
  id: string
  /** The subordinate / dependent role. */
  fromRoleId: RoleId
  /** The role being reported to. */
  toRoleId: RoleId
  type: EdgeType
}

export type OrgData = {
  people: Person[]
  units: Unit[]
  roles: Role[]
  edges: Edge[]
  /** teamLead references in the workforce store that match no Person. Never auto-resolved. */
  unresolvedRefs: string[]
}

/* ------------------------------- derived counts ------------------------------- */

export type OrgCounts = {
  people: number
  roles: number
  units: number
  openRoles: number
  relationships: number
}

export function orgCounts(d: OrgData): OrgCounts {
  return {
    people: d.people.length,
    roles: d.roles.length,
    units: d.units.length,
    openRoles: d.roles.filter(r => r.personId === null).length,
    relationships: d.edges.length,
  }
}

/* --------------------------------- validation --------------------------------- */

export type Severity = 'error' | 'warning'
export type Issue = { severity: Severity; code: string; message: string; ref?: string }

/**
 * Structural checks over the canonical data. Nothing here mutates or repairs — the
 * point is to surface corruption rather than silently paper over it.
 */
export function validateOrg(d: OrgData): Issue[] {
  const issues: Issue[] = []
  const err = (code: string, message: string, ref?: string) => issues.push({ severity: 'error', code, message, ref })
  const warn = (code: string, message: string, ref?: string) => issues.push({ severity: 'warning', code, message, ref })

  // duplicate person ids
  const seenPerson = new Set<PersonId>()
  d.people.forEach(p => {
    if (seenPerson.has(p.id)) err('duplicate_person_id', `Two Person records share the id "${p.id}".`, p.id)
    seenPerson.add(p.id)
  })

  // an alias must not be claimed by two different people, and must not collide with
  // another person's display name — that is how duplicate humans creep back in
  const claim = new Map<string, PersonId>()
  d.people.forEach(p => {
    const keys = [p.displayName, ...p.aliases].map(s => s.trim().toLowerCase())
    keys.forEach(k => {
      const owner = claim.get(k)
      if (owner && owner !== p.id) {
        err('ambiguous_identity', `"${k}" resolves to both ${owner} and ${p.id}.`, p.id)
      }
      claim.set(k, p.id)
    })
  })

  const personIds = new Set(d.people.map(p => p.id))
  const unitIds = new Set(d.units.map(u => u.id))
  const roleIds = new Set(d.roles.map(r => r.id))

  // units
  const seenUnit = new Set<UnitId>()
  d.units.forEach(u => {
    if (seenUnit.has(u.id)) err('duplicate_unit_id', `Two Unit records share the id "${u.id}".`, u.id)
    seenUnit.add(u.id)
    if (u.parentId && !unitIds.has(u.parentId)) err('invalid_unit_parent', `Unit "${u.name}" has a parent that does not exist.`, u.id)
  })

  // roles
  const seenRole = new Set<RoleId>()
  d.roles.forEach(r => {
    if (seenRole.has(r.id)) err('duplicate_role_id', `Two Role records share the id "${r.id}".`, r.id)
    seenRole.add(r.id)
    if (r.personId !== null && !personIds.has(r.personId)) {
      err('invalid_person_ref', `Role "${r.title}" points at a Person that does not exist.`, r.id)
    }
    if (!unitIds.has(r.unitId)) err('invalid_unit_ref', `Role "${r.title}" points at a department that does not exist.`, r.id)
    if (!LEVELS.includes(r.level)) err('invalid_level', `Role "${r.title}" has level ${r.level}, outside 0-4.`, r.id)
    // an open role must not be pretending to hold someone, and vice versa
    if (r.isOpen && r.personId !== null) err('open_role_has_person', `Role "${r.title}" is marked open but has a person assigned.`, r.id)
    if (!r.isOpen && r.personId === null) err('filled_role_has_no_person', `Role "${r.title}" is marked filled but has nobody assigned.`, r.id)
  })

  // one primary role per person at most
  const primaries = new Map<PersonId, number>()
  d.roles.forEach(r => {
    if (r.personId && r.isPrimary) primaries.set(r.personId, (primaries.get(r.personId) || 0) + 1)
  })
  primaries.forEach((n, pid) => {
    if (n > 1) warn('multiple_primary_roles', `${d.people.find(p => p.id === pid)?.displayName || pid} has ${n} roles marked primary.`, pid)
  })

  // edges
  const seenEdge = new Set<string>()
  d.edges.forEach(e => {
    if (!roleIds.has(e.fromRoleId)) err('edge_missing_from', `A ${e.type} edge starts at a role that does not exist.`, e.id)
    if (!roleIds.has(e.toRoleId)) err('edge_missing_to', `A ${e.type} edge ends at a role that does not exist.`, e.id)
    if (e.fromRoleId === e.toRoleId) err('self_edge', 'A role cannot report to itself.', e.id)
    const key = `${e.fromRoleId}>${e.toRoleId}:${e.type}`
    if (seenEdge.has(key)) err('duplicate_edge', 'The same relationship is recorded twice.', e.id)
    seenEdge.add(key)
  })

  // cycles are disallowed for reports_to only (accountable_to / dotted may legitimately loop)
  const up = new Map<RoleId, RoleId[]>()
  d.edges.filter(e => e.type === 'reports_to').forEach(e => {
    const arr = up.get(e.fromRoleId)
    if (arr) arr.push(e.toRoleId); else up.set(e.fromRoleId, [e.toRoleId])
  })
  const WHITE = 0, GREY = 1, BLACK = 2
  const mark = new Map<RoleId, number>()
  const walk = (id: RoleId): boolean => {
    if (mark.get(id) === GREY) return true
    if (mark.get(id) === BLACK) return false
    mark.set(id, GREY)
    const hit = (up.get(id) || []).some(walk)
    mark.set(id, BLACK)
    return hit
  }
  d.roles.forEach(r => {
    if (mark.get(r.id) === undefined && walk(r.id)) {
      err('reporting_cycle', `"${r.title}" is part of a reports_to cycle.`, r.id)
    }
  })

  d.unresolvedRefs.forEach(name => {
    warn('unresolved_team_lead', `"${name}" is referenced as a team lead but matches no Person.`, name)
  })

  return issues
}

/* --------------------------------- lookups ------------------------------------ */

export const personOf = (d: OrgData, r: Role) => (r.personId ? d.people.find(p => p.id === r.personId) : undefined)
export const rolesOfPerson = (d: OrgData, id: PersonId) => d.roles.filter(r => r.personId === id)
export const unitOf = (d: OrgData, r: Role) => d.units.find(u => u.id === r.unitId)

/** Display label for a role card: the person's name, or the title when the role is open. */
export const roleLabel = (d: OrgData, r: Role) => personOf(d, r)?.displayName || r.title

let counter = 0
export const oid = (prefix: string) => `${prefix}_${Date.now().toString(36)}${(counter++).toString(36)}${Math.random().toString(36).slice(2, 6)}`
