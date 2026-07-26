'use client'

import Link from 'next/link'
import Sidebar from '@/app/layout/Sidebar'
import { useWorkforce, STAGE_META, fmtDateTime, fmtDate, computePerformance, todayStr, ATTENDANCE_META } from '@/app/lib/workforceStore'
import { PieChart } from '@/app/lib/charts'
import { CalendarTimeline } from '@/app/lib/calendar'
import { useState, useEffect } from 'react'
import { useQueryParam } from '@/app/lib/useQueryParam'

export const dynamic = 'force-dynamic'

/* ---------- Inline icon set (stroke, currentColor) ---------- */
const Icon = {
  users: (c = '') => (
    <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  userPlus: (c = '') => (
    <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><path d="M20 8v6M23 11h-6" />
    </svg>
  ),
  clock: (c = '') => (
    <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
    </svg>
  ),
  shield: (c = '') => (
    <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l8 3v6c0 5-3.4 8.5-8 11-4.6-2.5-8-6-8-11V5l8-3z" /><path d="M9 12l2 2 4-4" />
    </svg>
  ),
  bell: (c = '') => (
    <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </svg>
  ),
  search: (c = '') => (
    <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
    </svg>
  ),
  mail: (c = '') => (
    <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" />
    </svg>
  ),
  doc: (c = '') => (
    <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M9 13h6M9 17h6" />
    </svg>
  ),
  check: (c = '') => (
    <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  ),
  arrowUp: (c = '') => (
    <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 19V5M6 11l6-6 6 6" />
    </svg>
  ),
  arrowDown: (c = '') => (
    <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14M6 13l6 6 6-6" />
    </svg>
  ),
}

/* ---------- Mini pie chart (used inside KPI cards) ---------- */
function MiniPie({ ratio, color }: { ratio: number; color: string }) {
  const pct = Math.max(0, Math.min(1, ratio))
  const size = 32, r = 13, C = 2 * Math.PI * r
  const dash = pct * C
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible flex-shrink-0">
      <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#F1F5F9" strokeWidth="6" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="6"
          strokeDasharray={`${dash} ${C - dash}`} strokeLinecap="round" />
      </g>
      <text x={size / 2} y={size / 2 + 3.5} textAnchor="middle" fontSize="9" fontWeight="700" fill={color}>{Math.round(pct * 100)}</text>
    </svg>
  )
}



/* ---------- KPI card ---------- */
function Kpi({ label, value, icon, tint, delta, up, ratio, ratioColor }: {
  label: string; value: string | number; icon: JSX.Element; tint: string
  delta: string; up: boolean; ratio: number; ratioColor: string
}) {
  return (
    <div className="bg-white rounded-2xl border border-brand-gray p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
      <div className="flex items-start justify-between">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: tint }}>
          {icon}
        </div>
        <span className={`inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-1 rounded-full ${up ? 'text-emerald-600 bg-emerald-50' : 'text-brand-burgundy bg-red-50'}`}>
          <span className="w-3 h-3">{up ? Icon.arrowUp() : Icon.arrowDown()}</span>{delta}
        </span>
      </div>
      <p className="text-3xl font-bold text-brand-charcoal mt-4">{value}</p>
      <div className="flex items-end justify-between mt-1">
        <p className="text-sm text-brand-slate-gray">{label}</p>
        <MiniPie ratio={ratio} color={ratioColor} />
      </div>
    </div>
  )
}

/* ---------- Weather (WMO code → label + inline icon) ---------- */
function wmo(code: number): { label: string; icon: JSX.Element } {
  const s = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  const sun = <svg viewBox="0 0 24 24" {...s}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
  const cloud = <svg viewBox="0 0 24 24" {...s}><path d="M7 18a4 4 0 0 1 0-8 5 5 0 0 1 9.6-1.5A3.5 3.5 0 0 1 17 18H7z" /></svg>
  const rain = <svg viewBox="0 0 24 24" {...s}><path d="M7 15a4 4 0 0 1 0-8 5 5 0 0 1 9.6-1.5A3.5 3.5 0 0 1 17 15H7z" /><path d="M8 19v2M12 19v2M16 19v2" /></svg>
  const snow = <svg viewBox="0 0 24 24" {...s}><path d="M7 15a4 4 0 0 1 0-8 5 5 0 0 1 9.6-1.5A3.5 3.5 0 0 1 17 15H7z" /><path d="M8 19h.01M12 20h.01M16 19h.01" /></svg>
  const storm = <svg viewBox="0 0 24 24" {...s}><path d="M7 15a4 4 0 0 1 0-8 5 5 0 0 1 9.6-1.5A3.5 3.5 0 0 1 17 15H7z" /><path d="M12 15l-2 4h3l-2 4" /></svg>
  const fog = <svg viewBox="0 0 24 24" {...s}><path d="M4 10h16M4 14h16M6 18h12M6 6h12" /></svg>
  if (code === 0) return { label: 'Clear', icon: sun }
  if (code <= 3) return { label: 'Partly cloudy', icon: cloud }
  if (code === 45 || code === 48) return { label: 'Fog', icon: fog }
  if (code >= 51 && code <= 67) return { label: 'Rain', icon: rain }
  if (code >= 71 && code <= 77) return { label: 'Snow', icon: snow }
  if (code >= 80 && code <= 82) return { label: 'Showers', icon: rain }
  if (code >= 95) return { label: 'Storm', icon: storm }
  return { label: 'Cloudy', icon: cloud }
}
function tzCity(): string {
  try { return (Intl.DateTimeFormat().resolvedOptions().timeZone || '').split('/').pop()?.replace(/_/g, ' ') || 'your area' }
  catch { return 'your area' }
}

/* ---------- Dashboard greeting: live clock + date + weather + time-based hello ---------- */
function DashboardGreeting({ verifyCount, readyCount, ctaHref }: { verifyCount: number; readyCount: number; ctaHref: string }) {
  const [now, setNow] = useState<Date | null>(null)
  const [wx, setWx] = useState<{ temp: number; code: number; place: string } | null>(null)
  const [wxState, setWxState] = useState<'loading' | 'ok' | 'error'>('loading')
  // login / clock-in for the day (HR's own), persisted per date in localStorage
  const [login, setLogin] = useState<{ in: number; out?: number } | null>(null)

  const loginKey = () => `wop-hr-login-${new Date().toISOString().slice(0, 10)}`
  useEffect(() => {
    try { const raw = localStorage.getItem(loginKey()); if (raw) setLogin(JSON.parse(raw)) } catch {}
  }, [])
  const persistLogin = (v: { in: number; out?: number } | null) => {
    setLogin(v)
    try { v ? localStorage.setItem(loginKey(), JSON.stringify(v)) : localStorage.removeItem(loginKey()) } catch {}
  }
  const clockIn = () => persistLogin({ in: Date.now() })
  const clockOut = () => login && persistLogin({ ...login, out: Date.now() })

  useEffect(() => {
    setNow(new Date())
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    let done = false
    const fetchWx = (lat: number, lon: number, place: string) => {
      fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&timezone=auto`)
        .then(r => r.json())
        .then(d => {
          if (done) return
          if (d?.current) { setWx({ temp: Math.round(d.current.temperature_2m), code: d.current.weather_code, place }); setWxState('ok') }
          else setWxState('error')
        })
        .catch(() => { if (!done) setWxState('error') })
    }
    const fallback = () => fetchWx(26.9124, 75.7873, 'Jaipur')
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => fetchWx(pos.coords.latitude, pos.coords.longitude, tzCity()),
        () => fallback(),
        { timeout: 8000 }
      )
    } else fallback()
    return () => { done = true }
  }, [])

  const h = now?.getHours() ?? 9
  const greeting = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : h < 21 ? 'Good evening' : 'Good night'
  const time = now ? now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '--:--:--'
  const dateStr = now ? now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : ''
  const open = verifyCount + readyCount
  const w = wx ? wmo(wx.code) : null

  const loggedInAt = login ? new Date(login.in).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : null
  const elapsedMin = login ? Math.max(0, Math.floor(((login.out ?? (now?.getTime() ?? Date.now())) - login.in) / 60000)) : 0
  const elapsed = `${Math.floor(elapsedMin / 60)}h ${elapsedMin % 60}m`

  return (
    <div className="rounded-2xl bg-gradient-to-r from-brand-royal-blue to-[#24377f] text-white px-7 py-6 relative overflow-hidden">
      <div className="relative z-10 flex items-start justify-between gap-5 flex-wrap">
        <div>
          <h2 className="text-xl font-semibold text-white">{greeting}, HR Manager</h2>
          <p className="text-white/70 text-sm mt-1">
            {open > 0 ? `${verifyCount} to verify and ${readyCount} ready for account creation.` : 'You’re all caught up on onboarding. Nice work.'}
          </p>
          <Link href={ctaHref} className="inline-flex items-center gap-2 bg-white text-brand-royal-blue text-sm font-semibold px-4 py-2 rounded-xl hover:bg-brand-powder-blue transition mt-4">
            <span className="w-4 h-4">{Icon.shield()}</span> {open > 0 ? 'Start reviewing' : 'View documents'}
          </Link>
        </div>

        {/* Clock + weather + login */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-4 bg-white/10 rounded-2xl px-5 py-3 backdrop-blur">
            <div className="text-right">
              <p className="text-2xl font-bold tabular-nums leading-none">{time}</p>
              <p className="text-white/70 text-xs mt-1">{dateStr}</p>
            </div>
            <div className="w-px h-11 bg-white/20" />
            <div className="flex items-center gap-2.5 min-w-[120px]">
              {wxState === 'ok' && w && wx ? (
                <>
                  <span className="w-8 h-8 text-white">{w.icon}</span>
                  <div>
                    <p className="text-lg font-bold leading-none">{wx.temp}°C</p>
                    <p className="text-white/70 text-xs mt-1">{w.label} · {wx.place}</p>
                  </div>
                </>
              ) : wxState === 'loading' ? (
                <p className="text-white/60 text-xs">Loading weather…</p>
              ) : (
                <p className="text-white/60 text-xs">Weather unavailable</p>
              )}
            </div>
          </div>

          {/* Login / clock-in */}
          <div className="flex items-center justify-between gap-4 bg-white/10 rounded-2xl px-5 py-2.5 backdrop-blur">
            <div>
              <p className="text-[10px] text-white/60 uppercase tracking-wide font-semibold">Logged in</p>
              {login ? (
                <p className="text-sm font-semibold">
                  {loggedInAt} · {elapsed}{login.out ? <span className="text-white/60 font-normal"> · clocked out</span> : ''}
                </p>
              ) : (
                <p className="text-sm text-white/70">Not logged in yet</p>
              )}
            </div>
            {!login ? (
              <button onClick={clockIn} className="bg-white text-brand-royal-blue text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-brand-powder-blue transition whitespace-nowrap">Clock In</button>
            ) : !login.out ? (
              <button onClick={clockOut} className="bg-white/20 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-white/30 transition whitespace-nowrap">Clock Out</button>
            ) : (
              <button onClick={clockIn} className="bg-white/20 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-white/30 transition whitespace-nowrap">Clock In Again</button>
            )}
          </div>
        </div>
      </div>
      <div className="absolute right-0 top-0 h-full w-64 opacity-10 pointer-events-none">
        <svg viewBox="0 0 200 100" className="h-full w-full"><circle cx="160" cy="20" r="60" fill="white" /><circle cx="90" cy="80" r="40" fill="white" /></svg>
      </div>
    </div>
  )
}

/* HR work-queue list: workers needing an action, each row links to the doc view */
function WorkQueue({ title, items, cta, accent }: {
  title: string
  items: import('@/app/lib/workforceStore').Worker[]
  cta: string
  accent: string
}) {
  return (
    <div className="rounded-xl border border-brand-gray p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: accent }} />
          <h3 className="text-sm font-semibold text-brand-charcoal">{title}</h3>
        </div>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ color: accent, background: `${accent}1a` }}>{items.length}</span>
      </div>

      {items.length === 0 ? (
        <div className="py-6 text-center">
          <p className="text-sm text-brand-slate-gray">All caught up — nothing here.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.slice(0, 4).map(w => {
            const approved = w.documents.filter(d => d.status === 'approved').length
            return (
              <Link key={w.id} href={`/documents?role=admin&worker=${w.id}`}
                className="flex items-center justify-between gap-3 p-2.5 rounded-lg hover:bg-brand-off-white transition group">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-brand-powder-blue text-brand-royal-blue flex items-center justify-center text-[11px] font-semibold flex-shrink-0">
                    {w.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-brand-charcoal truncate">{w.name}</p>
                    <p className="text-xs text-brand-slate-gray truncate">{w.type} · {approved}/{w.documents.length} docs verified</p>
                  </div>
                </div>
                <span className="text-xs font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 transition" style={{ color: accent }}>{cta} →</span>
              </Link>
            )
          })}
          {items.length > 4 && (
            <Link href="/documents?role=admin" className="block text-center text-xs font-medium text-brand-royal-blue hover:underline pt-1">
              +{items.length - 4} more
            </Link>
          )}
        </div>
      )}
    </div>
  )
}

function AdminDashboard() {
  const { workers, activity, notifications } = useWorkforce()

  const totalEmployees = workers.length
  const activeEmployees = workers.filter(w => w.stage === 'active').length
  const pendingOnboarding = workers.filter(w => w.stage !== 'active').length
  const pendingVerification = workers.filter(w => w.documents.some(d => d.status === 'pending')).length
  const unreadNotif = notifications.filter(n => !n.read).length

  // HR work queue — real, actionable items from the store
  const needVerify = workers.filter(w => w.stage === 'verifying')
  const readyForAccount = workers.filter(w => w.stage === 'verified')
  const awaitingUpload = workers.filter(w => w.stage === 'invited')
  const stageStrip = [
    { stage: 'invited' as const, label: 'Invited', count: awaitingUpload.length },
    { stage: 'verifying' as const, label: 'Verifying', count: needVerify.length },
    { stage: 'verified' as const, label: 'Ready for Account', count: readyForAccount.length },
    { stage: 'active' as const, label: 'Onboarded', count: activeEmployees },
  ]

  // Real composition — actual workers grouped by type
  const TYPE_COLORS: Record<string, string> = {
    Employee: '#162660', Contractor: '#5B77C4', Intern: '#94A3B8',
  }
  const byType = Object.entries(workers.reduce((acc, w) => { acc[w.type] = (acc[w.type] || 0) + 1; return acc }, {} as Record<string, number>))
    .map(([label, value]) => ({ label, value, color: TYPE_COLORS[label] || '#162660' }))
  const byDept = Object.entries(workers.reduce((acc, w) => { acc[w.department] = (acc[w.department] || 0) + 1; return acc }, {} as Record<string, number>))
    .map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value)
  const maxDept = Math.max(1, ...byDept.map(d => d.value))

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

  return (
    <>
      <Sidebar />
      <div className="min-h-screen bg-brand-off-white with-sidebar">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur border-b border-brand-gray sticky top-0 z-10">
          <div className="px-8 py-5 flex justify-between items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-brand-charcoal">Dashboard</h1>
              <p className="text-sm text-brand-slate-gray mt-0.5">{today}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative hidden md:block">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-slate-gray">{Icon.search()}</span>
                <input
                  type="text"
                  placeholder="Search employees..."
                  className="pl-9 pr-4 py-2 border border-brand-gray rounded-xl bg-brand-off-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-royal-blue w-64 text-sm"
                />
              </div>
              <Link href="/notifications?role=admin" className="relative w-10 h-10 rounded-xl border border-brand-gray bg-white flex items-center justify-center text-brand-charcoal hover:bg-brand-off-white transition">
                <span className="w-5 h-5">{Icon.bell()}</span>
                {unreadNotif > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-brand-burgundy text-white text-[10px] font-bold rounded-full flex items-center justify-center">{unreadNotif}</span>}
              </Link>
              <div className="w-10 h-10 rounded-full bg-brand-royal-blue text-white flex items-center justify-center font-semibold text-sm">HR</div>
            </div>
          </div>
        </header>

        {/* Main */}
        <main className="px-8 py-7 space-y-6">
          {/* Greeting banner — live clock, weather, time-based greeting */}
          <DashboardGreeting
            verifyCount={needVerify.length}
            readyCount={readyForAccount.length}
            ctaHref={needVerify.length ? `/documents?role=admin&worker=${needVerify[0].id}` : '/documents?role=admin'}
          />

          {/* Google Calendar day timeline */}
          <CalendarTimeline title="Your Schedule Today" />

          {/* ===== HR WORK QUEUE — top priority ===== */}
          <section className="bg-white rounded-2xl border border-brand-gray p-6">
            <div className="flex items-center justify-between gap-4 mb-5 flex-wrap">
              <div>
                <h2 className="text-lg font-bold text-brand-charcoal">Onboarding Pipeline</h2>
                <p className="text-sm text-brand-slate-gray mt-0.5">Your active workload — verify documents, then create accounts.</p>
              </div>
              <Link href="/documents?role=admin" className="btn-ghost text-sm">Open board →</Link>
            </div>

            {/* Stage strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {stageStrip.map(s => {
                const meta = STAGE_META[s.stage]
                return (
                  <Link key={s.stage} href="/documents?role=admin"
                    className="rounded-xl border border-brand-gray p-4 hover:shadow-md hover:-translate-y-0.5 transition-all">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: meta.color }} />
                      <span className="text-xs font-medium text-brand-slate-gray">{s.label}</span>
                    </div>
                    <p className="text-2xl font-bold text-brand-charcoal mt-2">{s.count}</p>
                  </Link>
                )
              })}
            </div>

            {/* Action lists */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <WorkQueue title="Awaiting your verification" accent="#F59E0B" cta="Verify" items={needVerify} />
              <WorkQueue title="Ready for account creation" accent="#10B981" cta="Create account" items={readyForAccount} />
            </div>
          </section>

          {/* KPI cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <Kpi label="Total Employees" value={totalEmployees} tint="#E8EEFB" ratioColor="#162660"
              icon={<span className="w-5 h-5 text-brand-royal-blue">{Icon.users()}</span>}
              delta="8%" up ratio={totalEmployees ? activeEmployees / totalEmployees : 0} />
            <Kpi label="Onboarded" value={activeEmployees} tint="#E8F6EF" ratioColor="#10B981"
              icon={<span className="w-5 h-5 text-emerald-600">{Icon.userPlus()}</span>}
              delta="12%" up ratio={totalEmployees ? activeEmployees / totalEmployees : 0} />
            <Kpi label="Pending Onboarding" value={pendingOnboarding} tint="#FEF3E2" ratioColor="#F59E0B"
              icon={<span className="w-5 h-5 text-amber-500">{Icon.clock()}</span>}
              delta="3%" up={false} ratio={totalEmployees ? pendingOnboarding / totalEmployees : 0} />
            <Kpi label="Pending Verification" value={pendingVerification} tint="#F7E7EA" ratioColor="#800020"
              icon={<span className="w-5 h-5 text-brand-burgundy">{Icon.doc()}</span>}
              delta="5%" up={false} ratio={totalEmployees ? pendingVerification / totalEmployees : 0} />
          </div>

          {/* Composition row — real data */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Workforce composition donut */}
            <div className="bg-white rounded-2xl border border-brand-gray p-6 relative overflow-hidden">
              <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-brand-powder-blue/30 blur-2xl" />
              <div className="relative">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-base font-semibold text-brand-charcoal">Workforce Composition</h2>
                  <span className="text-xs font-medium text-brand-royal-blue bg-brand-powder-blue px-3 py-1 rounded-full">{totalEmployees} total</span>
                </div>
                <PieChart data={byType} />
              </div>
            </div>

            {/* By department */}
            <div className="bg-white rounded-2xl border border-brand-gray p-6">
              <h2 className="text-base font-semibold text-brand-charcoal mb-5">By Department</h2>
              <div className="space-y-3.5">
                {byDept.map(d => (
                  <div key={d.label} className="group">
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="text-brand-charcoal">{d.label}</span>
                      <span className="font-semibold text-brand-charcoal">{d.value}</span>
                    </div>
                    <div className="w-full bg-brand-off-white rounded-full h-2.5 overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-brand-royal-blue to-[#5B77C4] transition-all duration-500 group-hover:brightness-110"
                        style={{ width: `${(d.value / maxDept) * 100}%` }} />
                    </div>
                  </div>
                ))}
                {byDept.length === 0 && <p className="text-sm text-brand-slate-gray">No employees yet.</p>}
              </div>
            </div>
          </div>

          {/* Quick actions + Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl border border-brand-gray p-6">
              <h2 className="text-base font-semibold text-brand-charcoal mb-4">Quick Actions</h2>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Add Employee', href: '/employees?role=admin', icon: Icon.userPlus(), primary: true },
                  { label: 'Verify Docs', href: '/documents?role=admin', icon: Icon.shield() },
                  { label: 'Attendance', href: '/attendance?role=admin', icon: Icon.check() },
                  { label: 'Assign Task', href: '/tasks?role=admin', icon: Icon.doc() },
                ].map((a, i) => (
                  <Link key={i} href={a.href}
                    className={`flex flex-col items-start gap-3 p-4 rounded-xl border transition-all hover:-translate-y-0.5 hover:shadow-md ${a.primary ? 'bg-brand-royal-blue border-brand-royal-blue text-white' : 'bg-white border-brand-gray text-brand-charcoal hover:border-brand-royal-blue'}`}>
                    <span className={`w-5 h-5 ${a.primary ? 'text-white' : 'text-brand-royal-blue'}`}>{a.icon}</span>
                    <span className="text-sm font-medium">{a.label}</span>
                  </Link>
                ))}
              </div>
            </div>

            <div className="lg:col-span-2 bg-white rounded-2xl border border-brand-gray p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-brand-charcoal">Recent Activity</h2>
                <Link href="/notifications?role=admin" className="text-xs font-medium text-brand-royal-blue hover:underline">View all</Link>
              </div>
              <div className="relative pl-6">
                <span className="absolute left-2 top-1 bottom-1 w-px bg-brand-gray" />
                {activity.slice(0, 6).map(a => (
                  <div key={a.id} className="relative pb-5 last:pb-0">
                    <span className="absolute -left-[18px] top-1 w-3 h-3 rounded-full ring-4 ring-white" style={{ background: a.color }} />
                    <p className="text-sm text-brand-charcoal">{a.message}</p>
                    <p className="text-xs text-brand-slate-gray mt-0.5">{fmtDateTime(a.createdAt)}</p>
                  </div>
                ))}
                {activity.length === 0 && <p className="text-sm text-brand-slate-gray">No activity yet.</p>}
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  )
}

/* ================= Employee (self-service) dashboard ================= */
function EmployeeDashboard({ workerId }: { workerId: string | null }) {
  const { workers, notifications, setGoal, addNote, toggleNote } = useWorkforce()
  const [noteText, setNoteText] = useState('')
  const me = workerId ? workers.find(w => w.id === workerId) : workers.find(w => w.stage !== 'active') || workers[0]

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

  if (!me) {
    return (
      <>
        <Sidebar />
        <div className="min-h-screen bg-brand-off-white with-sidebar flex items-center justify-center">
          <div className="bg-white rounded-2xl border border-brand-gray p-10 text-center max-w-md">
            <h1 className="text-xl font-bold text-brand-charcoal">No worker found</h1>
            <p className="text-brand-slate-gray mt-2 text-sm">Sign in again and pick a worker from the list.</p>
            <Link href="/" className="btn-primary inline-block mt-4">Back to login</Link>
          </div>
        </div>
      </>
    )
  }

  const meta = STAGE_META[me.stage]
  const approved = me.documents.filter(d => d.status === 'approved').length
  const rejected = me.documents.filter(d => d.status === 'rejected')
  const pendingReview = me.documents.filter(d => d.status === 'pending').length
  const docsDone = approved === me.documents.length
  const myNotifs = notifications.filter(n => n.workerId === me.id)
  const unread = myNotifs.filter(n => !n.read).length
  const NEXT: Record<'todo' | 'in_progress' | 'completed', 'todo' | 'in_progress' | 'completed'> = { todo: 'in_progress', in_progress: 'completed', completed: 'todo' }
  const GOAL_META = {
    todo: { label: 'To Do', color: '#64748B', bg: '#F1F5F9' },
    in_progress: { label: 'In Progress', color: '#B45309', bg: '#FEF3E2' },
    completed: { label: 'Completed', color: '#0F7A46', bg: '#E8F6EF' },
  }
  const perf = computePerformance(me)
  const today8601 = todayStr()
  const todayAttendance = me.attendance.find(a => a.date === today8601)
  const todoCount = me.notes.filter(n => n.kind === 'todo' && !n.done).length
  const activeProject = me.projects.find(p => p.status === 'in_progress') || me.projects[0]

  return (
    <>
      <Sidebar />
      <div className="min-h-screen bg-brand-off-white with-sidebar">
        <header className="bg-white/80 backdrop-blur border-b border-brand-gray sticky top-0 z-10">
          <div className="px-8 py-5 flex justify-between items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-brand-charcoal">Welcome, {me.name.split(' ')[0]}</h1>
              <p className="text-sm text-brand-slate-gray mt-0.5">{today}</p>
            </div>
            <div className="flex items-center gap-3">
              <Link href={`/notifications?role=employee&worker=${me.id}`} className="relative w-10 h-10 rounded-xl border border-brand-gray bg-white flex items-center justify-center text-brand-charcoal hover:bg-brand-off-white transition">
                <span className="w-5 h-5">{Icon.bell()}</span>
                {unread > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-brand-burgundy text-white text-[10px] font-bold rounded-full flex items-center justify-center">{unread}</span>}
              </Link>
              <div className="w-10 h-10 rounded-full bg-brand-royal-blue text-white flex items-center justify-center font-semibold text-sm">
                {me.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
              </div>
            </div>
          </div>
        </header>

        <main className="px-8 py-7 space-y-6">
          {/* Status banner */}
          <div className="rounded-2xl bg-gradient-to-r from-brand-royal-blue to-[#24377f] text-white px-7 py-6 flex items-center justify-between overflow-hidden relative">
            <div className="relative z-10">
              <p className="text-xs uppercase tracking-wide text-white/60 font-semibold">Onboarding status</p>
              <h2 className="text-xl font-semibold mt-1 text-white">{meta.label}{docsDone && me.accountCreated ? " — you're all set!" : ''}</h2>
              <p className="text-white/70 text-sm mt-1">
                {me.accountCreated
                  ? `Signed in as ${me.professionalEmail}`
                  : `${approved}/${me.documents.length} documents verified${rejected.length ? ` · ${rejected.length} need re-upload` : ''}`}
              </p>
            </div>
            {!me.accountCreated && (
              <Link href={`/onboard/${me.token}`} className="relative z-10 hidden sm:inline-flex items-center gap-2 bg-white text-brand-royal-blue text-sm font-semibold px-4 py-2 rounded-xl hover:bg-brand-powder-blue transition">
                {rejected.length ? 'Re-upload documents' : 'Continue uploading'}
              </Link>
            )}
            <div className="absolute right-0 top-0 h-full w-64 opacity-10">
              <svg viewBox="0 0 200 100" className="h-full w-full"><circle cx="160" cy="20" r="60" fill="white" /><circle cx="90" cy="80" r="40" fill="white" /></svg>
            </div>
          </div>

          {/* Google Calendar day timeline */}
          <CalendarTimeline title="My Schedule Today" />

          {/* KPI row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="bg-white rounded-2xl border border-brand-gray p-5">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: '#E8EEFB' }}>
                <span className="w-5 h-5 text-brand-royal-blue">{Icon.doc()}</span>
              </div>
              <p className="text-3xl font-bold text-brand-charcoal mt-4">{approved}/{me.documents.length}</p>
              <p className="text-sm text-brand-slate-gray mt-1">Documents verified</p>
            </div>
            <div className="bg-white rounded-2xl border border-brand-gray p-5">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: '#FEF3E2' }}>
                <span className="w-5 h-5 text-amber-500">{Icon.clock()}</span>
              </div>
              <p className="text-3xl font-bold text-brand-charcoal mt-4">{pendingReview}</p>
              <p className="text-sm text-brand-slate-gray mt-1">Awaiting HR review</p>
            </div>
            <div className="bg-white rounded-2xl border border-brand-gray p-5">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: '#E8F6EF' }}>
                <span className="w-5 h-5 text-emerald-600">{Icon.check()}</span>
              </div>
              <p className="text-3xl font-bold text-brand-charcoal mt-4">{me.goals.filter(g => g.status === 'completed').length}/{me.goals.length || 0}</p>
              <p className="text-sm text-brand-slate-gray mt-1">Goals completed</p>
            </div>
            <Link href={`/attendance?role=employee&worker=${me.id}`} className="bg-white rounded-2xl border border-brand-gray p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all block">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: '#F7E7EA' }}>
                <span className="w-5 h-5" style={{ color: '#800020' }}>{Icon.shield()}</span>
              </div>
              <p className="text-3xl font-bold text-brand-charcoal mt-4">{perf.score}<span className="text-lg text-brand-slate-gray">/100</span></p>
              <p className="text-sm text-brand-slate-gray mt-1">Performance score</p>
            </Link>
          </div>

          {/* Attendance + Project + Notebook */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl border border-brand-gray p-6">
              <h2 className="text-base font-semibold text-brand-charcoal mb-1">Today's Attendance</h2>
              {todayAttendance ? (
                <div className="mt-3 flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold px-3 py-1.5 rounded-full" style={{ color: ATTENDANCE_META[todayAttendance.status].color, background: ATTENDANCE_META[todayAttendance.status].bg }}>
                    {ATTENDANCE_META[todayAttendance.status].label}
                  </span>
                  {todayAttendance.leaveType && <span className="text-sm text-brand-slate-gray">{todayAttendance.leaveType}</span>}
                </div>
              ) : (
                <p className="text-sm text-brand-slate-gray mt-2">Not marked by HR yet.</p>
              )}
              <p className="text-xs text-brand-slate-gray mt-3">{perf.attendanceRate}% present (last 30 days) · <Link href={`/attendance?role=employee&worker=${me.id}`} className="text-brand-royal-blue hover:underline">View history</Link></p>
            </div>

            <div className="bg-white rounded-2xl border border-brand-gray p-6">
              <h2 className="text-base font-semibold text-brand-charcoal mb-3">My Project</h2>
              {activeProject ? (
                <div>
                  <p className="font-semibold text-brand-charcoal">{activeProject.name}</p>
                  <p className="text-sm text-brand-slate-gray mt-1">Lead: {activeProject.lead}</p>
                  <p className="text-xs text-brand-slate-gray mt-1">Started {fmtDate(activeProject.startDate)}</p>
                  <span className="inline-block mt-3 text-xs font-semibold px-2.5 py-1 rounded-full bg-brand-off-white text-brand-charcoal capitalize">{activeProject.status.replace('_', ' ')}</span>
                </div>
              ) : (
                <p className="text-sm text-brand-slate-gray py-4">No project assigned yet.</p>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-brand-gray p-6 flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-semibold text-brand-charcoal">My Notebook</h2>
                <Link href={`/notebook?role=employee&worker=${me.id}`} className="text-xs font-medium text-brand-royal-blue hover:underline">Open →</Link>
              </div>
              <form
                onSubmit={e => { e.preventDefault(); if (!noteText.trim()) return; addNote(me.id, 'todo', noteText.trim()); setNoteText('') }}
                className="flex gap-2 mb-3"
              >
                <input value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Add a to-do…" className="flex-1 text-sm" />
                <button type="submit" className="btn-primary text-sm whitespace-nowrap px-3">Add</button>
              </form>
              <div className="space-y-1 flex-1 overflow-y-auto max-h-44">
                {me.notes.filter(n => n.kind === 'todo').slice(0, 6).map(t => (
                  <div key={t.id} className="flex items-center gap-2.5 px-1 py-1 rounded-lg hover:bg-brand-off-white transition">
                    <button onClick={() => toggleNote(me.id, t.id)}
                      className={`w-4.5 h-4.5 w-[18px] h-[18px] rounded-md border-2 flex-shrink-0 flex items-center justify-center transition ${t.done ? 'bg-brand-royal-blue border-brand-royal-blue' : 'border-brand-gray'}`}>
                      {t.done && <span className="text-white text-[10px]">✓</span>}
                    </button>
                    <span className={`flex-1 text-sm truncate ${t.done ? 'line-through text-brand-slate-gray' : 'text-brand-charcoal'}`}>{t.text}</span>
                  </div>
                ))}
                {todoCount === 0 && me.notes.filter(n => n.kind === 'todo').length === 0 && (
                  <p className="text-sm text-brand-slate-gray py-4 text-center">Nothing on your list yet.</p>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* My documents */}
            <div className="bg-white rounded-2xl border border-brand-gray p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-brand-charcoal">My Documents</h2>
                <Link href={`/documents?role=employee&worker=${me.id}`} className="text-xs font-medium text-brand-royal-blue hover:underline">View all</Link>
              </div>
              <div className="space-y-2.5">
                {me.documents.map(doc => {
                  const done = doc.status === 'approved'
                  const rej = doc.status === 'rejected'
                  const pend = doc.status === 'pending'
                  return (
                    <div key={doc.key} className="flex items-center justify-between gap-3 py-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${done ? 'bg-emerald-500' : rej ? 'bg-brand-burgundy' : pend ? 'bg-amber-500' : 'bg-brand-gray'}`} />
                        <span className="text-sm text-brand-charcoal truncate">{doc.label}</span>
                      </div>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0" style={{
                        color: done ? '#0F7A46' : rej ? '#800020' : pend ? '#B45309' : '#64748B',
                        background: done ? '#E8F6EF' : rej ? '#F7E7EA' : pend ? '#FEF3E2' : '#F1F5F9',
                      }}>{done ? 'Verified' : rej ? 'Rejected' : pend ? 'Pending' : 'Awaiting'}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* My goals */}
            <div className="bg-white rounded-2xl border border-brand-gray p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-brand-charcoal">My Goals</h2>
                <Link href={`/tasks?role=employee&worker=${me.id}`} className="text-xs font-medium text-brand-royal-blue hover:underline">View all</Link>
              </div>
              {me.goals.length === 0 && <p className="text-sm text-brand-slate-gray py-6 text-center">No goals assigned yet.</p>}
              <div className="space-y-2">
                {me.goals.map(g => {
                  const gm = GOAL_META[g.status]
                  return (
                    <div key={g.id} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-brand-gray">
                      <div className="min-w-0">
                        <p className={`text-sm font-medium ${g.status === 'completed' ? 'line-through text-brand-slate-gray' : 'text-brand-charcoal'}`}>{g.title}</p>
                        {g.deadline && <p className="text-xs text-brand-slate-gray mt-0.5">Due {fmtDate(g.deadline)}</p>}
                      </div>
                      <button onClick={() => setGoal(me.id, g.id, NEXT[g.status])}
                        className="text-xs font-semibold px-3 py-1.5 rounded-full whitespace-nowrap transition hover:opacity-80"
                        style={{ color: gm.color, background: gm.bg }}>
                        {gm.label} ↻
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Recent notifications */}
          <div className="bg-white rounded-2xl border border-brand-gray p-6">
            <h2 className="text-base font-semibold text-brand-charcoal mb-4">Recent Notifications</h2>
            <div className="space-y-2">
              {myNotifs.slice(0, 5).map(n => (
                <div key={n.id} className={`flex items-start gap-3 p-3 rounded-xl ${n.read ? '' : 'bg-brand-off-white'}`}>
                  <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${n.read ? 'bg-brand-gray' : 'bg-brand-royal-blue'}`} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-brand-charcoal">{n.title}</p>
                    <p className="text-xs text-brand-slate-gray mt-0.5">{n.message}</p>
                  </div>
                </div>
              ))}
              {myNotifs.length === 0 && <p className="text-sm text-brand-slate-gray text-center py-4">No notifications yet.</p>}
            </div>
          </div>
        </main>
      </div>
    </>
  )
}

/* ================= Role router ================= */
export default function DashboardPage() {
  const role = useQueryParam('role')
  const workerId = useQueryParam('worker')

  if (role === 'employee') return <EmployeeDashboard workerId={workerId} />
  return <AdminDashboard />
}
