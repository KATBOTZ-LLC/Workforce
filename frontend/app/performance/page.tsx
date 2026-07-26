'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Sidebar from '@/app/layout/Sidebar'
import {
  useWorkforce, computePerformance, performanceTrend, getPerfWeights, Worker, Review, FeedbackNote,
  ReviewPeriod, REVIEW_PERIODS, fmtHours, fmtDateTime,
} from '@/app/lib/workforceStore'
import { useQueryParam } from '@/app/lib/useQueryParam'

export const dynamic = 'force-dynamic'

const LEADS = ['Ananya Rao', 'Ravi Shah', 'Priya Nair', 'Karan Singh']

export default function PerformancePage() {
  const role = useQueryParam('role')
  const workerId = useQueryParam('worker')
  if (role === 'employee') return <MyPerformance workerId={workerId} />
  return <AdminPerformance />
}

/* ---------- shared scorecard ---------- */
function scoreColor(v: number) { return v >= 75 ? '#0F7A46' : v >= 50 ? '#B45309' : '#800020' }

function Scorecard({ worker }: { worker: Worker }) {
  const perf = computePerformance(worker)
  const trend = performanceTrend(worker)
  const wt = getPerfWeights()
  const latestRating = worker.reviews[0]?.rating
  const bars = [
    { label: 'Reviews', value: perf.reviewRate, has: perf.hasReview, sub: perf.hasReview ? `latest ${latestRating}★` : 'no reviews', w: wt.reviews },
    { label: 'Goals completed', value: perf.goalRate, has: perf.goalsTotal > 0, sub: `${perf.goalsTotal} goals`, w: wt.goals },
    { label: 'Attendance', value: perf.attendanceRate, has: perf.daysMarked > 0, sub: `${perf.daysMarked} days marked`, w: wt.attendance },
    { label: 'Hours logged', value: perf.hoursRate, has: perf.daysWorked > 0, sub: perf.daysWorked ? `${fmtHours(perf.avgDailyHours)}/day avg` : 'no time data', w: wt.hours },
  ]
  const R = 52, C = 2 * Math.PI * R
  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      {/* score ring */}
      <div className="relative flex-shrink-0">
        <svg viewBox="0 0 130 130" className="w-32 h-32 -rotate-90">
          <circle cx="65" cy="65" r={R} fill="none" stroke="#F1F5F9" strokeWidth="12" />
          <circle cx="65" cy="65" r={R} fill="none" stroke={scoreColor(perf.score)} strokeWidth="12" strokeLinecap="round"
            strokeDasharray={`${(perf.score / 100) * C} ${C}`} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold" style={{ color: scoreColor(perf.score) }}>{perf.score}</span>
          <span className="text-[10px] text-brand-slate-gray">/ 100</span>
          {trend !== 0 && (
            <span className={`text-[10px] font-semibold mt-0.5 ${trend > 0 ? 'text-emerald-600' : 'text-brand-burgundy'}`}>
              {trend > 0 ? '▲' : '▼'} {Math.abs(trend)}
            </span>
          )}
        </div>
      </div>
      {/* sub-metrics */}
      <div className="flex-1 w-full space-y-3">
        {bars.map(b => (
          <div key={b.label}>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-brand-charcoal">{b.label} <span className="text-xs text-brand-slate-gray">· {b.sub} · {b.w}%</span></span>
              <span className="font-semibold text-brand-charcoal">{b.has ? `${b.value}%` : '—'}</span>
            </div>
            <div className="w-full bg-brand-off-white rounded-full h-2 overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${b.has ? b.value : 0}%`, background: b.has ? scoreColor(b.value) : '#CBD5E1' }} />
            </div>
          </div>
        ))}
        <p className="text-xs text-brand-slate-gray pt-1">Weighted score over the last 30 days · trend vs the previous week. Weights configurable in Settings.</p>
      </div>
    </div>
  )
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <svg key={i} viewBox="0 0 24 24" className="w-4 h-4" fill={i <= rating ? '#F59E0B' : 'none'} stroke={i <= rating ? '#F59E0B' : '#CBD5E1'} strokeWidth="1.5">
          <path d="M12 2l3 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.9 21l1.2-6.8-5-4.9 6.9-1z" />
        </svg>
      ))}
    </span>
  )
}

function ReviewList({ reviews }: { reviews: Review[] }) {
  if (reviews.length === 0) return <p className="text-sm text-brand-slate-gray py-4 text-center">No reviews yet.</p>
  return (
    <div className="space-y-3">
      {reviews.map(r => (
        <div key={r.id} className="p-4 rounded-xl border border-brand-gray">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-brand-powder-blue text-brand-royal-blue">{r.period}</span>
              <Stars rating={r.rating} />
            </div>
            <span className="text-xs text-brand-slate-gray">{r.reviewer} · {fmtDateTime(r.createdAt)}</span>
          </div>
          <p className="text-sm text-brand-charcoal mt-2">{r.feedback}</p>
        </div>
      ))}
    </div>
  )
}

function FeedbackList({ notes }: { notes: FeedbackNote[] }) {
  if (notes.length === 0) return <p className="text-sm text-brand-slate-gray py-4 text-center">No feedback notes yet.</p>
  return (
    <div className="relative pl-6">
      <span className="absolute left-2 top-1 bottom-1 w-px bg-brand-gray" />
      {notes.map(n => (
        <div key={n.id} className="relative pb-5 last:pb-0">
          <span className="absolute -left-[18px] top-1 w-3 h-3 rounded-full ring-4 ring-white bg-brand-royal-blue" />
          <p className="text-sm text-brand-charcoal">{n.text}</p>
          <p className="text-xs text-brand-slate-gray mt-0.5">{n.author} · {fmtDateTime(n.createdAt)}</p>
        </div>
      ))}
    </div>
  )
}

/* ================= Employee: my performance (read-only) ================= */
function MyPerformance({ workerId }: { workerId: string | null }) {
  const { workers } = useWorkforce()
  const me = workerId ? workers.find(w => w.id === workerId) : undefined

  return (
    <>
      <Sidebar />
      <div className="min-h-screen bg-brand-off-white with-sidebar">
        <header className="bg-white border-b border-brand-gray sticky top-0 z-10">
          <div className="px-8 py-5">
            <Link href={`/dashboard?role=employee&worker=${workerId || ''}`} className="text-brand-slate-gray hover:text-brand-royal-blue text-sm">← Dashboard</Link>
            <h1 className="text-2xl font-bold text-brand-charcoal mt-1">My Performance</h1>
          </div>
        </header>
        <main className="px-8 py-7">
          {!me && <div className="bg-white rounded-2xl border border-brand-gray p-10 text-center text-brand-slate-gray">No worker signed in.</div>}
          {me && (
            <div className="max-w-3xl space-y-6">
              <div className="bg-white rounded-2xl border border-brand-gray p-6">
                <h2 className="text-base font-semibold text-brand-charcoal mb-5">Scorecard</h2>
                <Scorecard worker={me} />
              </div>
              <div className="bg-white rounded-2xl border border-brand-gray p-6">
                <h2 className="text-base font-semibold text-brand-charcoal mb-4">Reviews</h2>
                <ReviewList reviews={me.reviews} />
              </div>
              <div className="bg-white rounded-2xl border border-brand-gray p-6">
                <h2 className="text-base font-semibold text-brand-charcoal mb-4">Feedback &amp; 1:1 Notes</h2>
                <FeedbackList notes={me.feedback} />
              </div>
              <GoogleFormCard admin={false} />
            </div>
          )}
        </main>
      </div>
    </>
  )
}

/* ================= Admin: manage performance ================= */
function AdminPerformance() {
  const preselect = useQueryParam('worker')
  const { workers, addReview, addFeedback } = useWorkforce()
  const roster = workers.filter(w => w.stage === 'active')
  const [selectedId, setSelectedId] = useState<string>(preselect || roster[0]?.id || '')
  const selected = workers.find(w => w.id === selectedId) || roster[0] || null

  const [period, setPeriod] = useState<ReviewPeriod>('30-day')
  const [rating, setRating] = useState(4)
  const [feedback, setFeedback] = useState('')
  const [reviewer, setReviewer] = useState(LEADS[0])
  const [note, setNote] = useState('')

  const submitReview = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selected || !feedback.trim()) return
    addReview(selected.id, period, rating, feedback.trim(), reviewer)
    setFeedback('')
  }
  const submitNote = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selected || !note.trim()) return
    addFeedback(selected.id, note.trim(), reviewer)
    setNote('')
  }

  return (
    <>
      <Sidebar />
      <div className="min-h-screen bg-brand-off-white with-sidebar">
        <header className="bg-white border-b border-brand-gray sticky top-0 z-10">
          <div className="px-8 py-5">
            <Link href="/dashboard?role=admin" className="text-brand-slate-gray hover:text-brand-royal-blue text-sm">← Dashboard</Link>
            <h1 className="text-2xl font-bold text-brand-charcoal mt-1">Performance</h1>
          </div>
        </header>

        <main className="px-8 py-7">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Roster with scores */}
            <div className="bg-white rounded-2xl border border-brand-gray p-4 h-fit">
              <h2 className="text-sm font-semibold text-brand-slate-gray px-2 mb-2">Team ({roster.length})</h2>
              <div className="space-y-1">
                {roster
                  .map(w => ({ w, p: computePerformance(w) }))
                  .sort((a, b) => b.p.score - a.p.score)
                  .map(({ w, p }) => (
                    <button key={w.id} onClick={() => setSelectedId(w.id)}
                      className={`w-full text-left px-3 py-2.5 rounded-xl transition flex items-center justify-between gap-2 ${selectedId === w.id ? 'bg-brand-powder-blue' : 'hover:bg-brand-off-white'}`}>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-brand-charcoal truncate">{w.name}</p>
                        <p className="text-xs text-brand-slate-gray truncate">{w.designation}</p>
                      </div>
                      <span className="text-sm font-bold flex-shrink-0" style={{ color: scoreColor(p.score) }}>{p.score}</span>
                    </button>
                  ))}
                {roster.length === 0 && <p className="text-sm text-brand-slate-gray px-2 py-6 text-center">No active employees.</p>}
              </div>
            </div>

            {/* Detail */}
            <div className="lg:col-span-2 space-y-6">
              {!selected && <div className="bg-white rounded-2xl border border-brand-gray p-10 text-center text-brand-slate-gray">Select an employee.</div>}
              {selected && (
                <>
                  <div className="bg-white rounded-2xl border border-brand-gray p-6">
                    <div className="flex items-center justify-between mb-5">
                      <div>
                        <h2 className="text-lg font-bold text-brand-charcoal">{selected.name}</h2>
                        <p className="text-sm text-brand-slate-gray">{selected.designation} · {selected.department}</p>
                      </div>
                    </div>
                    <Scorecard worker={selected} />
                  </div>

                  {/* Reviews */}
                  <div className="bg-white rounded-2xl border border-brand-gray p-6">
                    <h2 className="text-base font-semibold text-brand-charcoal mb-4">Reviews</h2>
                    <form onSubmit={submitReview} className="bg-brand-off-white rounded-xl p-4 mb-4 space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <label className="block">
                          <span className="block text-xs font-medium text-brand-charcoal mb-1">Period</span>
                          <select value={period} onChange={e => setPeriod(e.target.value as ReviewPeriod)}>
                            {REVIEW_PERIODS.map(p => <option key={p}>{p}</option>)}
                          </select>
                        </label>
                        <label className="block">
                          <span className="block text-xs font-medium text-brand-charcoal mb-1">Reviewer</span>
                          <select value={reviewer} onChange={e => setReviewer(e.target.value)}>
                            {LEADS.map(l => <option key={l}>{l}</option>)}
                          </select>
                        </label>
                        <label className="block">
                          <span className="block text-xs font-medium text-brand-charcoal mb-1">Rating</span>
                          <div className="flex items-center gap-1 h-[42px]">
                            {[1, 2, 3, 4, 5].map(i => (
                              <button key={i} type="button" onClick={() => setRating(i)}>
                                <svg viewBox="0 0 24 24" className="w-6 h-6" fill={i <= rating ? '#F59E0B' : 'none'} stroke={i <= rating ? '#F59E0B' : '#CBD5E1'} strokeWidth="1.5">
                                  <path d="M12 2l3 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.9 21l1.2-6.8-5-4.9 6.9-1z" />
                                </svg>
                              </button>
                            ))}
                          </div>
                        </label>
                      </div>
                      <textarea value={feedback} onChange={e => setFeedback(e.target.value)} rows={2} placeholder="Written feedback…" className="w-full" />
                      <div className="flex justify-end">
                        <button type="submit" className="btn-primary text-sm">Add Review</button>
                      </div>
                    </form>
                    <ReviewList reviews={selected.reviews} />
                  </div>

                  {/* Feedback / 1:1 */}
                  <div className="bg-white rounded-2xl border border-brand-gray p-6">
                    <h2 className="text-base font-semibold text-brand-charcoal mb-4">Feedback &amp; 1:1 Notes</h2>
                    <form onSubmit={submitNote} className="flex gap-2 mb-4">
                      <input value={note} onChange={e => setNote(e.target.value)} placeholder="Log a 1:1 or feedback note…" className="flex-1" />
                      <button type="submit" className="btn-primary text-sm whitespace-nowrap">Add Note</button>
                    </form>
                    <FeedbackList notes={selected.feedback} />
                  </div>
                  <GoogleFormCard admin={true} />
                </>
              )}
            </div>
          </div>
        </main>
      </div>
    </>
  )
}

/* ================= Attached Google Form (reviews / feedback) ================= */
const PERF_FORM_KEY = 'wop-perf-form-url'
function toEmbed(url: string): string {
  const u = url.trim()
  if (!u) return ''
  if (u.includes('embedded=true')) return u
  return u + (u.includes('?') ? '&' : '?') + 'embedded=true'
}
function GoogleFormCard({ admin }: { admin: boolean }) {
  const [url, setUrl] = useState('')
  const [draft, setDraft] = useState('')
  const [saved, setSaved] = useState(false)
  useEffect(() => {
    try { const v = localStorage.getItem(PERF_FORM_KEY) || ''; setUrl(v); setDraft(v) } catch { /* ignore */ }
  }, [])
  const save = () => {
    const v = draft.trim()
    try { localStorage.setItem(PERF_FORM_KEY, v) } catch { /* ignore */ }
    setUrl(v); setSaved(true); setTimeout(() => setSaved(false), 1600)
  }
  return (
    <div className="bg-white rounded-2xl border border-brand-gray p-6">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
        <h2 className="text-base font-semibold text-brand-charcoal">Review / Feedback Form</h2>
        {url && <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm text-brand-royal-blue hover:underline">Open in new tab →</a>}
      </div>
      {admin && (
        <div className="flex items-center gap-2 mb-4">
          <input value={draft} onChange={e => setDraft(e.target.value)} placeholder="Paste a Google Form link (…/viewform)" className="flex-1 text-sm" />
          <button onClick={save} className="btn-primary text-sm whitespace-nowrap">Attach</button>
          {saved && <span className="text-sm text-emerald-600 font-medium">Saved ✓</span>}
        </div>
      )}
      {url ? (
        <div className="rounded-xl overflow-hidden border border-brand-gray">
          <iframe src={toEmbed(url)} title="Performance form" className="w-full" style={{ height: 520 }} />
        </div>
      ) : (
        <p className="text-sm text-brand-slate-gray py-6 text-center">
          {admin ? 'No form attached yet. Paste a Google Form link above to embed it here for the team.' : 'No review form has been shared yet.'}
        </p>
      )}
    </div>
  )
}
