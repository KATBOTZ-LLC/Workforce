'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import Sidebar from '@/app/layout/Sidebar'
import { useQueryParam } from '@/app/lib/useQueryParam'
import {
  useWorkforce, Worker, fmtDateTime,
} from '@/app/lib/workforceStore'
import { useOrg } from '@/app/lib/orgStore'
import {
  Edge, EDGE_TYPES, EDGE_TYPE_LABEL, EdgeType, Level, LEVELS, LEVEL_LABEL, OrgData, Person, PersonId, Role, RoleId, Unit, UnitId,
  personOf, reportsToCycleIfAdded,
} from '@/app/lib/orgModel'
import { ROOT_UNIT } from '@/app/lib/orgSource'

export const dynamic = 'force-dynamic'

/* ---------- role / seniority classification ---------- */
type Band = 'Lead' | 'Senior' | 'Mid' | 'Junior' | 'Consultant' | 'Intern'

const BAND_META: Record<Band, { color: string; bg: string }> = {
  Lead: { color: '#162660', bg: '#E8EEFB' },
  Senior: { color: '#0F7A46', bg: '#E8F6EF' },
  Mid: { color: '#334155', bg: '#EEF2F7' },
  Junior: { color: '#64748B', bg: '#F1F5F9' },
  Consultant: { color: '#B45309', bg: '#FEF3E2' },
  Intern: { color: '#800020', bg: '#F7E7EA' },
}

function bandOf(w: Worker): Band {
  const d = w.designation.toLowerCase()
  if (w.type.includes('Intern') || d.includes('intern')) return 'Intern'
  if (w.type.includes('Contractor') || d.includes('contractor') || d.includes('consultant')) return 'Consultant'
  if (d.includes('head') || d.includes('lead') || d.includes('manager') || d.includes('director')) return 'Lead'
  if (d.includes('senior') || d.includes('sr.') || d.includes('principal') || d.includes('staff')) return 'Senior'
  if (d.includes('junior') || d.includes('jr.') || d.includes('associate') || d.includes('trainee')) return 'Junior'
  return 'Mid'
}

// Rank for choosing a department lead (higher = more senior).
const BAND_RANK: Record<Band, number> = { Lead: 6, Senior: 5, Consultant: 4, Mid: 3, Junior: 2, Intern: 1 }

function initials(name: string) { return name.split(' ').map(n => n[0]).slice(0, 2).join('') }

const DEPT_COLORS: Record<string, string> = {
  Engineering: '#162660', Sales: '#0F7A46', 'Social Media': '#B45309',
  HR: '#5B77C4', Finance: '#334155', "CEO's Office": '#800020',
}
const deptColor = (d: string) => DEPT_COLORS[d] || '#64748B'

export default function OrganizationPage() {
  const role = useQueryParam('role')
  if (role === 'employee') return <OrgAccessRestricted />
  return <OrganizationAdminPage />
}

function OrgAccessRestricted() {
  return (
    <>
      <Sidebar />
      <div className="min-h-screen bg-brand-off-white with-sidebar flex items-center justify-center px-8">
        <div className="bg-white rounded-2xl border border-brand-gray p-10 max-w-md text-center">
          <h1 className="text-lg font-bold text-brand-charcoal mb-2">Organization is admin-only</h1>
          <p className="text-sm text-brand-slate-gray">This page and its editing tools are limited to HR/Admin accounts.</p>
          <Link href="/dashboard?role=employee" className="inline-block mt-4 text-sm font-semibold text-brand-royal-blue hover:underline">← Back to Dashboard</Link>
        </div>
      </div>
    </>
  )
}

function OrganizationAdminPage() {
  const { workers, orgUnits } = useWorkforce()
  const active = useMemo(() => workers.filter(w => w.status === 'active'), [workers])
  const [tab, setTab] = useState<'chart' | 'departments' | 'projects' | 'structure' | 'audit'>('chart')

  // Every figure below is derived from the canonical org data — nothing hardcoded.
  const org = useOrg()
  const { counts } = org

  // Departments & People reads the same canonical org data as the Org Chart — same
  // people, same departments, same roles — so the two views can never disagree. It
  // previously grouped the separate onboarding-workforce list by its own department
  // field (Engineering/Sales/Social Media/...), which showed different names entirely.
  const orgDeptGroups = useMemo(() => {
    const depts = org.units.filter(u => u.id !== ROOT_UNIT)
    // Every department is kept, including ones with no roles yet (e.g. Procurement) —
    // this is meant to be the complete company structure, not just the populated part.
    const groups = [
      { id: ROOT_UNIT, name: 'Executive (KATBOTZ)', roles: org.roles.filter(r => r.unitId === ROOT_UNIT) },
      ...depts.map(u => ({ id: u.id, name: u.name, roles: org.roles.filter(r => r.unitId === u.id) })),
    ]
    return groups.map(g => {
      const sorted = [...g.roles].sort((a, b) => a.level - b.level || a.title.localeCompare(b.title))
      const lead = sorted.find(r => r.personId !== null)
      return { ...g, roles: sorted, lead }
    })
  }, [org])

  // Collect client projects across everyone (deduped by project name).
  const projects = useMemo(() => {
    const map = new Map<string, { name: string; lead: string; status: string; people: Worker[] }>()
    active.forEach(w => w.projects.forEach(p => {
      const cur = map.get(p.name) || { name: p.name, lead: p.lead, status: p.status, people: [] }
      cur.people.push(w)
      if (p.lead) cur.lead = p.lead
      map.set(p.name, cur)
    }))
    return Array.from(map.values()).sort((a, b) => b.people.length - a.people.length)
  }, [active])

  // Search across the Departments & People list. While searching, a department stays
  // visible only if it has a matching role; with no search, every department shows
  // (including empty ones) so the list stays the complete company structure.
  const [peopleQuery, setPeopleQuery] = useState('')
  const searchedOrgGroups = useMemo(() => {
    const term = peopleQuery.trim().toLowerCase()
    return orgDeptGroups
      .map(g => ({
        ...g,
        total: g.roles.length,
        roles: term
          ? g.roles.filter(r => `${personOf(org, r)?.displayName || ''} ${r.title}`.toLowerCase().includes(term))
          : g.roles,
      }))
      .filter(g => !term || g.roles.length > 0)
  }, [orgDeptGroups, peopleQuery, org])
  const matchedOrgRoles = searchedOrgGroups.reduce((n, g) => n + g.roles.length, 0)

  return (
    <>
      <Sidebar />
      <div className="min-h-screen bg-brand-off-white with-sidebar">
        <header className="bg-white border-b border-brand-gray sticky top-0 z-10">
          <div className="px-8 py-5">
            <Link href="/dashboard?role=admin" className="text-brand-slate-gray hover:text-brand-royal-blue text-sm">← Dashboard</Link>
            <h1 className="text-2xl font-bold text-brand-charcoal mt-1">Organization</h1>
          </div>
        </header>

        <main className="px-8 py-7 max-w-6xl mx-auto">
          {org.apiError && (
            <div className="mb-6 text-sm text-brand-burgundy bg-[#F7E7EA] border border-brand-burgundy/30 rounded-xl px-4 py-3">
              {org.apiError}
            </div>
          )}
          {/* summary strip */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <Stat label="People" value={counts.people} />
            <Stat label="Roles" value={counts.roles} />
            <Stat label="Departments" value={counts.units - 1} />
            <Stat label="Open roles" value={counts.openRoles} />
            <Stat label="Relationships" value={counts.relationships} />
          </div>

          {/* tabs */}
          <div className="flex items-center gap-1.5 bg-brand-off-white p-1 rounded-full w-fit mb-6 border border-brand-gray">
            {(['chart', 'departments', 'projects', 'structure', 'audit'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold capitalize transition ${tab === t ? 'bg-brand-royal-blue text-white shadow' : 'text-brand-slate-gray hover:text-brand-charcoal'}`}>
                {t === 'chart' ? 'Org Chart' : t === 'departments' ? 'Departments & People' : t === 'projects' ? 'Client Projects' : t === 'structure' ? 'Edit Structure' : 'Audit Log'}
              </button>
            ))}
          </div>

          {/* legend (Client Projects still groups the onboarding workforce by seniority band) */}
          {tab === 'projects' && (
            <div className="flex flex-wrap gap-2 mb-5">
              {(Object.keys(BAND_META) as Band[]).map(b => (
                <span key={b} className="text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{ color: BAND_META[b].color, background: BAND_META[b].bg }}>{b}</span>
              ))}
            </div>
          )}

          {tab === 'structure' ? (
            <StructureEditor />
          ) : tab === 'audit' ? (
            <AuditLog />
          ) : tab === 'chart' ? (
            <OrgChart />
          ) : tab === 'departments' ? (
            <div className="space-y-5">
              <div className="flex items-center gap-3 flex-wrap">
                <input type="search" value={peopleQuery} onChange={e => setPeopleQuery(e.target.value)}
                  placeholder="Search people by name or role title…"
                  aria-label="Search people"
                  className="text-sm w-full sm:max-w-md" />
                <span className="text-xs text-brand-slate-gray">
                  {matchedOrgRoles} {matchedOrgRoles === 1 ? 'role' : 'roles'}
                  {peopleQuery.trim() && ` matching “${peopleQuery.trim()}”`}
                </span>
              </div>

              {matchedOrgRoles === 0 && (
                <div className="bg-white rounded-2xl border border-brand-gray p-10 text-center">
                  <p className="text-sm text-brand-charcoal font-medium">No one matches that search.</p>
                  <button onClick={() => setPeopleQuery('')} className="mt-2 text-sm text-brand-royal-blue hover:underline">Clear search</button>
                </div>
              )}

              {searchedOrgGroups.map(({ id, name, roles, lead, total }) => {
                const grouped = groupRolesByLevel(roles)
                const leadPerson = lead && personOf(org, lead)
                return (
                  <div key={id} className="bg-white rounded-2xl border border-brand-gray overflow-hidden">
                    <div className="px-6 py-4 border-b border-brand-gray flex items-center justify-between gap-3 flex-wrap">
                      <div>
                        <h2 className="text-lg font-bold text-brand-charcoal">{name}</h2>
                        <p className="text-sm text-brand-slate-gray">
                          {roles.length < total
                            ? `${roles.length} of ${total} roles`
                            : `${total} ${total === 1 ? 'role' : 'roles'}`}
                        </p>
                      </div>
                      {lead && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-brand-slate-gray">Led by</span>
                          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-off-white">
                            <div className="w-7 h-7 rounded-full bg-brand-royal-blue text-white flex items-center justify-center text-[11px] font-bold">
                              {leadPerson ? initials(leadPerson.displayName) : '—'}
                            </div>
                            <div className="leading-tight">
                              <p className="text-sm font-semibold text-brand-charcoal">{leadPerson?.displayName || lead.title}</p>
                              <p className="text-[11px] text-brand-slate-gray">{lead.title}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="p-6 space-y-4">
                      {roles.length === 0 ? (
                        <p className="text-sm text-brand-slate-gray">No roles in this department yet.</p>
                      ) : LEVELS.filter(l => grouped[l]?.length).map(l => (
                        <div key={l}>
                          <p className="text-[11px] font-semibold uppercase tracking-wide mb-2 text-brand-slate-gray">{LEVEL_LABEL[l]} · {grouped[l]!.length}</p>
                          <div className="flex flex-wrap gap-2">
                            {grouped[l]!.map(r => <OrgRoleChip key={r.id} org={org} role={r} isLead={r.id === lead?.id} />)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {projects.length === 0 && (
                <div className="md:col-span-2 bg-white rounded-2xl border border-brand-gray p-10 text-center text-brand-slate-gray">No client projects assigned yet.</div>
              )}
              {projects.map(p => (
                <div key={p.name} className="bg-white rounded-2xl border border-brand-gray p-6">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="text-base font-bold text-brand-charcoal">{p.name}</h2>
                    <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-brand-off-white text-brand-charcoal capitalize flex-shrink-0">{p.status.replace('_', ' ')}</span>
                  </div>
                  <p className="text-sm text-brand-slate-gray mt-1">Lead: <span className="font-medium text-brand-charcoal">{p.lead || '—'}</span></p>
                  <div className="mt-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-slate-gray mb-2">Team · {p.people.length}</p>
                    <div className="flex flex-wrap gap-2">
                      {p.people.map(m => <PersonChip key={m.id} w={m} isLead={m.name === p.lead} />)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </>
  )
}

function groupByBand(members: Worker[]): Record<Band, Worker[]> {
  const out = {} as Record<Band, Worker[]>
  members.forEach(m => {
    const b = bandOf(m)
    ;(out[b] ||= []).push(m)
  })
  return out
}

function groupRolesByLevel(roles: Role[]): Partial<Record<Level, Role[]>> {
  const out: Partial<Record<Level, Role[]>> = {}
  roles.forEach(r => { (out[r.level] ||= []).push(r) })
  return out
}

function OrgRoleChip({ org, role, isLead }: { org: OrgData; role: Role; isLead?: boolean }) {
  const person = personOf(org, role)
  const name = person?.displayName || role.title
  return (
    <div className={`flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-full border bg-white ${role.isOpen ? 'border-dashed border-brand-slate-gray/60' : 'border-brand-gray'}`}>
      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 ${role.isOpen ? 'border-2 border-dashed border-brand-slate-gray text-brand-slate-gray' : 'bg-brand-royal-blue text-white'}`}>
        {role.isOpen ? '—' : initials(name)}
      </div>
      <div className="leading-tight">
        <p className="text-sm font-medium text-brand-charcoal flex items-center gap-1">{name}{isLead && <span className="text-[10px]">★</span>}</p>
        <p className="text-[11px] text-brand-slate-gray">{role.isOpen ? 'Open role' : role.title}</p>
      </div>
    </div>
  )
}

/* ---------- org chart: relationship graph ---------- */

/* ---------------------------------------------------------------------------------
 * Org chart — rendered from the canonical model only.
 *
 *   Department  → the column a card sits in
 *   Level       → the row band a card sits in
 *   Edge        → the ONLY thing that draws a connector
 *
 * Level and department are presentation. They never imply a relationship between two
 * PEOPLE. If an Edge does not exist, no person-to-person line is drawn.
 *
 * Two kinds of connector exist, and both come from real stored fields:
 *   'structure' — the unit tree, read from Unit.parentId and Role.unitId. This is what
 *                 puts KATBOTZ at the root with arrows down to each department and to
 *                 each role filed directly on the company.
 *   Edge.type   — an explicit person/role relationship authored in Edit Structure.
 *
 * Nothing is inferred from a card's position, its level, or its neighbours.
 * -------------------------------------------------------------------------------*/

type EdgeKind = 'structure' | 'derived' | 'reports_to' | 'accountable_to' | 'dotted'

type GNode = {
  id: string            // == Role.id, or `unit-<id>` for a department chip
  layer: number
  kind: 'unit' | 'role'
  name: string
  title: string
  color: string
  slot: number
  isOpen?: boolean
  level?: Level
}
type GEdge = { id: string; from: string; to: string; kind: EdgeKind; color: string }
type Graph = { nodes: GNode[]; edges: GEdge[]; byNode: Map<string, GNode> }

type ChartColumn = { unitId: string; name: string; color: string; rows: GNode[][] }
type ChartModel = { exec: GNode[]; columns: ChartColumn[]; graph: Graph; levelsUsed: Level[] }

const UNIT_PALETTE = ['#162660', '#0F7A46', '#334155', '#B45309', '#800020', '#5B77C4',
  '#0E7490', '#7C3AED', '#BE185D', '#047857', '#B91C1C', '#4338CA']
const EDGE_COLOR: Record<EdgeKind, string> = {
  structure: '#94A3B8', derived: '#64748B', reports_to: '#334155',
  accountable_to: '#0F7A46', dotted: '#94A3B8',
}

const ROOT_NODE = 'org-root'
/** Layer 0 = KATBOTZ root, 1 = executive band, 2 = department chips, 3+level = role rows. */
const ROOT_LAYER = 0, EXEC_LAYER = 1, UNIT_LAYER = 2
const layerForLevel = (l: Level) => 3 + l

function buildChart(org: OrgData): ChartModel {
  const nodes: GNode[] = []
  const edges: GEdge[] = []

  const root = org.units.find(u => u.id === ROOT_UNIT) || org.units.find(u => u.parentId === null)
  const depts = org.units.filter(u => u.id !== root?.id)

  // the company root itself is a node, so the tree has one unambiguous top
  if (root) {
    nodes.push({ id: ROOT_NODE, layer: ROOT_LAYER, kind: 'unit', name: root.name, title: '', color: '#162660', slot: 0 })
  }

  // executive band — roles that sit on the company root rather than in a department
  const execRoles = org.roles
    .filter(r => r.unitId === root?.id)
    .sort((a, b) => a.level - b.level || a.title.localeCompare(b.title))
  const exec = execRoles.map((r, i) => {
    const n: GNode = {
      id: r.id, layer: EXEC_LAYER, kind: 'role', color: '#162660', slot: i, level: r.level,
      ...cardText(org, r), isOpen: r.personId === null,
    }
    nodes.push(n)
    // Role.unitId === the company root, so this role hangs off KATBOTZ. Real stored data.
    if (root) edges.push({ id: `struct-${ROOT_NODE}-${r.id}`, from: ROOT_NODE, to: r.id, kind: 'structure', color: EDGE_COLOR.structure })
    return n
  })

  // which level bands are actually in use inside departments — empty bands are skipped
  const deptRoles = org.roles.filter(r => r.unitId !== root?.id)
  const levelsUsed = LEVELS.filter(l => deptRoles.some(r => r.level === l))

  const columns: ChartColumn[] = depts.map((u, ui) => {
    const color = UNIT_PALETTE[ui % UNIT_PALETTE.length]
    nodes.push({ id: `unit-${u.id}`, layer: UNIT_LAYER, kind: 'unit', name: u.name, title: '', color, slot: ui })
    // Unit.parentId — the department sits under the company. Real stored data, not inferred.
    if (u.parentId && (u.parentId === root?.id)) {
      edges.push({ id: `struct-${ROOT_NODE}-${u.id}`, from: ROOT_NODE, to: `unit-${u.id}`, kind: 'structure', color: EDGE_COLOR.structure })
    } else if (u.parentId && depts.some(d => d.id === u.parentId)) {
      edges.push({ id: `struct-${u.parentId}-${u.id}`, from: `unit-${u.parentId}`, to: `unit-${u.id}`, kind: 'structure', color: EDGE_COLOR.structure })
    }
    const rows = levelsUsed.map(l =>
      org.roles
        .filter(r => r.unitId === u.id && r.level === l)
        .sort((a, b) => a.title.localeCompare(b.title))
        .map((r, i) => {
          const n: GNode = {
            id: r.id, layer: layerForLevel(l), kind: 'role', color, slot: i, level: l,
            ...cardText(org, r), isOpen: r.personId === null,
          }
          nodes.push(n)
          return n
        }),
    )
    return { unitId: u.id, name: u.name, color, rows }
  })

  // Authored person/role relationships. `from` is the subordinate and `to` is the
  // manager, so the line is drawn manager → subordinate with the arrowhead at the
  // subordinate — parent above, child below.
  const known = new Set(nodes.map(n => n.id))
  org.edges.forEach(e => {
    if (!known.has(e.fromRoleId) || !known.has(e.toRoleId)) return
    edges.push({ id: e.id, from: e.toRoleId, to: e.fromRoleId, kind: e.type, color: EDGE_COLOR[e.type] })
  })

  // ---- derived department hierarchy -------------------------------------------
  // The HR matrix records department and level but never states who reports to whom.
  // Reading the matrix the way it is laid out, a role reports into the nearest level
  // ABOVE it inside its own department.
  //
  // Where that band holds several roles the matrix genuinely does not say which one is
  // the manager, so rather than picking one we keep walking up to the first band that
  // holds exactly one role. If no such band exists the role stays unconnected — an
  // unknown manager is still never invented.
  //
  // An authored Edge always wins: a role that already has a parent is skipped entirely.
  const authoredChildren = new Set(org.edges.map(e => e.fromRoleId))
  columns.forEach(c => c.rows.forEach((row, li) => row.forEach(child => {
    if (authoredChildren.has(child.id)) return
    for (let k = li - 1; k >= 0; k--) {
      const band = c.rows[k]
      if (!band.length) continue          // empty level band — keep looking upward
      if (band.length > 1) continue       // ambiguous band — the matrix names no single lead
      edges.push({
        id: `derived-${band[0].id}-${child.id}`,
        from: band[0].id, to: child.id, kind: 'derived', color: EDGE_COLOR.derived,
      })
      break
    }
  })))

  return { exec, columns, graph: { nodes, edges, byNode: new Map(nodes.map(n => [n.id, n])) }, levelsUsed }
}

/** Filled role → person's name over the job title. Open role → the title over "Open role". */
function cardText(org: OrgData, r: Role): { name: string; title: string } {
  if (!r.personId) return { name: r.title, title: 'Open role' }
  const p = org.people.find(x => x.id === r.personId)
  return p ? { name: p.displayName, title: r.title } : { name: '⚠ missing person', title: r.title }
}

/* ---------------------------------------------------------------------------------
 * Geometry. Every connector is routed from measured card rectangles — there are no
 * hardcoded coordinates, and nothing depends on array order or screen size.
 * -------------------------------------------------------------------------------*/

type Rect = { x: number; y: number; w: number; h: number; cx: number; top: number; bottom: number }

const ARROW_GAP = 4  // stop the arrowhead just short of the target card
const CORNER = 7     // elbow radius

/** Orthogonal polyline with rounded corners. Collinear/duplicate points are dropped. */
function orthPath(raw: { x: number; y: number }[], r = CORNER): string {
  const p = raw.filter((pt, i) => i === 0 || Math.abs(pt.x - raw[i - 1].x) > 0.5 || Math.abs(pt.y - raw[i - 1].y) > 0.5)
  if (p.length < 2) return ''
  let d = `M ${p[0].x.toFixed(1)} ${p[0].y.toFixed(1)}`
  for (let i = 1; i < p.length - 1; i++) {
    const c = p[i], a = p[i - 1], b = p[i + 1]
    const la = Math.hypot(c.x - a.x, c.y - a.y), lb = Math.hypot(b.x - c.x, b.y - c.y)
    if (!la || !lb) continue
    const rr = Math.min(r, la / 2, lb / 2)
    const ax = c.x + ((a.x - c.x) / la) * rr, ay = c.y + ((a.y - c.y) / la) * rr
    const bx = c.x + ((b.x - c.x) / lb) * rr, by = c.y + ((b.y - c.y) / lb) * rr
    d += ` L ${ax.toFixed(1)} ${ay.toFixed(1)} Q ${c.x.toFixed(1)} ${c.y.toFixed(1)} ${bx.toFixed(1)} ${by.toFixed(1)}`
  }
  const last = p[p.length - 1]
  return `${d} L ${last.x.toFixed(1)} ${last.y.toFixed(1)}`
}

type Routed = { edge: GEdge; d: string; sx: number; sy: number; tx: number; ty: number }

/**
 * Routes every edge whose endpoints have been measured.
 *
 * Vertical space between two rows is a "corridor"; each corridor is divided into lanes
 * so edges that share it never sit on top of each other. Edges leaving the same card
 * share a lane (that is the usual bracket shape), and edges arriving at the same card
 * fan across its top edge so each relationship stays individually traceable.
 */
function routeEdges(graph: Graph, rects: Map<string, Rect>): Routed[] {
  const live = graph.edges.filter(e => rects.has(e.from) && rects.has(e.to))
  if (!live.length) return []

  // row extents per layer, measured
  const layer = new Map<number, { top: number; bot: number }>()
  graph.nodes.forEach(n => {
    const r = rects.get(n.id); if (!r) return
    const b = layer.get(n.layer) || { top: Infinity, bot: -Infinity }
    layer.set(n.layer, { top: Math.min(b.top, r.top), bot: Math.max(b.bot, r.bottom) })
  })
  // A corridor is the measured gap an edge crosses. Keying it by the actual pair of
  // layers means an edge that skips a level (a department with no Level 1, say) still
  // gets a corridor spanning the real gap rather than an assumed one.
  const corridor = (key: string) => {
    const [a, b] = key.split('|').map(Number)
    const B = layer.get(b)
    if (!B) return null
    // When an edge skips a band (KATBOTZ → departments passes the executive row), start
    // the corridor below the LAST band above the target. That keeps the horizontal run
    // out of the cards it would otherwise cross.
    let A = layer.get(a)
    for (let k = b - 1; k > a; k--) {
      const mid = layer.get(k)
      if (mid) { A = mid; break }
    }
    return A && B.top > A.bot ? { top: A.bot, bot: B.top } : null
  }

  // Which corridor an edge crosses, and which lane inside it. Edges leaving the same
  // slot share a lane — that is the usual bracket — while different slots are kept apart.
  const laneOf = (e: GEdge): { corridor: string; key: string } => {
    const f = graph.byNode.get(e.from)!, t = graph.byNode.get(e.to)!
    // an edge may point at a card that sits higher up the chart (a lead reporting to
    // someone in a lower band); route it through the corridor above the source instead
    const upward = t.layer <= f.layer
    const corridor = upward ? `${Math.max(0, f.layer - 1)}|${f.layer}` : `${f.layer}|${t.layer}`
    return { corridor, key: `s:${e.from}` }
  }

  const lanes = new Map<string, string[]>()
  live.forEach(e => {
    const { corridor: c, key } = laneOf(e)
    const arr = lanes.get(c) || []
    if (!arr.includes(key)) arr.push(key)
    lanes.set(c, arr)
  })
  lanes.forEach(keys => keys.sort())

  const laneY = (c: string, key: string) => {
    const box = corridor(c); if (!box) return 0
    const keys = lanes.get(c) || []
    const i = Math.max(0, keys.indexOf(key))
    return box.top + ((i + 1) * (box.bot - box.top)) / (keys.length + 1)
  }

  // fan incoming edges across the target's top edge, ordered by source position
  const incoming = new Map<string, GEdge[]>()
  live.forEach(e => {
    const arr = incoming.get(e.to)
    if (arr) arr.push(e); else incoming.set(e.to, [e])
  })
  incoming.forEach(arr => arr.sort((a, b) => rects.get(a.from)!.cx - rects.get(b.from)!.cx))

  const attachX = (e: GEdge) => {
    const t = rects.get(e.to)!, arr = incoming.get(e.to)!
    if (arr.length < 2) return t.cx
    const span = t.w * 0.56
    return t.cx - span / 2 + (span * arr.indexOf(e)) / (arr.length - 1)
  }

  // ---- gutter finding, for edges that span more than one band ------------------
  // A card sitting between the two ends would otherwise be crossed by the vertical
  // run. Collect the x-ranges those cards occupy and drop through the nearest gap.
  const blockedSpans = (fromLayer: number, toLayer: number): [number, number][] => {
    const spans: [number, number][] = []
    graph.nodes.forEach(n => {
      if (n.layer <= fromLayer || n.layer >= toLayer) return
      const r = rects.get(n.id)
      if (r) spans.push([r.x - 5, r.x + r.w + 5])
    })
    return spans.sort((a, b) => a[0] - b[0])
  }
  const insideAny = (x: number, spans: [number, number][]) => spans.some(([a, b]) => x > a && x < b)
  /** x nearest to `want` that clears every blocked span. */
  const gutterX = (want: number, spans: [number, number][]) => {
    if (!insideAny(want, spans)) return want
    let best = want, bestD = Infinity
    spans.forEach(([a, b]) => {
      ;[a - 1, b + 1].forEach(cand => {
        if (insideAny(cand, spans)) return
        const d = Math.abs(cand - want)
        if (d < bestD) { bestD = d; best = cand }
      })
    })
    return best
  }

  return live.map(e => {
    const s = rects.get(e.from)!, t = rects.get(e.to)!
    const f = graph.byNode.get(e.from)!, tn = graph.byNode.get(e.to)!
    const { corridor: c, key } = laneOf(e)
    const tx = attachX(e), ty = t.top - ARROW_GAP

    // The lane must sit between THESE two cards. Level bands are only roughly aligned
    // across departments — a taller card in one column makes its band overlap the next
    // one — so the band-derived lane is clamped into the real gap here. Without this a
    // band overlap collapses the lane to 0 and the edge shoots to the top of the canvas.
    const gapLo = Math.min(s.bottom, t.top) + 2
    const gapHi = Math.max(s.bottom, t.top) - 2
    const raw = laneY(c, key)
    const ly = gapHi > gapLo
      ? Math.min(Math.max(raw, gapLo), gapHi)
      : (s.bottom + t.top) / 2
    // leave the bottom of the source normally, the top when the target sits above it
    const sy = t.top <= s.top ? s.top : s.bottom

    const spans = blockedSpans(f.layer, tn.layer)
    let pts = [{ x: s.cx, y: sy }, { x: s.cx, y: ly }, { x: tx, y: ly }, { x: tx, y: ty }]

    if (spans.length) {
      // Step down into the corridor just below the source, cross sideways to a gap,
      // drop past the intervening cards there, then run in to the target's own corridor.
      const between = graph.nodes
        .filter(n => n.layer > f.layer && n.layer < tn.layer)
        .map(n => rects.get(n.id))
        .filter((r): r is Rect => !!r)
      // step down above the highest card we must clear …
      const ceiling = between.length ? Math.min(...between.map(r => r.top)) : t.top
      const lyA = Math.min(Math.max(s.bottom + 2, (s.bottom + ceiling) / 2), ceiling - 2)
      // … and run in to the target only once we are below the lowest of them
      const floor = between.length ? Math.max(...between.map(r => r.bottom)) : s.bottom
      const lyB = Math.min(Math.max(floor + 2, (floor + t.top) / 2), t.top - 2)
      const dx = gutterX(tx, spans)
      pts = [
        { x: s.cx, y: sy }, { x: s.cx, y: lyA },
        { x: dx, y: lyA }, { x: dx, y: lyB },
        { x: tx, y: lyB }, { x: tx, y: ty },
      ]
    }
    return { edge: e, d: orthPath(pts), sx: s.cx, sy, tx, ty }
  })
}

/* ================= chart ================= */

function OrgChart() {
  // Reads the canonical store, so any edit made on the Edit Structure tab re-renders
  // the chart in the same commit — there is no second dataset and no refresh.
  const org = useOrg()
  const model = useMemo(() => buildChart(org), [org])
  const { exec, columns, graph, levelsUsed } = model
  const rootName = graph.byNode.get(ROOT_NODE)?.name || 'KATBOTZ'
  const { counts } = org
  const debug = useQueryParam('debug') === 'org'

  /* ---- zoom + pan ---- */
  const viewportRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const [fit, setFit] = useState(0.6)
  const [zoom, setZoom] = useState(0.6)
  const [pan, setPan] = useState({ x: 40, y: 24 })
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null)

  const recenter = (z: number) => {
    const vp = viewportRef.current, cv = canvasRef.current
    if (!vp || !cv) return
    setPan({
      x: (vp.clientWidth - cv.offsetWidth * z) / 2,
      y: Math.max(16, (vp.clientHeight - cv.offsetHeight * z) / 2),
    })
  }

  /* ---- connector geometry, measured from the DOM ---- */
  const [rects, setRects] = useState<Map<string, Rect>>(new Map())
  const [canvasSize, setCanvasSize] = useState({ w: 0, h: 0 })

  const measure = useCallback(() => {
    const cv = canvasRef.current
    if (!cv) return
    const base = cv.getBoundingClientRect()
    // Read the *rendered* scale rather than trusting the zoom state, so measurements
    // are correct at any zoom level and mid-transition.
    const scale = cv.offsetWidth ? base.width / cv.offsetWidth : 1
    const next = new Map<string, Rect>()
    cv.querySelectorAll<HTMLElement>('[data-node-id]').forEach(el => {
      const r = el.getBoundingClientRect()
      const x = (r.left - base.left) / scale, y = (r.top - base.top) / scale
      const w = r.width / scale, h = r.height / scale
      next.set(el.dataset.nodeId!, { x, y, w, h, cx: x + w / 2, top: y, bottom: y + h })
    })
    setRects(next)
    setCanvasSize({ w: cv.offsetWidth, h: cv.offsetHeight })
  }, [])

  // re-measure on data change and on zoom
  useLayoutEffect(() => { measure() }, [measure, graph, zoom])

  // re-measure when the canvas or any individual card changes size (browser resize,
  // text wrapping, cards added or removed, relationship edits)
  useEffect(() => {
    const cv = canvasRef.current
    if (!cv || typeof ResizeObserver === 'undefined') return
    let frame = 0
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(measure)
    })
    ro.observe(cv)
    cv.querySelectorAll<HTMLElement>('[data-node-id]').forEach(el => ro.observe(el))
    return () => { cancelAnimationFrame(frame); ro.disconnect() }
  }, [measure, graph])

  // webfonts can change card metrics after first paint
  useEffect(() => {
    let alive = true
    document.fonts?.ready.then(() => { if (alive) measure() })
    return () => { alive = false }
  }, [measure])

  useEffect(() => {
    const fitNow = () => {
      const vp = viewportRef.current, cv = canvasRef.current
      if (!vp || !cv) return
      const f = Math.min(1, (vp.clientWidth - 32) / cv.offsetWidth)
      setFit(f)
      const start = Math.min(1, Math.max(f, 0.5))
      setZoom(start); recenter(start)
    }
    const t = setTimeout(fitNow, 60)
    window.addEventListener('resize', fitNow)
    return () => { clearTimeout(t); window.removeEventListener('resize', fitNow) }
  }, [columns.length, levelsUsed.length])

  // zoom about the centre of the viewport so the chart stays where the user is looking
  const zoomBy = (factor: number) => {
    const nz = Math.min(2, Math.max(0.2, zoom * factor))
    if (nz === zoom) return
    const vp = viewportRef.current
    if (vp) {
      const cx = vp.clientWidth / 2, cy = vp.clientHeight / 2
      setPan({ x: cx - ((cx - pan.x) / zoom) * nz, y: cy - ((cy - pan.y) / zoom) * nz })
    }
    setZoom(nz)
  }
  const reset = () => { setZoom(fit); recenter(fit) }

  const onDown = (e: React.MouseEvent) => { drag.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y } }
  useEffect(() => {
    const move = (e: MouseEvent) => {
      if (!drag.current) return
      setPan({ x: drag.current.px + (e.clientX - drag.current.x), y: drag.current.py + (e.clientY - drag.current.y) })
    }
    const up = () => { drag.current = null }
    window.addEventListener('mousemove', move); window.addEventListener('mouseup', up)
    return () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up) }
  }, [])

  /* ---- click a card to trace everything it connects to, both directions ---- */
  const [sel, setSel] = useState<string | null>(null)
  const { liveNodes, liveEdges } = useMemo(() => {
    if (!sel) return { liveNodes: null as Set<string> | null, liveEdges: null as Set<string> | null }
    const reach = (dir: 'up' | 'down') => {
      const seen = new Set<string>()
      const found: string[] = []
      const stack = [sel]
      while (stack.length) {
        const cur = stack.pop()!
        graph.edges.forEach(e => {
          const nxt = dir === 'up' ? (e.to === cur ? e.from : null) : (e.from === cur ? e.to : null)
          if (nxt && !seen.has(nxt)) { seen.add(nxt); found.push(nxt); stack.push(nxt) }
        })
      }
      return found
    }
    const nodes = new Set<string>([sel, ...reach('up'), ...reach('down')])
    return {
      liveNodes: nodes,
      liveEdges: new Set(graph.edges.filter(e => nodes.has(e.from) && nodes.has(e.to)).map(e => e.id)),
    }
  }, [sel, graph])

  const nodeState = (id: string): NodeState =>
    !liveNodes ? 'normal' : liveNodes.has(id) ? (id === sel ? 'active' : 'normal') : 'dim'

  const routed = useMemo(() => routeEdges(graph, rects), [graph, rects])
  const markerColors = useMemo(() => Array.from(new Set(graph.edges.map(e => e.color))), [graph])

  const edgeOpacity = (e: GEdge) =>
    liveEdges ? (liveEdges.has(e.id) ? 1 : 0.06)
      : e.kind === 'structure' ? 0.45 : e.kind === 'dotted' ? 0.55 : e.kind === 'derived' ? 0.75 : 0.85

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-3 text-[11px] text-brand-slate-gray">
        <span className="flex items-center gap-1.5"><span className="inline-block w-4 h-0 border-t-2 border-brand-charcoal" /> Reports to / Accountable to — confirmed relationship</span>
        <span className="flex items-center gap-1.5"><span className="inline-block w-4 h-0 border-t-2 border-dashed" style={{ borderColor: '#64748B' }} /> Inferred from level — not a confirmed relationship</span>
        <span className="flex items-center gap-1.5"><span className="inline-block w-4 h-0 border-t-2" style={{ borderColor: '#94A3B8' }} /> Department structure only</span>
      </div>
      <div ref={viewportRef}
      className="relative w-full rounded-2xl border border-brand-gray bg-[radial-gradient(circle,#E2E8F0_1px,transparent_1px)] [background-size:22px_22px] bg-white overflow-hidden select-none"
      style={{ height: 640, cursor: drag.current ? 'grabbing' : 'grab' }}
      onMouseDown={onDown}
      onClick={() => setSel(null)}>
      <div className="absolute top-3 right-3 z-20 flex flex-col gap-1.5">
        <button onClick={e => { e.stopPropagation(); zoomBy(1.2) }} className="w-9 h-9 rounded-lg bg-white border border-brand-gray shadow-sm text-lg font-bold text-brand-charcoal hover:bg-brand-off-white">+</button>
        <button onClick={e => { e.stopPropagation(); zoomBy(1 / 1.2) }} className="w-9 h-9 rounded-lg bg-white border border-brand-gray shadow-sm text-lg font-bold text-brand-charcoal hover:bg-brand-off-white">−</button>
        <button onClick={e => { e.stopPropagation(); reset() }} title="Fit to screen" className="w-9 h-9 rounded-lg bg-white border border-brand-gray shadow-sm text-[10px] font-semibold text-brand-charcoal hover:bg-brand-off-white">Fit</button>
      </div>
      <div className="absolute bottom-3 left-3 z-20 text-[11px] text-brand-slate-gray bg-white/80 px-2 py-1 rounded-md">
        {sel
          ? 'Showing every connected relationship · click empty space to reset'
          : `${counts.people} people · ${counts.roles} roles · ${counts.openRoles} open · ${counts.relationships} relationship${counts.relationships === 1 ? '' : 's'}`}
      </div>
      {debug && (
        <div className="absolute top-3 left-3 z-20 max-h-[560px] w-72 overflow-y-auto bg-white/95 border border-brand-gray rounded-lg p-2 text-[10px] font-mono leading-tight">
          <p className="font-bold mb-1">{routed.length}/{graph.edges.length} edges routed · {rects.size} nodes measured</p>
          {routed.map(r => (
            <p key={r.edge.id} className="truncate" title={r.edge.id}>
              {r.edge.from} → {r.edge.to} @ ({r.tx.toFixed(0)},{r.ty.toFixed(0)})
            </p>
          ))}
        </div>
      )}

      <div style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: '0 0' }}>
        <div ref={canvasRef} className="relative inline-flex flex-col items-center px-10 pt-4 pb-12" style={{ width: 'max-content' }}>
          {/* connector layer: sits under the cards, so no line can cross a card face */}
          <svg className="absolute inset-0 pointer-events-none z-0" width={canvasSize.w} height={canvasSize.h} style={{ overflow: 'visible' }}>
            <defs>
              {markerColors.map(c => (
                <marker key={c} id={`arw-${c.replace('#', '')}`} markerUnits="userSpaceOnUse"
                  markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto">
                  <path d="M0.5,0.8 L8,4.5 L0.5,8.2 Z" fill={c} />
                </marker>
              ))}
            </defs>
            {routed.map(r => (
              <path key={r.edge.id} d={r.d} fill="none"
                stroke={r.edge.color} strokeOpacity={edgeOpacity(r.edge)}
                strokeWidth={r.edge.kind === 'reports_to' ? 1.7 : r.edge.kind === 'structure' ? 1.3 : 1.5}
                strokeDasharray={r.edge.kind === 'accountable_to' ? '5 4' : r.edge.kind === 'dotted' ? '2 4' : undefined}
                strokeLinecap="round"
                markerEnd={`url(#arw-${r.edge.color.replace('#', '')})`} />
            ))}
            {debug && routed.map(r => (
              <g key={`dbg-${r.edge.id}`}>
                <circle cx={r.sx} cy={r.sy} r={2.5} fill="#16a34a" />
                <circle cx={r.tx} cy={r.ty} r={2.5} fill="#dc2626" />
              </g>
            ))}
          </svg>

          <div className="relative z-10 flex flex-col items-center">
            {/* KATBOTZ — the single root of the tree */}
            <div data-node-id={ROOT_NODE} className="inline-block align-top">
              <button
                onClick={e => { e.stopPropagation(); setSel(ROOT_NODE) }}
                className="block rounded-xl px-7 py-3 text-center shadow-sm transition text-white hover:shadow-md"
                style={{
                  background: '#162660',
                  opacity: nodeState(ROOT_NODE) === 'dim' ? 0.18 : 1,
                  outline: nodeState(ROOT_NODE) === 'active' ? '2px solid #162660' : 'none', outlineOffset: 2,
                }}>
                <p className="text-sm font-bold leading-tight tracking-wide">{rootName}</p>
                <p className="text-[10px] text-white/70 leading-tight">Organization</p>
              </button>
            </div>
            <div style={{ height: 64 }} />

            {/* executive band — roles filed on the company root rather than a department */}
            {exec.length > 0 && (
              <>
                <div className="flex items-start justify-center gap-6">
                  {exec.map(n => (
                    <NodeCard key={n.id} nodeId={n.id} name={n.name} title={n.title} color={n.color}
                      vacant={n.isOpen} state={nodeState(n.id)} debug={debug} onSelect={() => setSel(n.id)} />
                  ))}
                </div>
                <div style={{ height: 70 }} />
              </>
            )}
            <div className="flex items-start gap-10">
              {columns.map(c => (
                <ChartColumn key={c.unitId} col={c} levelsUsed={levelsUsed}
                  nodeState={nodeState} debug={debug} onPick={setSel} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
    </div>
  )
}

function ChartColumn({ col, levelsUsed, nodeState, debug, onPick }: {
  col: ChartColumn; levelsUsed: Level[]
  nodeState: (id: string) => NodeState; debug: boolean; onPick: (id: string) => void
}) {
  const chipId = `unit-${col.unitId}`
  const chipState = nodeState(chipId)
  const filled = col.rows.flat().filter(n => !n.isOpen).length
  const open = col.rows.flat().filter(n => n.isOpen).length

  return (
    <div className="flex flex-col items-center">
      {/* department chip — grouping only; it is never an edge endpoint */}
      <button data-node-id={chipId}
        onClick={e => { e.stopPropagation(); onPick(chipId) }}
        className="w-fit px-5 py-1.5 rounded-full text-white text-xs font-bold shadow-sm whitespace-nowrap transition"
        style={{
          background: col.color,
          opacity: chipState === 'dim' ? 0.18 : 1,
          outline: chipState === 'active' ? `2px solid ${col.color}` : 'none', outlineOffset: 2,
        }}>
        {col.name}
        <span className="ml-1.5 font-medium opacity-70">{filled}{open ? `+${open}` : ''}</span>
      </button>

      {/* one row per level band in use, so bands line up across every department */}
      {levelsUsed.map((lvl, li) => (
        <div key={lvl} className="flex flex-col items-center">
          <div style={{ height: li === 0 ? 70 : 78 }} />
          <div className="flex items-start justify-center gap-3" style={{ minHeight: 1 }}>
            {col.rows[li].map(n => (
              <NodeCard key={n.id} nodeId={n.id} name={n.name} title={n.title}
                color={col.color} vacant={n.isOpen}
                state={nodeState(n.id)} debug={debug} onSelect={() => onPick(n.id)} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

type NodeState = 'normal' | 'active' | 'dim'
function NodeCard({ nodeId, name, title, sub, color, badge, intern, root, vacant, state = 'normal', debug, onSelect }: {
  nodeId: string; name: string; title: string; sub?: string; color: string; badge?: string
  intern?: boolean; root?: boolean; vacant?: boolean
  state?: NodeState; debug?: boolean; onSelect?: () => void
}) {
  // `data-node-id` is on the wrapper: its padding-top reserves the avatar's overhang, so
  // the measured top edge is the true visual top of the node and arrows land on it.
  return (
    <div data-node-id={nodeId} className="inline-block pt-5 align-top">
      <button
        onClick={e => { e.stopPropagation(); onSelect?.() }}
        className={`relative block rounded-xl pt-8 pb-2.5 px-2.5 text-center shadow-sm transition ${root ? 'text-white' : 'bg-white border border-brand-gray text-brand-charcoal'} ${state === 'active' ? 'shadow-lg' : 'hover:shadow-md'}`}
        style={{
          width: root ? 200 : 150,
          ...(root ? { background: color } : {}),
          opacity: state === 'dim' ? 0.18 : 1,
          outline: state === 'active' ? `2px solid ${color}` : 'none',
          outlineOffset: 2,
        }}>
        {!root && <span className="absolute left-0 right-0 top-0 h-1.5 rounded-t-xl" style={{ background: color }} />}
        <div className={`absolute left-1/2 -translate-x-1/2 -top-5 w-11 h-11 rounded-full flex items-center justify-center text-xs font-bold shadow-md ring-4 ring-white ${vacant ? 'border-2 border-dashed' : ''}`}
          style={vacant
            ? { background: '#fff', color, borderColor: color }
            : { background: color, color: '#fff' }}>
          {vacant ? '—' : initials(name)}
        </div>
        {badge && <span className="inline-block mb-1 text-[8px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-emerald-400 text-white">{badge}</span>}
        {intern && !vacant && <span className="inline-block mb-1 text-[8px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-brand-off-white text-brand-slate-gray border border-brand-gray">Intern</span>}
        <p className={`text-[13px] font-bold leading-tight truncate ${vacant ? 'text-brand-slate-gray' : ''}`}>{name}</p>
        <p className={`text-[10px] leading-tight truncate ${root ? 'text-white/80' : 'text-brand-slate-gray'}`}>{title}</p>
        {sub && <p className={`text-[9px] uppercase tracking-widest mt-0.5 truncate ${root ? 'text-white/60' : 'text-brand-slate-gray/70'}`}>{sub}</p>}
        {debug && <p className="text-[7px] text-brand-royal-blue font-mono mt-0.5 truncate">{nodeId}</p>}
      </button>
    </div>
  )
}

/* ================= Admin: structure editor ================= */
/* ================= Edit Structure — writes the canonical org model ================= */

function StructureEditor() {
  const org = useOrg()
  // Unresolved team-lead references live in the workforce store; mirror them into the
  // canonical model so validation reports them instead of silently repointing them.
  const { unresolvedTeamLeadRefs } = useWorkforce()
  const { setUnresolvedRefs } = org
  const currentRefs = org.unresolvedRefs
  useEffect(() => {
    const same = currentRefs.length === unresolvedTeamLeadRefs.length
      && currentRefs.every((r, i) => r === unresolvedTeamLeadRefs[i])
    if (!same) setUnresolvedRefs(unresolvedTeamLeadRefs)
  }, [unresolvedTeamLeadRefs, currentRefs, setUnresolvedRefs])

  const {
    people, units, roles, edges, counts, issues,
    addPerson, updatePerson, deletePerson,
    addRole, updateRole, deleteRole,
    addUnit, renameUnit, deleteUnit,
    addEdge, deleteEdge, resetToSource,
  } = org

  const depts = units.filter(u => u.id !== ROOT_UNIT)
  const unitName = (id: string) => units.find(u => u.id === id)?.name || '—'
  const roleOwner = (r: Role) => (r.personId ? people.find(p => p.id === r.personId)?.displayName : null)
  const roleCaption = (r: Role) => `${roleOwner(r) || 'Open role'} — ${r.title} · ${unitName(r.unitId)} · ${LEVEL_LABEL[r.level]}`

  const [flash, setFlash] = useState('')
  const note = (m: string) => { setFlash(m); window.setTimeout(() => setFlash(f => (f === m ? '' : f)), 2600) }

  const [q, setQ] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [newUnit, setNewUnit] = useState('')

  const errors = issues.filter(i => i.severity === 'error')
  const warnings = issues.filter(i => i.severity === 'warning')

  const shown = people.filter(p => {
    const t = q.trim().toLowerCase()
    if (!t) return true
    const titles = roles.filter(r => r.personId === p.id).map(r => r.title).join(' ')
    return `${p.displayName} ${p.aliases.join(' ')} ${titles}`.toLowerCase().includes(t)
  })
  const openRoles = roles.filter(r => r.personId === null)

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-brand-gray p-5 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-sm font-semibold text-brand-charcoal">This is the organization. The Org Chart draws exactly what is here.</p>
          <p className="text-sm text-brand-slate-gray mt-0.5">
            A person is one record however many roles they hold. Department and level decide where a card
            sits; only a relationship draws a connector.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {flash && <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1.5 whitespace-nowrap">✓ {flash}</span>}
          <button onClick={() => { if (confirm('Discard all edits and reload the HR matrix?')) { resetToSource(); note('Reset to the HR matrix') } }}
            className="text-xs font-medium text-brand-slate-gray hover:text-brand-charcoal underline">Reset to source</button>
        </div>
      </div>

      {/* ---------------- validation ---------------- */}
      <div className={`rounded-2xl border p-5 ${errors.length ? 'bg-[#F7E7EA] border-brand-burgundy/30' : 'bg-white border-brand-gray'}`}>
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-base font-semibold text-brand-charcoal">Validation</h2>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${errors.length ? 'bg-brand-burgundy text-white' : 'bg-emerald-100 text-emerald-800'}`}>
            {errors.length} error{errors.length === 1 ? '' : 's'}
          </span>
          {warnings.length > 0 && <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800">{warnings.length} warning{warnings.length === 1 ? '' : 's'}</span>}
          <span className="text-xs text-brand-slate-gray ml-auto">
            {counts.people} people · {counts.roles} roles · {counts.openRoles} open · {counts.relationships} relationships
          </span>
        </div>
        {issues.length > 0 && (
          <ul className="mt-3 space-y-1">
            {issues.slice(0, 12).map((i, n) => (
              <li key={n} className="text-xs flex gap-2">
                <span className={`font-mono font-semibold ${i.severity === 'error' ? 'text-brand-burgundy' : 'text-amber-700'}`}>{i.code}</span>
                <span className="text-brand-charcoal">{i.message}</span>
              </li>
            ))}
          </ul>
        )}
        {issues.length === 0 && <p className="text-xs text-brand-slate-gray mt-2">No structural problems found.</p>}
      </div>

      {/* ---------------- people & roles ---------------- */}
      <Section title="People & roles" count={people.length}
        subtitle="One record per human. Give someone a second role instead of creating them twice."
        headerExtra={
          <button onClick={e => { e.stopPropagation(); setShowAdd(v => !v) }}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-brand-royal-blue text-brand-royal-blue hover:bg-brand-off-white transition">
            {showAdd ? 'Cancel' : '+ Add person'}
          </button>
        }>
        {showAdd && (
          <AddPersonForm units={depts} onCancel={() => setShowAdd(false)}
            onAdd={async (name, title, unitId, level) => {
              // addPerson must resolve first in API mode — the role needs the
              // server-assigned person id, not a client-generated one.
              const p = await addPerson(name)
              await addRole({ personId: p.id, unitId, level, title, isPrimary: true })
              setShowAdd(false)
              note(`Added ${name}`)
            }} />
        )}

        <input type="search" value={q} onChange={e => setQ(e.target.value)}
          placeholder="Search people by name or role…" aria-label="Search people" className="text-sm w-full sm:max-w-md mb-3" />
        <p className="text-xs text-brand-slate-gray mb-2">Showing {shown.length} of {people.length} people — click a name to edit their roles</p>

        <div className="max-h-[52vh] overflow-y-auto divide-y divide-brand-off-white">
          {shown.map(p => (
            <PersonEditor key={p.id} person={p} roles={roles.filter(r => r.personId === p.id)} depts={depts}
              updatePerson={updatePerson} deletePerson={deletePerson} addRole={addRole} updateRole={updateRole} deleteRole={deleteRole}
              note={note} defaultOpen={shown.length === 1 && q.trim() !== ''} />
          ))}
          {shown.length === 0 && <p className="text-sm text-brand-slate-gray py-8 text-center">Nobody matches that search.</p>}
        </div>
      </Section>

      {/* ---------------- open roles ---------------- */}
      <Section title="Open roles" count={openRoles.length}
        subtitle="Positions with nobody in them. They are roles, not people — they never count toward headcount.">
        <div className="flex flex-wrap gap-2">
          {openRoles.map(r => (
            <span key={r.id} className="inline-flex items-center gap-2 pl-3 pr-1.5 py-1.5 rounded-full border border-dashed border-brand-slate-gray/60 bg-brand-off-white">
              <span className="text-xs text-brand-charcoal">{r.title}</span>
              <span className="text-[10px] text-brand-slate-gray">{unitName(r.unitId)} · {LEVEL_LABEL[r.level]}</span>
              <select value="" aria-label={`Fill ${r.title}`}
                onChange={e => { if (e.target.value) { updateRole(r.id, { personId: e.target.value }); note(`Filled ${r.title}`) } }}
                className="text-[11px] !py-0.5 !w-24">
                <option value="">Fill…</option>
                {people.map(p => <option key={p.id} value={p.id}>{p.displayName}</option>)}
              </select>
              <button onClick={() => { if (confirm(`Remove the open "${r.title}" role?`)) { deleteRole(r.id); note('Open role removed') } }} className="text-[11px] text-brand-slate-gray hover:text-brand-burgundy px-1">×</button>
            </span>
          ))}
          {openRoles.length === 0 && <p className="text-sm text-brand-slate-gray">No open roles.</p>}
        </div>
      </Section>

      {/* ---------------- departments ---------------- */}
      <Section title="Departments" count={depts.length}
        subtitle="Each becomes a column on the chart. Deleting one moves its roles up to KATBOTZ rather than losing them.">
        <div className="flex flex-wrap gap-2 mb-4">
          {depts.map(u => {
            const n = roles.filter(r => r.unitId === u.id).length
            return (
              <span key={u.id} className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 rounded-full border border-brand-gray bg-brand-off-white">
                <input defaultValue={u.name} aria-label={`Rename ${u.name}`}
                  onBlur={e => { const v = e.target.value.trim(); if (v && v !== u.name) { renameUnit(u.id, v); note(`Renamed to “${v}”`) } }}
                  className="text-xs font-medium bg-transparent border-transparent hover:border-brand-gray focus:border-brand-royal-blue !py-0.5 !px-1 !w-32" />
                <span className="text-[11px] text-brand-slate-gray">{n}</span>
                <button onClick={() => { if (confirm(`Delete “${u.name}”? Its ${n} role(s) move to KATBOTZ.`)) { deleteUnit(u.id); note(`Deleted “${u.name}”`) } }}
                  className="text-[11px] text-brand-slate-gray hover:text-brand-burgundy px-1" title="Delete department">×</button>
              </span>
            )
          })}
        </div>
        <form onSubmit={e => { e.preventDefault(); const v = newUnit.trim(); if (!v) return; addUnit(v, ROOT_UNIT); setNewUnit(''); note(`Created “${v}”`) }}
          className="flex items-center gap-2">
          <input value={newUnit} onChange={e => setNewUnit(e.target.value)} placeholder="New department name…" className="text-sm !w-64" />
          <button type="submit" disabled={!newUnit.trim()} className="btn-primary text-sm disabled:opacity-40 disabled:cursor-not-allowed">Add department</button>
        </form>
      </Section>

      {/* ---------------- relationships ---------------- */}
      <Section title="Relationships" count={edges.length}
        subtitle="The only thing that draws a connector. Nothing is inferred from level or department — if a reporting line is unknown, leave it out and the card simply stands alone.">
        <AddEdgeForm roles={roles} edges={edges} caption={roleCaption}
          onAdd={(from, to, type) => { addEdge(from, to, type); note('Relationship added') }} />

        <div className="mt-4 space-y-1.5 max-h-[40vh] overflow-y-auto">
          {edges.length === 0 && (
            <p className="text-sm text-brand-slate-gray py-6 text-center">
              No relationships recorded yet. The HR matrix lists levels and departments but not who reports to whom.
            </p>
          )}
          {edges.map(e => {
            const from = roles.find(r => r.id === e.fromRoleId)
            const to = roles.find(r => r.id === e.toRoleId)
            return (
              <div key={e.id} className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg bg-brand-off-white">
                <span className="font-medium text-brand-charcoal">{from ? roleCaption(from) : '⚠ missing role'}</span>
                <span className="text-brand-slate-gray whitespace-nowrap">— {EDGE_TYPE_LABEL[e.type].toLowerCase()} →</span>
                <span className="font-medium text-brand-charcoal">{to ? roleCaption(to) : '⚠ missing role'}</span>
                <button onClick={() => { if (confirm('Remove this relationship?')) { deleteEdge(e.id); note('Relationship removed') } }}
                  className="ml-auto text-brand-slate-gray hover:text-brand-burgundy px-1">×</button>
              </div>
            )
          })}
        </div>
      </Section>
    </div>
  )
}

/** Collapsed by default so the tab reads as a scannable list of sections, not a wall of
 * forms — expand only the one you came to edit. */
function Section({ title, subtitle, count, headerExtra, defaultOpen = false, children }: {
  title: string; subtitle?: string; count?: number; headerExtra?: React.ReactNode
  defaultOpen?: boolean; children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  // Not a <button> — headerExtra (e.g. "+ Add person") can itself be a button, and
  // nesting <button> inside <button> is invalid HTML that React warns about at
  // hydration. A div with the same keyboard semantics avoids that without losing
  // accessibility.
  return (
    <div className="bg-white rounded-2xl border border-brand-gray overflow-hidden">
      <div role="button" tabIndex={0}
        onClick={() => setOpen(o => !o)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(o => !o) } }}
        className="w-full flex items-start justify-between gap-3 p-6 text-left cursor-pointer">
        <div>
          <h2 className="text-base font-semibold text-brand-charcoal flex items-center gap-2">
            {title}
            {count !== undefined && <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-brand-off-white text-brand-slate-gray">{count}</span>}
          </h2>
          {subtitle && <p className="text-sm text-brand-slate-gray mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {headerExtra}
          <span className={`text-brand-slate-gray transition-transform ${open ? 'rotate-180' : ''}`}>⌄</span>
        </div>
      </div>
      {open && <div className="px-6 pb-6 -mt-1">{children}</div>}
    </div>
  )
}

/** One person, collapsed to a name + role summary until clicked — editing 34 people's
 * roles inline all at once is what made this tab unreadable. */
function PersonEditor({ person: p, roles: mine, depts, updatePerson, deletePerson, addRole, updateRole, deleteRole, note, defaultOpen }: {
  person: Person; roles: Role[]; depts: Unit[]
  updatePerson: (id: PersonId, patch: Partial<Person>) => Promise<void>
  deletePerson: (id: PersonId) => Promise<void>
  addRole: (r: { personId: PersonId | null; unitId: UnitId; level: Level; title: string; isPrimary?: boolean }) => Promise<Role>
  updateRole: (id: RoleId, patch: Partial<Role>) => Promise<void>
  deleteRole: (id: RoleId) => Promise<void>
  note: (m: string) => void
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(!!defaultOpen)
  const summary = mine.length === 0 ? 'No roles' : mine.length === 1 ? mine[0].title : `${mine.length} roles`
  return (
    <div className="py-2">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center gap-2 text-left py-1">
        <span className="text-sm font-semibold text-brand-charcoal">{p.displayName}</span>
        <span className="text-[11px] text-brand-slate-gray">{summary}</span>
        <span className={`ml-auto text-brand-slate-gray text-xs transition-transform ${open ? 'rotate-180' : ''}`}>⌄</span>
      </button>
      {open && (
        <div className="pl-2 pb-1">
          <div className="flex items-center gap-2 flex-wrap mt-1">
            <input defaultValue={p.displayName} aria-label={`Rename ${p.displayName}`}
              onBlur={e => { const v = e.target.value.trim(); if (v && v !== p.displayName) { updatePerson(p.id, { displayName: v }); note(`Renamed to ${v}`) } }}
              className="text-sm font-semibold !py-1 !px-2 !w-52 border-transparent hover:border-brand-gray focus:border-brand-royal-blue bg-transparent" />
            <button onClick={() => { if (confirm(`Delete ${p.displayName}? Their ${mine.length} role(s) and any relationships go too.`)) { deletePerson(p.id); note(`Deleted ${p.displayName}`) } }}
              className="ml-auto text-[11px] text-brand-slate-gray hover:text-brand-burgundy">Delete person</button>
          </div>
          <div className="mt-1.5 space-y-1.5 pl-2">
            {mine.map(r => (
              <div key={r.id} className="grid grid-cols-1 sm:grid-cols-[1.4fr_1fr_0.8fr_auto] gap-1.5 items-center">
                <input defaultValue={r.title} aria-label="Role title"
                  onBlur={e => { const v = e.target.value.trim(); if (v && v !== r.title) { updateRole(r.id, { title: v }); note('Role updated') } }}
                  className="text-xs !py-1" />
                <select value={r.unitId} onChange={e => { updateRole(r.id, { unitId: e.target.value }); note('Moved department') }} className="text-xs !py-1">
                  {depts.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  <option value={ROOT_UNIT}>KATBOTZ (executive)</option>
                </select>
                <select value={r.level} onChange={e => { updateRole(r.id, { level: Number(e.target.value) as Level }); note('Level updated') }} className="text-xs !py-1">
                  {LEVELS.map(l => <option key={l} value={l}>{LEVEL_LABEL[l]}</option>)}
                </select>
                <button onClick={() => { if (confirm(`Remove the "${r.title}" role from ${p.displayName}?`)) { deleteRole(r.id); note('Role removed') } }}
                  className="text-[11px] text-brand-slate-gray hover:text-brand-burgundy px-1" title="Remove role">×</button>
              </div>
            ))}
            <button onClick={() => { addRole({ personId: p.id, unitId: depts[0]?.id || ROOT_UNIT, level: 2, title: 'New role' }); note(`Added a role for ${p.displayName}`) }}
              className="text-[11px] text-brand-royal-blue hover:underline">+ another role</button>
          </div>
        </div>
      )}
    </div>
  )
}

function AddPersonForm({ units, onAdd, onCancel }: {
  units: { id: string; name: string }[]
  onAdd: (name: string, title: string, unitId: string, level: Level) => void
  onCancel: () => void
}) {
  const [name, setName] = useState('')
  const [title, setTitle] = useState('')
  const [unitId, setUnitId] = useState(units[0]?.id || ROOT_UNIT)
  const [level, setLevel] = useState<Level>(2)
  const ready = name.trim() && title.trim()
  return (
    <form onSubmit={e => { e.preventDefault(); if (ready) onAdd(name.trim(), title.trim(), unitId, level) }}
      className="grid gap-2 mb-4 p-4 rounded-xl bg-brand-off-white border border-brand-gray">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <label className="block"><span className="text-xs font-medium text-brand-charcoal">Name</span>
          <input autoFocus value={name} onChange={e => setName(e.target.value)} className="text-sm mt-1" /></label>
        <label className="block"><span className="text-xs font-medium text-brand-charcoal">Role title</span>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Backend Developer" className="text-sm mt-1" /></label>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <label className="block"><span className="text-xs font-medium text-brand-charcoal">Department</span>
          <select value={unitId} onChange={e => setUnitId(e.target.value)} className="text-sm mt-1">
            {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            <option value={ROOT_UNIT}>KATBOTZ (executive)</option>
          </select></label>
        <label className="block"><span className="text-xs font-medium text-brand-charcoal">Level</span>
          <select value={level} onChange={e => setLevel(Number(e.target.value) as Level)} className="text-sm mt-1">
            {LEVELS.map(l => <option key={l} value={l}>{LEVEL_LABEL[l]}</option>)}
          </select></label>
      </div>
      <div className="flex items-center gap-2 mt-1">
        <button type="submit" disabled={!ready} className="btn-primary text-sm disabled:opacity-40 disabled:cursor-not-allowed">Add person</button>
        <button type="button" onClick={onCancel} className="text-sm text-brand-slate-gray hover:text-brand-charcoal px-2">Cancel</button>
        <span className="text-xs text-brand-slate-gray ml-auto">Relationships are added separately, below.</span>
      </div>
    </form>
  )
}

function AddEdgeForm({ roles, edges, caption, onAdd }: {
  roles: Role[]; edges: Edge[]; caption: (r: Role) => string
  onAdd: (fromRoleId: string, toRoleId: string, type: EdgeType) => void
}) {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [type, setType] = useState<EdgeType>('reports_to')
  const [cycleError, setCycleError] = useState('')
  const sorted = [...roles].sort((a, b) => caption(a).localeCompare(caption(b)))
  const ready = from && to && from !== to
  return (
    <form onSubmit={e => {
      e.preventDefault()
      if (!ready) return
      // Checked before dispatch — a reports_to cycle should be refused outright, not
      // just flagged as a validation warning after it's already been committed.
      if (type === 'reports_to' && reportsToCycleIfAdded(edges, from, to)) {
        setCycleError('That would create a reporting cycle — one of these roles already reports (directly or indirectly) to the other.')
        return
      }
      setCycleError('')
      onAdd(from, to, type); setFrom(''); setTo('')
    }}
      className="grid gap-2 p-4 rounded-xl bg-brand-off-white border border-brand-gray">
      {cycleError && <p className="text-xs text-brand-burgundy">{cycleError}</p>}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-2 items-end">
        <label className="block"><span className="text-xs font-medium text-brand-charcoal">This role…</span>
          <select value={from} onChange={e => setFrom(e.target.value)} className="text-xs mt-1">
            <option value="">Choose a role…</option>
            {sorted.map(r => <option key={r.id} value={r.id}>{caption(r)}</option>)}
          </select></label>
        <label className="block"><span className="text-xs font-medium text-brand-charcoal">…</span>
          <select value={type} onChange={e => setType(e.target.value as EdgeType)} className="text-xs mt-1 !w-36">
            {EDGE_TYPES.map(t => <option key={t} value={t}>{EDGE_TYPE_LABEL[t]}</option>)}
          </select></label>
        <label className="block"><span className="text-xs font-medium text-brand-charcoal">…this role</span>
          <select value={to} onChange={e => setTo(e.target.value)} className="text-xs mt-1">
            <option value="">Choose a role…</option>
            {sorted.map(r => <option key={r.id} value={r.id}>{caption(r)}</option>)}
          </select></label>
      </div>
      <button type="submit" disabled={!ready} className="btn-primary text-sm w-fit disabled:opacity-40 disabled:cursor-not-allowed">Add relationship</button>
    </form>
  )
}

/* ================= Admin: audit log ================= */
function AuditLog() {
  // Reads the org store's own audit trail — the structural edits made in Edit Structure
  // (people, roles, departments, relationships, reset-to-source) — not the unrelated
  // workforce store audit log, which tracks a different, legacy org-units system.
  const { auditLog } = useOrg()
  return (
    <div className="bg-white rounded-2xl border border-brand-gray p-6 max-w-3xl">
      <h2 className="text-base font-semibold text-brand-charcoal mb-1">Structural Audit Log</h2>
      <p className="text-sm text-brand-slate-gray mb-5">Every change made in Edit Structure — who, what, before → after, and when.</p>
      {auditLog.length === 0 && <p className="text-sm text-brand-slate-gray py-8 text-center">No structural changes recorded yet. Edit the structure to see entries here.</p>}
      <div className="relative pl-6">
        {auditLog.length > 0 && <span className="absolute left-2 top-1 bottom-1 w-px bg-brand-gray" />}
        {auditLog.map(e => (
          <div key={e.id} className="relative pb-5 last:pb-0">
            <span className="absolute -left-[18px] top-1 w-3 h-3 rounded-full ring-4 ring-white bg-brand-royal-blue" />
            <p className="text-sm text-brand-charcoal">{e.summary}</p>
            <p className="text-xs text-brand-slate-gray mt-0.5">
              {e.actor} · {fmtDateTime(e.createdAt)}
              {(e.before || e.after) && <span className="ml-1">· <span className="line-through">{e.before || '—'}</span> → <span className="font-medium">{e.after || '—'}</span></span>}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white rounded-2xl border border-brand-gray p-4">
      <p className="text-2xl font-bold text-brand-charcoal">{value}</p>
      <p className="text-xs text-brand-slate-gray">{label}</p>
    </div>
  )
}

function PersonChip({ w, isLead }: { w: Worker; isLead?: boolean }) {
  const b = bandOf(w)
  return (
    <Link href={`/employees?role=admin&worker=${w.id}`}
      className="flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-full border border-brand-gray hover:border-brand-royal-blue hover:shadow-sm transition bg-white">
      <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0" style={{ color: BAND_META[b].color, background: BAND_META[b].bg }}>{initials(w.name)}</div>
      <div className="leading-tight">
        <p className="text-sm font-medium text-brand-charcoal flex items-center gap-1">{w.name}{isLead && <span className="text-[10px]">★</span>}</p>
        <p className="text-[11px] text-brand-slate-gray">{w.designation}</p>
      </div>
    </Link>
  )
}
