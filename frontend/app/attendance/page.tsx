'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Sidebar from '@/app/layout/Sidebar'
import {
  useWorkforce, ATTENDANCE_META, AttendanceStatus, LeaveType, LEAVE_TYPES,
  WorkerType, EmployeeStatus, lastNDays, todayStr,
  hoursForDate, openSession, fmtClock, fmtHours,
  capturePunch, sessionFlags, PLACE_META,
} from '@/app/lib/workforceStore'
import { useQueryParam } from '@/app/lib/useQueryParam'

/* Live-ticking "now" (ms) for elapsed session time; updates every second. */
function useNowMs() {
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => {
    setNow(Date.now())
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  return now
}

export const dynamic = 'force-dynamic'

const STATUSES: AttendanceStatus[] = ['present', 'leave', 'absent']
const TYPES: WorkerType[] = ['Employee', 'Contractor', 'Intern']
const DEPARTMENTS = ['Engineering', 'Product', 'Design', 'Marketing', 'Sales', 'HR', 'Finance']

const PRESETS: { label: string; status: EmployeeStatus; type: WorkerType }[] = [
  { label: 'Active Employees', status: 'active', type: 'Employee' },
  { label: 'Active Interns', status: 'active', type: 'Intern' },
  { label: 'Active Contractors', status: 'active', type: 'Contractor' },
  { label: 'Inactive Employees', status: 'inactive', type: 'Employee' },
  { label: 'Inactive Interns', status: 'inactive', type: 'Intern' },
  { label: 'Inactive Contractors', status: 'inactive', type: 'Contractor' },
]

interface Filters {
  types: WorkerType[]
  departments: string[]
  status: EmployeeStatus | 'all'
}
const EMPTY_FILTERS: Filters = { types: [], departments: [], status: 'all' }

export default function AttendancePage() {
  const role = useQueryParam('role')
  const workerId = useQueryParam('worker')
  if (role === 'employee') return <MyAttendance workerId={workerId} />
  return <TeamAttendance />
}

/* ================= Employee: view-only ================= */
function MyAttendance({ workerId }: { workerId: string | null }) {
  const { workers, clockIn, clockOut } = useWorkforce()
  const [punching, setPunching] = useState(false)
  const me = workerId ? workers.find(w => w.id === workerId) : undefined

  const doClockIn = async () => {
    if (!me) return
    setPunching(true)
    const meta = await capturePunch('self')
    clockIn(me.id, meta)
    setPunching(false)
  }
  const doClockOut = async () => {
    if (!me) return
    setPunching(true)
    const meta = await capturePunch('self')
    clockOut(me.id, meta)
    setPunching(false)
  }
  const today = todayStr()
  const days = lastNDays(14)
  const todayRecord = me?.attendance.find(a => a.date === today)
  const nowMs = useNowMs()

  const open = me ? openSession(me.timeSessions) : undefined
  const todayHours = me ? hoursForDate(me.timeSessions, today, nowMs ?? undefined) : 0
  const todaySessions = me ? me.timeSessions.filter(s => s.date === today) : []

  return (
    <>
      <Sidebar />
      <div className="min-h-screen bg-brand-off-white with-sidebar">
        <header className="bg-white border-b border-brand-gray sticky top-0 z-10">
          <div className="px-8 py-5">
            <Link href={`/dashboard?role=employee&worker=${workerId || ''}`} className="text-brand-slate-gray hover:text-brand-royal-blue text-sm">← Dashboard</Link>
            <h1 className="text-2xl font-bold text-brand-charcoal mt-1">My Attendance</h1>
          </div>
        </header>

        <main className="px-8 py-7">
          {!me && <div className="bg-white rounded-2xl border border-brand-gray p-10 text-center text-brand-slate-gray">No worker signed in.</div>}
          {me && (
            <div className="max-w-2xl space-y-6">
              {/* Time clock */}
              <div className="bg-gradient-to-br from-brand-royal-blue to-[#24377f] text-white rounded-2xl p-6">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <p className="text-white/60 text-xs uppercase tracking-wide font-semibold">Time Clock · {fmtLabel(today)}</p>
                    <p className="text-3xl font-bold mt-2 tabular-nums">
                      {open && nowMs ? fmtHours(Math.max(0, (nowMs - new Date(open.in).getTime()) / 3_600_000)) : fmtHours(todayHours)}
                    </p>
                    <p className="text-white/70 text-sm mt-1">
                      {open ? `Clocked in at ${fmtClock(open.in)}${open.inMeta ? ` · ${open.inMeta.place}` : ''} · running` : todayHours > 0 ? `${fmtHours(todayHours)} logged today` : 'Not clocked in yet'}
                    </p>
                  </div>
                  {open ? (
                    <button onClick={doClockOut} disabled={punching} className="bg-white text-brand-burgundy font-semibold px-5 py-3 rounded-xl hover:bg-brand-powder-blue transition disabled:opacity-60">
                      {punching ? 'Locating…' : 'Clock Out'}
                    </button>
                  ) : (
                    <button onClick={doClockIn} disabled={punching} className="bg-white text-brand-royal-blue font-semibold px-5 py-3 rounded-xl hover:bg-brand-powder-blue transition disabled:opacity-60">
                      {punching ? 'Locating…' : 'Clock In'}
                    </button>
                  )}
                </div>
                {todaySessions.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-white/15 space-y-1.5">
                    {todaySessions.map(s => (
                      <div key={s.id} className="flex items-center justify-between gap-2 text-sm text-white/80">
                        <span className="flex items-center gap-2">
                          {fmtClock(s.in)} — {s.out ? fmtClock(s.out) : <span className="text-emerald-300">now</span>}
                          {s.inMeta && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-white/15">{s.inMeta.place}</span>}
                        </span>
                        <span className="tabular-nums">{fmtHours(hoursForDate([s], s.date, nowMs ?? undefined))}</span>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-[11px] text-white/50 mt-3">Location is captured at clock-in to verify office vs remote. (Demo-grade — real enforcement needs a server.)</p>
              </div>

              <div className="bg-white rounded-2xl border border-brand-gray p-6">
                <h2 className="text-base font-semibold text-brand-charcoal mb-1">Today — {fmtLabel(today)}</h2>
                {todayRecord ? (
                  <div className="mt-3 flex items-center gap-3">
                    <span className="text-sm font-semibold px-3 py-1.5 rounded-full" style={{ color: ATTENDANCE_META[todayRecord.status].color, background: ATTENDANCE_META[todayRecord.status].bg }}>
                      {ATTENDANCE_META[todayRecord.status].label}
                    </span>
                    {todayRecord.leaveType && <span className="text-sm text-brand-slate-gray">{todayRecord.leaveType}</span>}
                  </div>
                ) : (
                  <p className="text-sm text-brand-slate-gray mt-1">Not marked by HR yet.</p>
                )}
                <p className="text-xs text-brand-slate-gray mt-3">Attendance is recorded by HR. Reach out to your HR lead if something looks off.</p>
              </div>

              <div className="bg-white rounded-2xl border border-brand-gray p-6">
                <h2 className="text-base font-semibold text-brand-charcoal mb-4">Last 14 days</h2>
                <div className="grid grid-cols-7 gap-2">
                  {days.map(d => {
                    const rec = me.attendance.find(a => a.date === d)
                    const meta = rec ? ATTENDANCE_META[rec.status] : { color: '#94A3B8', bg: '#F1F5F9', label: '—' }
                    const tip = rec ? `${fmtShort(d)} · ${meta.label}${rec.leaveType ? ` (${rec.leaveType})` : ''}` : fmtShort(d)
                    return (
                      <div key={d} className="text-center">
                        <div title={tip} className="w-full aspect-square rounded-lg flex items-center justify-center text-[10px] font-bold" style={{ background: meta.bg, color: meta.color }}>
                          {new Date(d + 'T00:00:00Z').getUTCDate()}
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div className="flex flex-wrap gap-3 mt-4">
                  {STATUSES.map(s => (
                    <span key={s} className="flex items-center gap-1.5 text-xs text-brand-slate-gray">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: ATTENDANCE_META[s].color }} />
                      {ATTENDANCE_META[s].label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  )
}

/* ================= HR / Admin: roster + inline marking ================= */
function TeamAttendance() {
  const { workers, markAttendance, clockIn, clockOut } = useWorkforce()
  const today = todayStr()
  const nowMs = useNowMs()

  const [markDate, setMarkDate] = useState(today)
  const [query, setQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [preset, setPreset] = useState<string | null>(null)
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
  const [saved, setSaved] = useState(false)

  const roster = workers.filter(w => w.stage === 'active') // onboarded employees

  const applyPreset = (p: typeof PRESETS[number]) => {
    if (preset === p.label) { setPreset(null); setFilters(f => ({ ...f, status: 'all', types: [] })); return }
    setPreset(p.label); setFilters(f => ({ ...f, status: p.status, types: [p.type] }))
  }
  const toggleType = (t: WorkerType) => { setPreset(null); setFilters(f => ({ ...f, types: f.types.includes(t) ? f.types.filter(x => x !== t) : [...f.types, t] })) }
  const toggleDept = (d: string) => setFilters(f => ({ ...f, departments: f.departments.includes(d) ? f.departments.filter(x => x !== d) : [...f.departments, d] }))
  const clearFilters = () => { setFilters(EMPTY_FILTERS); setPreset(null) }
  const activeFilterCount = filters.types.length + filters.departments.length + (filters.status !== 'all' ? 1 : 0)

  const list = useMemo(() => roster.filter(w => {
    if (query) {
      const q = query.toLowerCase()
      if (!w.name.toLowerCase().includes(q) && !w.type.toLowerCase().includes(q) && !w.department.toLowerCase().includes(q) && !w.designation.toLowerCase().includes(q)) return false
    }
    if (filters.types.length && !filters.types.includes(w.type)) return false
    if (filters.departments.length && !filters.departments.includes(w.department)) return false
    if (filters.status !== 'all' && w.status !== filters.status) return false
    return true
  }), [roster, query, filters])

  const markedCount = list.filter(w => w.attendance.some(a => a.date === markDate)).length

  // Day tally for the summary cards. Counts follow the visible list, so applying a
  // filter or a search narrows the cards along with the table.
  const tally = useMemo(() => {
    const t = { present: 0, absent: 0, paid: 0, unpaid: 0, unmarked: 0 }
    list.forEach(w => {
      const rec = w.attendance.find(a => a.date === markDate)
      if (!rec) { t.unmarked++; return }
      if (rec.status === 'present') t.present++
      else if (rec.status === 'absent') t.absent++
      // a leave record only carries a type when one was chosen; Paid Leave is the
      // default in the marking UI, so an untyped leave counts as paid
      else if (rec.leaveType === 'Unpaid Leave') t.unpaid++
      else t.paid++
    })
    return t
  }, [list, markDate])

  const TALLY_CARDS: { label: string; value: number; color: string }[] = [
    { label: 'Present', value: tally.present, color: ATTENDANCE_META.present.color },
    { label: 'Absent', value: tally.absent, color: ATTENDANCE_META.absent.color },
    { label: 'Paid Leave', value: tally.paid, color: '#B45309' },
    { label: 'Unpaid Leave', value: tally.unpaid, color: '#475569' },
    { label: 'Not marked', value: tally.unmarked, color: '#94A3B8' },
  ]

  const updateDay = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const exportDay = () => {
    const rows = [
      ['Date', 'Name', 'Worker Type', 'Department', 'Designation', 'HR Lead', 'Status', 'Leave Type', 'Hours Worked'],
      ...list.map(w => {
        const rec = w.attendance.find(a => a.date === markDate)
        return [markDate, w.name, w.type, w.department, w.designation, w.hrLead,
          rec ? ATTENDANCE_META[rec.status].label : 'Not marked', rec?.leaveType || '',
          hoursForDate(w.timeSessions, markDate, nowMs ?? undefined).toString()]
      }),
    ]
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `attendance-${markDate}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <Sidebar />
      <div className="min-h-screen bg-brand-off-white with-sidebar">
        <header className="bg-white border-b border-brand-gray sticky top-0 z-10">
          <div className="px-8 py-5 flex items-end justify-between gap-4 flex-wrap">
            <div>
              <Link href="/dashboard?role=admin" className="text-brand-slate-gray hover:text-brand-royal-blue text-sm">← Dashboard</Link>
              <h1 className="text-2xl font-bold text-brand-charcoal mt-1">Team Attendance</h1>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <span className="text-brand-slate-gray">Marking for</span>
              <input type="date" value={markDate} max={today} onChange={e => setMarkDate(e.target.value)} className="!w-auto" />
            </label>
          </div>
        </header>

        <main className="px-8 py-7 space-y-4">
          {/* Day summary */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {TALLY_CARDS.map(c => (
              <div key={c.label} className="bg-white rounded-2xl border border-brand-gray p-4">
                <p className="text-2xl font-bold" style={{ color: c.color }}>{c.value}</p>
                <p className="text-xs text-brand-slate-gray">{c.label}</p>
              </div>
            ))}
          </div>

          {/* Search + filters */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 flex-1 min-w-[240px]">
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search name, type, department, designation..." className="w-full max-w-sm px-4 py-2 border border-brand-gray rounded-xl bg-white text-sm" />
              <button onClick={() => setShowFilters(v => !v)} className="btn-ghost text-sm whitespace-nowrap">
                Filters {activeFilterCount > 0 && <span className="ml-1 bg-brand-royal-blue text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{activeFilterCount}</span>}
              </button>
              {activeFilterCount > 0 && <button onClick={clearFilters} className="text-xs text-brand-slate-gray hover:text-brand-burgundy whitespace-nowrap">Clear all</button>}
            </div>
            <p className="text-sm text-brand-slate-gray whitespace-nowrap">{list.length} of {roster.length}</p>
          </div>

          {/* Presets */}
          <div className="flex flex-wrap gap-2">
            {PRESETS.map(p => (
              <button key={p.label} onClick={() => applyPreset(p)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition border ${preset === p.label ? 'bg-brand-royal-blue text-white border-brand-royal-blue' : 'bg-white text-brand-charcoal border-brand-gray hover:bg-brand-off-white'}`}>
                {p.label}
              </button>
            ))}
          </div>

          {/* Filter panel */}
          {showFilters && (
            <div className="bg-white rounded-2xl border border-brand-gray p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <p className="text-xs font-semibold text-brand-slate-gray uppercase tracking-wide mb-2">Employee Type</p>
                <div className="flex flex-wrap gap-1.5">
                  {TYPES.map(t => (
                    <button key={t} onClick={() => toggleType(t)}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium transition border ${filters.types.includes(t) ? 'bg-brand-royal-blue text-white border-brand-royal-blue' : 'bg-white text-brand-charcoal border-brand-gray'}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-brand-slate-gray uppercase tracking-wide mb-2">Department</p>
                <div className="flex flex-wrap gap-1.5">
                  {DEPARTMENTS.map(d => (
                    <button key={d} onClick={() => toggleDept(d)}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium transition border ${filters.departments.includes(d) ? 'bg-brand-royal-blue text-white border-brand-royal-blue' : 'bg-white text-brand-charcoal border-brand-gray'}`}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Action bar */}
          <div className="flex items-center justify-between gap-3 flex-wrap bg-white rounded-2xl border border-brand-gray px-5 py-3">
            <p className="text-sm text-brand-slate-gray">
              <span className="font-semibold text-brand-charcoal">{markedCount}</span> of {list.length} marked for {fmtLabel(markDate)}
              {saved && <span className="ml-3 text-emerald-600 font-medium">✓ Attendance updated</span>}
            </p>
            <div className="flex items-center gap-2">
              <button onClick={exportDay} className="btn-ghost text-sm">Export CSV</button>
              <button onClick={updateDay} className="btn-primary text-sm">Update Attendance</button>
            </div>
          </div>

          {/* Roster */}
          <div className="bg-white rounded-2xl border border-brand-gray divide-y divide-brand-gray">
            {list.map(w => {
              const rec = w.attendance.find(a => a.date === markDate)
              const hours = hoursForDate(w.timeSessions, markDate, nowMs ?? undefined)
              const open = openSession(w.timeSessions)
              const isToday = markDate === today
              const daySessions = w.timeSessions.filter(s => s.date === markDate)
              const dayFlags = Array.from(new Set(daySessions.flatMap(sessionFlags)))
              const punch = daySessions[daySessions.length - 1]?.inMeta
              return (
                <div key={w.id} className="p-4 flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-brand-powder-blue text-brand-royal-blue flex items-center justify-center text-xs font-semibold flex-shrink-0">
                      {w.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-brand-charcoal truncate">{w.name}</p>
                      <p className="text-xs text-brand-slate-gray truncate flex items-center gap-1.5 flex-wrap">
                        <span>{w.designation} · {w.department}</span>
                        {punch && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ color: PLACE_META[punch.place].color, background: PLACE_META[punch.place].bg }}>{punch.place}</span>}
                        {dayFlags.filter(f => f !== 'HR-entered').map(f => (
                          <span key={f} className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-red-50 text-brand-burgundy" title="Attendance anomaly — review">⚠ {f}</span>
                        ))}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* hours worked + clock toggle (clock only for today) */}
                    <div className="flex items-center gap-1.5 mr-1">
                      <span className="text-xs tabular-nums px-2 py-1 rounded-lg bg-brand-off-white text-brand-charcoal" title="Hours worked">
                        {open && isToday ? <span className="text-emerald-600">● </span> : null}{fmtHours(hours)}
                      </span>
                      {isToday && (open
                        ? <button onClick={() => clockOut(w.id, { source: 'hr', place: 'HR-entered' })} className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-brand-burgundy text-white hover:bg-opacity-90 transition">Out</button>
                        : <button onClick={() => clockIn(w.id, { source: 'hr', place: 'HR-entered' })} className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-brand-gray text-brand-royal-blue hover:bg-brand-off-white transition">In</button>
                      )}
                    </div>
                    <div className="w-px h-6 bg-brand-gray" />
                    <div className="flex gap-1.5">
                      {STATUSES.map(s => {
                        const meta = ATTENDANCE_META[s]
                        const on = rec?.status === s
                        return (
                          <button key={s} onClick={() => markAttendance(w.id, markDate, s, s === 'leave' ? (rec?.leaveType || 'Paid Leave') : undefined)}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold transition border"
                            style={{ color: on ? '#fff' : meta.color, background: on ? meta.color : meta.bg, borderColor: on ? meta.color : 'transparent' }}>
                            {meta.label}
                          </button>
                        )
                      })}
                    </div>
                    {/* leave-type dropdown appears when Leave is selected for this worker/date */}
                    {rec?.status === 'leave' && (
                      <select
                        value={rec.leaveType || 'Paid Leave'}
                        onChange={e => markAttendance(w.id, markDate, 'leave', e.target.value as LeaveType)}
                        className="!w-auto text-xs py-1.5">
                        {LEAVE_TYPES.map(lt => <option key={lt} value={lt}>{lt}</option>)}
                      </select>
                    )}
                  </div>
                </div>
              )
            })}
            {list.length === 0 && (
              <div className="p-10 text-center text-brand-slate-gray text-sm">No employees match these filters.</div>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            {STATUSES.map(s => (
              <span key={s} className="flex items-center gap-1.5 text-xs text-brand-slate-gray">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: ATTENDANCE_META[s].color }} />
                {ATTENDANCE_META[s].label}
              </span>
            ))}
          </div>
        </main>
      </div>
    </>
  )
}

function fmtShort(d: string) {
  return new Date(d + 'T00:00:00Z').toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', timeZone: 'UTC' })
}
function fmtLabel(d: string) {
  return new Date(d + 'T00:00:00Z').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' })
}
