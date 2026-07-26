'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import Sidebar from '@/app/layout/Sidebar'
import {
  useWorkforce, Worker, OrgUnit, OrgUnitKind, ORG_UNIT_KINDS, OrgRole, ORG_ROLES, ORG_ROLE_META,
  unitChildren, wouldCycle, fmtDateTime,
} from '@/app/lib/workforceStore'

export const dynamic = 'force-dynamic'

const ADMIN_ACTOR = 'HR Manager' // acting admin for audit attribution (demo)

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
  const { workers } = useWorkforce()
  const active = useMemo(() => workers.filter(w => w.status === 'active'), [workers])
  const [tab, setTab] = useState<'chart' | 'departments' | 'projects' | 'structure' | 'audit'>('chart')

  // Group active workers by department.
  const byDept = useMemo(() => {
    const map = new Map<string, Worker[]>()
    active.forEach(w => {
      const d = w.department || 'Unassigned'
      if (!map.has(d)) map.set(d, [])
      map.get(d)!.push(w)
    })
    return Array.from(map.entries())
      .map(([dept, members]) => {
        // Lead = most senior; tie-break by who is named most in others' teamLeads.
        const nameCount = (n: string) => members.filter(m => m.teamLeads.includes(n)).length
        const lead = [...members].sort((a, b) =>
          (BAND_RANK[bandOf(b)] - BAND_RANK[bandOf(a)]) || (nameCount(b.name) - nameCount(a.name))
        )[0]
        return { dept, members, lead }
      })
      .sort((a, b) => b.members.length - a.members.length)
  }, [active])

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

  const totalDepts = byDept.length
  const totalConsultants = active.filter(w => bandOf(w) === 'Consultant').length
  const totalInterns = active.filter(w => bandOf(w) === 'Intern').length

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
          {/* summary strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Stat label="People" value={active.length} />
            <Stat label="Departments" value={totalDepts} />
            <Stat label="Consultants" value={totalConsultants} />
            <Stat label="Interns" value={totalInterns} />
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

          {/* legend (people views only) */}
          {(tab === 'chart' || tab === 'departments') && (
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
            <OrgChart active={active} total={active.length} deptCount={byDept.length} />
          ) : tab === 'departments' ? (
            <div className="space-y-5">
              {byDept.map(({ dept, members, lead }) => {
                const grouped = groupByBand(members)
                return (
                  <div key={dept} className="bg-white rounded-2xl border border-brand-gray overflow-hidden">
                    <div className="px-6 py-4 border-b border-brand-gray flex items-center justify-between gap-3 flex-wrap">
                      <div>
                        <h2 className="text-lg font-bold text-brand-charcoal">{dept}</h2>
                        <p className="text-sm text-brand-slate-gray">{members.length} {members.length === 1 ? 'person' : 'people'}</p>
                      </div>
                      {lead && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-brand-slate-gray">Led by</span>
                          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-off-white">
                            <div className="w-7 h-7 rounded-full bg-brand-royal-blue text-white flex items-center justify-center text-[11px] font-bold">{initials(lead.name)}</div>
                            <div className="leading-tight">
                              <p className="text-sm font-semibold text-brand-charcoal">{lead.name}</p>
                              <p className="text-[11px] text-brand-slate-gray">{lead.designation}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="p-6 space-y-4">
                      {(Object.keys(BAND_META) as Band[]).filter(b => grouped[b]?.length).map(b => (
                        <div key={b}>
                          <p className="text-[11px] font-semibold uppercase tracking-wide mb-2" style={{ color: BAND_META[b].color }}>{b} · {grouped[b].length}</p>
                          <div className="flex flex-wrap gap-2">
                            {grouped[b].map(m => <PersonChip key={m.id} w={m} isLead={m.id === lead?.id} />)}
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

/* ---------- hierarchical org chart ---------- */

/* ---------- 5-department org template (real people topped up with generated) ---------- */
type TLead = { ref?: string; name?: string; title?: string }
type TEmp = { ref?: string; name?: string; title?: string; intern?: boolean; leads: number[] }
type TDept = { dept: string; color: string; leads: TLead[]; emps: TEmp[] }

const ORG_TEMPLATE: TDept[] = [
  { dept: 'Engineering', color: '#162660',
    leads: [{ ref: 'w-mei' }, { name: 'Aarav Shah', title: 'Frontend Lead' }, { name: 'Nina Rao', title: 'Backend Lead' }],
    emps: [
      { ref: 'w-rajesh', leads: [2] }, { ref: 'w-arjun', leads: [1] }, { ref: 'w-isha', leads: [1] },
      { ref: 'w-ananya-i', intern: true, leads: [0, 1] }, { ref: 'w-kabir', intern: true, leads: [0] },
      { name: 'Rohan Iyer', title: 'QA Engineer', leads: [0] },
    ] },
  { dept: 'Marketing & Sales', color: '#0F7A46',
    leads: [{ ref: 'w-neha' }, { ref: 'w-zoya' }, { name: 'Priyanka Roy', title: 'Brand Lead' }],
    emps: [
      { ref: 'w-riya', leads: [0] }, { ref: 'w-aditya', intern: true, leads: [0] },
      { ref: 'w-sara', intern: true, leads: [1, 2] }, { ref: 'w-wei', intern: true, leads: [1] },
      { name: 'Karthik Menon', title: 'SEO Specialist', leads: [2] },
    ] },
  { dept: 'Finance', color: '#334155',
    leads: [{ ref: 'w-karan' }, { name: 'Sonia Kapoor', title: 'Accounts Lead' }, { name: 'Manish Gupta', title: 'Payroll Lead' }],
    emps: [
      { ref: 'w-dev', intern: true, leads: [1] }, { name: 'Ritu Sharma', title: 'Analyst', leads: [0] },
      { name: 'Amit Bose', title: 'Analyst', leads: [1, 2] }, { name: 'Farah Ali', title: 'Auditor', leads: [2] },
      { name: 'Neel Shah', title: 'Associate', leads: [0] },
    ] },
  { dept: 'Contracts', color: '#B45309',
    leads: [{ name: 'Gina Torres', title: 'Contracts Lead' }, { name: 'Sam Okoye', title: 'Vendor Lead' }, { name: 'Lena Fischer', title: 'Compliance Lead' }],
    emps: [
      { ref: 'w-john', leads: [0] }, { ref: 'w-carlos', leads: [1] }, { ref: 'w-diego', leads: [0, 2] },
      { name: 'Omar Haddad', title: 'Contractor', leads: [1] }, { name: 'Yuki Tanaka', title: 'Contractor', leads: [2] },
    ] },
  { dept: "CEO's Office", color: '#800020',
    leads: [{ ref: 'w-ravi' }, { ref: 'w-priya' }, { name: 'Deepa Nair', title: 'Chief of Staff' }],
    emps: [
      { ref: 'w-fatima', leads: [1] }, { ref: 'w-tara', intern: true, leads: [1] },
      { name: 'Arun Verma', title: 'Exec Assistant', leads: [2] }, { name: 'Meera Das', title: 'Ops Associate', leads: [0] },
      { name: 'Leo Park', title: 'Strategy Analyst', leads: [0, 2] },
    ] },
]

type RNode = { name: string; title: string; workerId?: string; intern?: boolean }
type RDept = { dept: string; color: string; leads: RNode[]; emps: (RNode & { leads: number[] })[] }

type Sel = { kind: 'ceo' } | { kind: 'dept'; d: number } | { kind: 'lead'; d: number; l: number } | { kind: 'emp'; d: number; e: number }

function OrgChart({ active, total }: { active: Worker[]; total: number; deptCount: number }) {
  const depts: RDept[] = useMemo(() => {
    const byId = new Map(active.map(w => [w.id, w]))
    const resolveLead = (l: TLead): RNode => {
      const w = l.ref ? byId.get(l.ref) : undefined
      return w ? { name: w.name, title: w.designation, workerId: w.id } : { name: l.name || '—', title: l.title || 'Team Lead' }
    }
    const resolveEmp = (e: TEmp): RNode & { leads: number[] } => {
      const w = e.ref ? byId.get(e.ref) : undefined
      return w
        ? { name: w.name, title: w.designation, workerId: w.id, intern: w.type.includes('Intern'), leads: e.leads }
        : { name: e.name || '—', title: e.title || 'Employee', intern: e.intern, leads: e.leads }
    }
    return ORG_TEMPLATE.map(d => ({ dept: d.dept, color: d.color, leads: d.leads.map(resolveLead), emps: d.emps.map(resolveEmp) }))
  }, [active])

  // ---- click-to-highlight the path CEO → department → team lead(s) → node ----
  const [sel, setSel] = useState<Sel | null>(null)
  // connector opacity given whether it's on the active path
  const conn = (onPath: boolean) => (!sel ? 0.5 : onPath ? 1 : 0.06)
  const ceoState: NodeState = !sel ? 'normal' : 'active'

  // ---- zoom + pan ----
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
      x: (vp.clientWidth - cv.scrollWidth * z) / 2,
      y: Math.max(16, (vp.clientHeight - cv.scrollHeight * z) / 2),
    })
  }
  useEffect(() => {
    const fitNow = () => {
      const vp = viewportRef.current, cv = canvasRef.current
      if (!vp || !cv) return
      const f = Math.min(1, (vp.clientWidth - 32) / cv.scrollWidth)
      setFit(f)
      // start at a readable zoom (not shrunk-to-fit); the Fit button gives the full overview
      const start = Math.min(1, Math.max(f, 0.62))
      setZoom(start); recenter(start)
    }
    const t = setTimeout(fitNow, 60)
    window.addEventListener('resize', fitNow)
    return () => { clearTimeout(t); window.removeEventListener('resize', fitNow) }
  }, [depts.length])

  const zoomBy = (factor: number) => setZoom(z => Math.min(2, Math.max(0.2, z * factor)))
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

  return (
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
        {sel ? 'Showing reporting path · click empty space to reset' : `${total} people · ${depts.length} departments · click a card to trace its path`}
      </div>

      <div style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: '0 0' }}>
        <div ref={canvasRef} className="inline-flex flex-col items-center px-10 pt-4 pb-10" style={{ width: 'max-content' }}>
          {/* CEO / company root */}
          <NodeCard name="Maya Patel" title="Founder & CEO" sub="KATBOTZ" color="#162660" root state={ceoState} onSelect={() => setSel({ kind: 'ceo' })} />
          <span className="border-l-2 border-dotted border-brand-slate-gray" style={{ height: 34, opacity: conn(!!sel && sel.kind !== 'ceo') }} />
          {/* departments row */}
          <div className="relative flex items-start gap-8">
            <span className="absolute top-0 left-[130px] right-[130px] border-t-2 border-dotted border-brand-slate-gray" style={{ opacity: conn(!!sel && sel.kind !== 'ceo') }} />
            {depts.map((d, di) => (
              <div key={d.dept} className="relative flex flex-col items-center pt-0">
                <span className="border-l-2 border-dotted border-brand-slate-gray" style={{ height: 18, opacity: conn(!!sel && sel.kind !== 'ceo' && (sel as { d?: number }).d === di) }} />
                <DeptColumn dept={d} di={di} sel={sel} onPick={setSel} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function DeptColumn({ dept, di, sel, onPick }: { dept: RDept; di: number; sel: Sel | null; onPick: (s: Sel) => void }) {
  const colRef = useRef<HTMLDivElement>(null)
  const leadRefs = useRef<(HTMLDivElement | null)[]>([])
  const empRefs = useRef<Record<number, HTMLDivElement | null>>({})
  const [paths, setPaths] = useState<{ d: string; emp: number; primary: boolean; lead: number }[]>([])
  const [dims, setDims] = useState({ w: 0, h: 0 })

  // Each team lead owns a sub-group: its direct reports (primary lead), employees before interns.
  const reportsOf = (li: number) =>
    dept.emps.map((e, i) => ({ e, i })).filter(x => x.e.leads[0] === li).sort((a, b) => (a.e.intern ? 1 : 0) - (b.e.intern ? 1 : 0))

  useEffect(() => {
    const measure = () => {
      const col = colRef.current
      if (!col) return
      const cx = (el: HTMLElement) => el.offsetLeft + el.offsetWidth / 2
      // shared bus line sits in the gap just below the leads row
      const l0 = leadRefs.current[0]
      const busY = l0 ? l0.offsetTop + l0.offsetHeight + 22 : 0
      const out: { d: string; emp: number; primary: boolean; lead: number }[] = []
      dept.emps.forEach((e, i) => {
        const ee = empRefs.current[i]; if (!ee) return
        const ex = cx(ee), eTop = ee.offsetTop
        e.leads.forEach((li, k) => {
          const le = leadRefs.current[li]; if (!le) return
          const lx = cx(le), lBot = le.offsetTop + le.offsetHeight
          // orthogonal elbow: lead → down to bus → across → down to report
          const d = `M ${lx} ${lBot} L ${lx} ${busY} L ${ex} ${busY} L ${ex} ${eTop}`
          out.push({ d, emp: i, primary: k === 0, lead: li })
        })
      })
      setPaths(out)
      setDims({ w: col.scrollWidth, h: col.scrollHeight })
    }
    const t = setTimeout(measure, 60)
    window.addEventListener('resize', measure)
    return () => { clearTimeout(t); window.removeEventListener('resize', measure) }
  }, [dept])

  // ---- highlight state helpers (this dept's index is `di`) ----
  const here = sel && (sel as { d?: number }).d === di
  const headerState: NodeState = !sel ? 'normal' : here ? 'active' : 'dim'
  const leadState = (li: number): NodeState => {
    if (!sel) return 'normal'
    if (!here) return 'dim'
    if (sel.kind === 'lead') return sel.l === li ? 'active' : 'dim'
    if (sel.kind === 'emp') return dept.emps[sel.e].leads.includes(li) ? 'active' : 'dim'
    return 'dim'
  }
  const empState = (i: number): NodeState => {
    if (!sel) return 'normal'
    if (!here) return 'dim'
    return sel.kind === 'emp' && sel.e === i ? 'active' : 'dim'
  }
  const pathOpacity = (p: { emp: number; primary: boolean; lead: number }) => {
    if (!sel || !here) return sel ? 0.05 : 0.5
    if (sel.kind === 'emp') return sel.e === p.emp ? 0.95 : 0.05
    if (sel.kind === 'lead') return sel.l === p.lead && p.primary ? 0.95 : 0.05
    return 0.05
  }

  return (
    <div ref={colRef} className="relative">
      {/* department header (clickable) */}
      <div className="flex justify-center mb-8">
        <button onClick={e => { e.stopPropagation(); onPick({ kind: 'dept', d: di }) }}
          className="w-fit px-5 py-1.5 rounded-full text-white text-xs font-bold shadow-sm whitespace-nowrap transition"
          style={{ background: dept.color, opacity: headerState === 'dim' ? 0.25 : 1, outline: headerState === 'active' ? `2px solid ${dept.color}` : 'none', outlineOffset: 2 }}>
          {dept.dept}
        </button>
      </div>
      {/* orthogonal bracket connectors (lead → its reports); behind the cards */}
      <svg className="absolute inset-0 pointer-events-none z-0" width={dims.w} height={dims.h} style={{ overflow: 'visible' }}>
        <defs>
          <marker id={`arw-${di}`} markerWidth="7" markerHeight="7" refX="5.5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill={dept.color} />
          </marker>
        </defs>
        {paths.map((p, i) => (
          <path key={i} d={p.d} fill="none" stroke={dept.color} strokeOpacity={pathOpacity(p)} strokeWidth="1.5"
            strokeDasharray={p.primary ? undefined : '4 4'} markerEnd={`url(#arw-${di})`} />
        ))}
      </svg>
      {/* one sub-tree per team lead: lead centered above a row of its reports */}
      <div className="relative z-10 flex justify-center items-start gap-5">
        {dept.leads.map((l, li) => (
          <div key={li} className="flex flex-col items-center">
            <div ref={el => { leadRefs.current[li] = el }}>
              <NodeCard name={l.name} title={l.title} color={dept.color} badge="Team Lead" state={leadState(li)} onSelect={() => onPick({ kind: 'lead', d: di, l: li })} />
            </div>
            <div style={{ height: 46 }} />
            <div className="flex justify-center items-start gap-2.5">
              {reportsOf(li).map(({ e, i }) => (
                <div key={i} ref={el => { empRefs.current[i] = el }}>
                  <NodeCard name={e.name} title={e.title} color={dept.color} intern={e.intern} multi={e.leads.length > 1}
                    state={empState(i)} onSelect={() => onPick({ kind: 'emp', d: di, e: i })} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

type NodeState = 'normal' | 'active' | 'dim'
function NodeCard({ name, title, sub, color, badge, intern, root, multi, state = 'normal', onSelect }: {
  name: string; title: string; sub?: string; color: string; badge?: string; intern?: boolean; root?: boolean; multi?: boolean
  state?: NodeState; onSelect?: () => void
}) {
  return (
    <div className="inline-block pt-5 align-top">
      <button
        onClick={e => { e.stopPropagation(); onSelect?.() }}
        className={`relative block rounded-xl pt-8 pb-2.5 px-2.5 text-center shadow-sm transition ${root ? 'text-white' : 'bg-white border border-brand-gray text-brand-charcoal'} ${state === 'active' ? 'shadow-lg' : 'hover:shadow-md'}`}
        style={{
          width: root ? 200 : 150,
          ...(root ? { background: color } : {}),
          opacity: state === 'dim' ? 0.2 : 1,
          outline: state === 'active' ? `2px solid ${color}` : 'none',
          outlineOffset: 2,
        }}>
        {!root && <span className="absolute left-0 right-0 top-0 h-1.5 rounded-t-xl" style={{ background: color }} />}
        <div className="absolute left-1/2 -translate-x-1/2 -top-5 w-11 h-11 rounded-full flex items-center justify-center text-xs font-bold shadow-md ring-4 ring-white"
          style={{ background: color, color: '#fff' }}>{initials(name)}</div>
        {badge && <span className="inline-block mb-1 text-[8px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-emerald-400 text-white">{badge}</span>}
        {intern && <span className="inline-block mb-1 text-[8px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-brand-off-white text-brand-slate-gray border border-brand-gray">Intern</span>}
        <p className="text-[13px] font-bold leading-tight truncate">{name}</p>
        <p className={`text-[10px] leading-tight truncate ${root ? 'text-white/80' : 'text-brand-slate-gray'}`}>{title}</p>
        {sub && <p className="text-[9px] text-white/60 uppercase tracking-widest mt-0.5">{sub}</p>}
        {multi && <p className="text-[8px] text-brand-slate-gray mt-0.5 whitespace-nowrap">2 team leads</p>}
      </button>
    </div>
  )
}

/* ================= Admin: structure editor ================= */
function StructureEditor() {
  const { workers, orgUnits, addUnit, renameUnit, moveUnit, deleteUnit, setUnitLead, mergeUnits, assignWorkerUnit, setManager, setOrgRole, setDesignation } = useWorkforce()
  const active = workers.filter(w => w.status === 'active')
  const nameOf = (id?: string) => workers.find(w => w.id === id)?.name || '—'

  // new-unit form
  const [nuName, setNuName] = useState('')
  const [nuKind, setNuKind] = useState<OrgUnitKind>('department')
  const [nuParent, setNuParent] = useState<string>('')

  const root = orgUnits.find(u => u.kind === 'company') || null
  useEffect(() => { if (!nuParent && root) setNuParent(root.id) }, [root, nuParent])

  const createUnit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!nuName.trim()) return
    addUnit(nuName.trim(), nuKind, nuParent || null, ADMIN_ACTOR)
    setNuName('')
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-brand-gray p-5">
        <p className="text-sm text-brand-charcoal"><span className="font-semibold">Structure is the source of truth.</span> Only admins edit it here; every change is written to the Audit Log and access permissions re-derive automatically.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* --- unit tree --- */}
        <div className="bg-white rounded-2xl border border-brand-gray p-6">
          <h2 className="text-base font-semibold text-brand-charcoal mb-4">Org Units</h2>
          <form onSubmit={createUnit} className="grid grid-cols-2 gap-2 mb-5 p-3 rounded-xl bg-brand-off-white">
            <input value={nuName} onChange={e => setNuName(e.target.value)} placeholder="New unit name…" className="col-span-2 text-sm" />
            <select value={nuKind} onChange={e => setNuKind(e.target.value as OrgUnitKind)} className="text-sm">
              {ORG_UNIT_KINDS.filter(k => k !== 'company').map(k => <option key={k} value={k}>{k}</option>)}
            </select>
            <select value={nuParent} onChange={e => setNuParent(e.target.value)} className="text-sm">
              {orgUnits.map(u => <option key={u.id} value={u.id}>under {u.name}</option>)}
            </select>
            <button type="submit" className="btn-primary text-sm col-span-2">+ Create Unit</button>
          </form>
          {root ? <UnitBranch unit={root} depth={0} orgUnits={orgUnits} workers={workers}
            onRename={(id, n) => renameUnit(id, n, ADMIN_ACTOR)}
            onMove={(id, p) => moveUnit(id, p, ADMIN_ACTOR)}
            onDelete={id => deleteUnit(id, ADMIN_ACTOR)}
            onLead={(id, lead) => setUnitLead(id, lead, ADMIN_ACTOR)}
            onMerge={(src, tgt) => mergeUnits(src, tgt, ADMIN_ACTOR)}
          /> : <p className="text-sm text-brand-slate-gray">No units yet.</p>}
        </div>

        {/* --- people placement --- */}
        <div className="bg-white rounded-2xl border border-brand-gray p-6">
          <h2 className="text-base font-semibold text-brand-charcoal mb-4">People Placement</h2>
          <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
            {active.map(w => (
              <div key={w.id} className="p-3 rounded-xl border border-brand-gray">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-brand-charcoal truncate">{w.name}</p>
                    <input defaultValue={w.designation} onBlur={e => { if (e.target.value.trim() && e.target.value !== w.designation) setDesignation(w.id, e.target.value.trim(), ADMIN_ACTOR) }}
                      className="text-xs mt-1 !py-1" />
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0" style={{ color: ORG_ROLE_META[w.orgRole || 'employee'].color, background: ORG_ROLE_META[w.orgRole || 'employee'].bg }}>
                    {ORG_ROLE_META[w.orgRole || 'employee'].label}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  <label className="block"><span className="text-[10px] text-brand-slate-gray">Unit</span>
                    <select value={w.unitId || ''} onChange={e => assignWorkerUnit(w.id, e.target.value || undefined, ADMIN_ACTOR)} className="text-xs !py-1">
                      <option value="">Unassigned</option>
                      {orgUnits.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                  </label>
                  <label className="block"><span className="text-[10px] text-brand-slate-gray">Reports to</span>
                    <select value={w.reportsToId || ''} onChange={e => setManager(w.id, e.target.value || undefined, ADMIN_ACTOR)} className="text-xs !py-1">
                      <option value="">— (top)</option>
                      {active.filter(m => m.id !== w.id).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                  </label>
                  <label className="block"><span className="text-[10px] text-brand-slate-gray">Access tier</span>
                    <select value={w.orgRole || 'employee'} onChange={e => setOrgRole(w.id, e.target.value as OrgRole, ADMIN_ACTOR)} className="text-xs !py-1">
                      {ORG_ROLES.map(r => <option key={r} value={r}>{ORG_ROLE_META[r].label}</option>)}
                    </select>
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function UnitBranch({ unit, depth, orgUnits, workers, onRename, onMove, onDelete, onLead, onMerge }: {
  unit: OrgUnit; depth: number; orgUnits: OrgUnit[]; workers: Worker[]
  onRename: (id: string, name: string) => void
  onMove: (id: string, parentId: string | null) => void
  onDelete: (id: string) => void
  onLead: (id: string, leadId: string | undefined) => void
  onMerge: (sourceId: string, targetId: string) => void
}) {
  const children = unitChildren(orgUnits, unit.id)
  const members = workers.filter(w => w.status === 'active' && w.unitId === unit.id)
  const isCompany = unit.kind === 'company'
  return (
    <div style={{ marginLeft: depth * 14 }} className="mb-1.5">
      <div className="flex items-center gap-2 py-1.5 border-b border-brand-off-white group">
        <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-brand-off-white text-brand-slate-gray flex-shrink-0">{unit.kind}</span>
        <input defaultValue={unit.name} disabled={isCompany}
          onBlur={e => { if (e.target.value.trim() && e.target.value !== unit.name) onRename(unit.id, e.target.value.trim()) }}
          className="text-sm font-medium !py-1 !w-36 disabled:bg-transparent disabled:border-transparent" />
        <span className="text-[11px] text-brand-slate-gray flex-shrink-0">{members.length}p</span>
        {!isCompany && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition ml-auto flex-shrink-0">
            <select value={unit.parentId || ''} onChange={e => onMove(unit.id, e.target.value || null)} title="Move under" className="text-[11px] !py-0.5 !w-24">
              {orgUnits.filter(u => u.id !== unit.id && !wouldCycle(orgUnits, unit.id, u.id)).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
            <button onClick={() => { const t = prompt('Merge into which unit id-name? Type the target unit name exactly.'); const tgt = orgUnits.find(u => u.name === t && u.id !== unit.id); if (tgt) onMerge(unit.id, tgt.id) }}
              title="Merge into…" className="text-[11px] text-brand-slate-gray hover:text-brand-royal-blue">Merge</button>
            <button onClick={() => onDelete(unit.id)} title="Delete" className="text-[11px] text-brand-slate-gray hover:text-brand-burgundy">Delete</button>
          </div>
        )}
      </div>
      {/* lead selector */}
      {!isCompany && (
        <div className="flex items-center gap-2 py-1" style={{ marginLeft: 14 }}>
          <span className="text-[11px] text-brand-slate-gray">Lead</span>
          <select value={unit.leadId || ''} onChange={e => onLead(unit.id, e.target.value || undefined)} className="text-[11px] !py-0.5 !w-40">
            <option value="">—</option>
            {workers.filter(w => w.status === 'active').map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </div>
      )}
      {children.map(c => (
        <UnitBranch key={c.id} unit={c} depth={depth + 1} orgUnits={orgUnits} workers={workers}
          onRename={onRename} onMove={onMove} onDelete={onDelete} onLead={onLead} onMerge={onMerge} />
      ))}
    </div>
  )
}

/* ================= Admin: audit log ================= */
function AuditLog() {
  const { auditLog } = useWorkforce()
  return (
    <div className="bg-white rounded-2xl border border-brand-gray p-6 max-w-3xl">
      <h2 className="text-base font-semibold text-brand-charcoal mb-1">Structural Audit Log</h2>
      <p className="text-sm text-brand-slate-gray mb-5">Every change to the organization — who, what, before → after, and when.</p>
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
