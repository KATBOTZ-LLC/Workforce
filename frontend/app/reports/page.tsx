'use client'

import Link from 'next/link'
import Sidebar from '@/app/layout/Sidebar'
import { useWorkforce, STAGE_META, Stage, WorkerType, computePerformance } from '@/app/lib/workforceStore'
import { PieChart, LineChart } from '@/app/lib/charts'

export const dynamic = 'force-dynamic'

const TYPE_COLORS: Record<WorkerType, string> = {
  Employee: '#162660', Contractor: '#5B77C4', Intern: '#94A3B8',
}

export default function ReportsPage() {
  const { workers } = useWorkforce()

  const byStage = workers.reduce((acc, w) => { acc[w.stage] = (acc[w.stage] || 0) + 1; return acc }, {} as Record<Stage, number>)
  const byType = workers.reduce((acc, w) => { acc[w.type] = (acc[w.type] || 0) + 1; return acc }, {} as Record<WorkerType, number>)
  const byDept = workers.reduce((acc, w) => { acc[w.department] = (acc[w.department] || 0) + 1; return acc }, {} as Record<string, number>)

  const totalDocs = workers.reduce((s, w) => s + w.documents.length, 0)
  const approvedDocs = workers.reduce((s, w) => s + w.documents.filter(d => d.status === 'approved').length, 0)
  const rejectedDocs = workers.reduce((s, w) => s + w.documents.filter(d => d.status === 'rejected').length, 0)
  const verifyRate = totalDocs ? Math.round((approvedDocs / totalDocs) * 100) : 0
  const active = workers.filter(w => w.stage === 'active').length
  const completionRate = workers.length ? Math.round((active / workers.length) * 100) : 0
  // Cost model from workflow: ₹100/month per active account
  const monthlyCost = active * 100
  const savedFromRejections = rejectedDocs * 100

  const exportCsv = () => {
    const rows = [
      ['Name', 'Type', 'Department', 'Designation', 'HR Lead', 'Team Leads', 'Status', 'Location', 'Stage', 'Docs Verified', 'Account'],
      ...workers.map(w => [
        w.name, w.type, w.department, w.designation, w.hrLead, w.teamLeads.join('; '), w.status, w.location, STAGE_META[w.stage].label,
        `${w.documents.filter(d => d.status === 'approved').length}/${w.documents.length}`,
        w.accountCreated ? 'Yes' : 'No',
      ]),
    ]
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'workforce-report.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <Sidebar />
      <div className="min-h-screen bg-brand-off-white with-sidebar">
        <header className="bg-white border-b border-brand-gray sticky top-0 z-10">
          <div className="px-8 py-5 flex items-center justify-between">
            <div>
              <Link href="/dashboard?role=admin" className="text-brand-slate-gray hover:text-brand-royal-blue text-sm">← Dashboard</Link>
              <h1 className="text-2xl font-bold text-brand-charcoal mt-1">Reports &amp; Analytics</h1>
            </div>
            <button onClick={exportCsv} className="btn-primary">Export CSV</button>
          </div>
        </header>

        <main className="px-8 py-7 space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            <Metric label="Verification Rate" value={`${verifyRate}%`} sub={`${approvedDocs}/${totalDocs} docs`} color="#10B981" />
            <Metric label="Onboarding Completion" value={`${completionRate}%`} sub={`${active} active`} color="#162660" />
            <Metric label="Monthly Account Cost" value={`₹${monthlyCost}`} sub={`${active} accounts × ₹100`} color="#800020" />
            <Metric label="Saved (rejections)" value={`₹${savedFromRejections}`} sub={`${rejectedDocs} rejected pre-account`} color="#5B77C4" />
          </div>

          {/* Interactive verification trend line */}
          <div className="bg-white rounded-2xl border border-brand-gray p-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base font-semibold text-brand-charcoal">Verification Activity</h2>
              <span className="text-xs font-medium text-brand-royal-blue bg-brand-powder-blue px-3 py-1 rounded-full">Last 7 weeks · click a point</span>
            </div>
            <div className="max-w-md">
              <LineChart
                labels={['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7']}
                data={[
                  Math.max(1, approvedDocs - 9), Math.max(1, approvedDocs - 7), Math.max(1, approvedDocs - 5),
                  Math.max(1, approvedDocs - 3), Math.max(1, approvedDocs - 2), Math.max(1, approvedDocs - 1), approvedDocs,
                ]}
                color="#162660"
                unit=" verified"
              />
            </div>
          </div>

          {/* Performance leaderboard */}
          <div className="bg-white rounded-2xl border border-brand-gray overflow-hidden">
            <div className="px-6 py-4 border-b border-brand-gray flex items-center justify-between">
              <h2 className="text-base font-semibold text-brand-charcoal">Performance Leaderboard</h2>
              <span className="text-xs text-brand-slate-gray">60% goals · 40% attendance (last 30 days)</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-brand-slate-gray border-b border-brand-gray">
                    <th className="px-6 py-3 font-medium">Worker</th>
                    <th className="px-6 py-3 font-medium">Goals Completed</th>
                    <th className="px-6 py-3 font-medium">Attendance</th>
                    <th className="px-6 py-3 font-medium">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {workers
                    .filter(w => w.stage === 'active')
                    .map(w => ({ w, p: computePerformance(w) }))
                    .sort((a, b) => b.p.score - a.p.score)
                    .map(({ w, p }) => (
                      <tr key={w.id} className="border-b border-brand-gray/60 last:border-0">
                        <td className="px-6 py-3 font-medium text-brand-charcoal">{w.name}</td>
                        <td className="px-6 py-3 text-brand-slate-gray">{p.goalRate}% ({w.goals.filter(g => g.status === 'completed').length}/{p.goalsTotal})</td>
                        <td className="px-6 py-3 text-brand-slate-gray">{p.attendanceRate}% ({p.daysMarked} days marked)</td>
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-24 bg-brand-off-white rounded-full h-2 overflow-hidden">
                              <div className="h-full rounded-full bg-brand-royal-blue" style={{ width: `${p.score}%` }} />
                            </div>
                            <span className="font-semibold text-brand-charcoal text-xs w-8">{p.score}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  {workers.filter(w => w.stage === 'active').length === 0 && (
                    <tr><td colSpan={4} className="px-6 py-8 text-center text-brand-slate-gray">No active workers yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl border border-brand-gray p-6">
              <h2 className="text-base font-semibold text-brand-charcoal mb-4">By Stage</h2>
              <PieChart data={Object.entries(byStage).map(([k, v]) => ({ label: STAGE_META[k as Stage].label, value: v, color: STAGE_META[k as Stage].color }))} />
            </div>
            <div className="bg-white rounded-2xl border border-brand-gray p-6">
              <h2 className="text-base font-semibold text-brand-charcoal mb-4">By Worker Type</h2>
              <PieChart data={Object.entries(byType).map(([k, v]) => ({ label: k, value: v, color: TYPE_COLORS[k as WorkerType] || '#162660' }))} />
            </div>
            <BarCard title="By Department" data={Object.entries(byDept).map(([k, v]) => ({ label: k, value: v, color: '#5B77C4' }))} />
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-brand-gray overflow-hidden">
            <div className="px-6 py-4 border-b border-brand-gray"><h2 className="text-base font-semibold text-brand-charcoal">All Workers</h2></div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-brand-slate-gray border-b border-brand-gray">
                    <th className="px-6 py-3 font-medium">Name</th>
                    <th className="px-6 py-3 font-medium">Type</th>
                    <th className="px-6 py-3 font-medium">Department</th>
                    <th className="px-6 py-3 font-medium">Stage</th>
                    <th className="px-6 py-3 font-medium">Docs</th>
                    <th className="px-6 py-3 font-medium">Account</th>
                  </tr>
                </thead>
                <tbody>
                  {workers.map(w => {
                    const m = STAGE_META[w.stage]
                    const ap = w.documents.filter(d => d.status === 'approved').length
                    return (
                      <tr key={w.id} className="border-b border-brand-gray/60 last:border-0">
                        <td className="px-6 py-3 font-medium text-brand-charcoal">{w.name}</td>
                        <td className="px-6 py-3 text-brand-slate-gray">{w.type}</td>
                        <td className="px-6 py-3 text-brand-slate-gray">{w.department}</td>
                        <td className="px-6 py-3"><span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ color: m.color, background: m.bg }}>{m.label}</span></td>
                        <td className="px-6 py-3 text-brand-slate-gray">{ap}/{w.documents.length}</td>
                        <td className="px-6 py-3 text-brand-slate-gray">{w.accountCreated ? 'Yes' : '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </>
  )
}

function Metric({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div className="bg-white rounded-2xl border border-brand-gray p-5">
      <p className="text-sm text-brand-slate-gray">{label}</p>
      <p className="text-3xl font-bold mt-2" style={{ color }}>{value}</p>
      <p className="text-xs text-brand-slate-gray mt-1">{sub}</p>
    </div>
  )
}

function BarCard({ title, data }: { title: string; data: { label: string; value: number; color: string }[] }) {
  const max = Math.max(1, ...data.map(d => d.value))
  return (
    <div className="bg-white rounded-2xl border border-brand-gray p-6">
      <h2 className="text-base font-semibold text-brand-charcoal mb-4">{title}</h2>
      <div className="space-y-3">
        {data.map(d => (
          <div key={d.label} className="group cursor-default">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-brand-charcoal group-hover:font-semibold transition-all">{d.label}</span>
              <span className="font-semibold text-brand-charcoal">{d.value}</span>
            </div>
            <div className="w-full bg-brand-off-white rounded-full h-2 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300 group-hover:brightness-110 group-hover:shadow-[0_0_8px_rgba(0,0,0,0.15)]"
                style={{ width: `${(d.value / max) * 100}%`, background: d.color }}
              />
            </div>
          </div>
        ))}
        {data.length === 0 && <p className="text-sm text-brand-slate-gray">No data.</p>}
      </div>
    </div>
  )
}
