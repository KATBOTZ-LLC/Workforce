'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Sidebar from '@/app/layout/Sidebar'
import {
  useWorkforce, computePerformance, performanceTrend, getPerfWeights, Worker, FeedbackNote,
  fmtHours, fmtDateTime,
  MonthlyReview, ReviewStage, REVIEW_STAGES, REVIEW_STAGE_META,
  currentMonth, monthLabel, reviewStageIndex, bonusEligible, monthlyReviewFor,
} from '@/app/lib/workforceStore'
import { useQueryParam } from '@/app/lib/useQueryParam'

export const dynamic = 'force-dynamic'

/** Display name of a worker's first team lead, resolved from ids. */
function tlName(w: Worker, all: Worker[]) {
  const id = w.teamLeadIds[0]
  return id ? all.find(x => x.id === id)?.name || '' : ''
}

export default function PerformancePage() {
  const role = useQueryParam('role')
  const workerId = useQueryParam('worker')
  if (role === 'employee') return <MyPerformance workerId={workerId} />
  return <AdminPerformance />
}

/* ---------- shared scorecard ---------- */
function scoreColor(v: number) { return v >= 75 ? '#0F7A46' : v >= 50 ? '#B45309' : '#800020' }

function Scorecard({ worker }: { worker: Worker }) {
  const { monthlyReviews } = useWorkforce()
  const perf = computePerformance(worker, monthlyReviews)
  const trend = performanceTrend(worker)
  const wt = getPerfWeights()
  const bars = [
    { label: 'Reviews', value: perf.reviewRate, has: perf.hasReview, sub: perf.hasReview ? `${perf.reviewAvg.toFixed(1)}★ avg · ${perf.reviewCount} this yr` : 'no ratings yet', w: wt.reviews },
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

/* ================= Monthly performance review workflow ================= */
const PERF_FORM_KEY = 'wop-perf-form-url'
// Responder (/viewform) link, not the /edit authoring link — employees only need to fill it in.
const DEFAULT_FORM_URL = 'https://docs.google.com/forms/d/1saMU4qv2NfBgLdIpxOa9v9c6TRVFX-1vo0-Vl0DwWR4/viewform'
function useFormUrl() {
  const [url, setUrl] = useState(DEFAULT_FORM_URL)
  useEffect(() => { try { setUrl(localStorage.getItem(PERF_FORM_KEY) || DEFAULT_FORM_URL) } catch { /* ignore */ } }, [])
  return url
}

function StarInput({ value, onChange, size = 6 }: { value: number; onChange: (n: number) => void; size?: number }) {
  const px = size * 4 // Tailwind w-6 = 24px; keep sizing static via inline style
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map(i => (
        <button key={i} type="button" onClick={() => onChange(i)} className="transition hover:scale-110">
          <svg viewBox="0 0 24 24" style={{ width: px, height: px }} fill={i <= value ? '#F59E0B' : 'none'} stroke={i <= value ? '#F59E0B' : '#CBD5E1'} strokeWidth="1.5">
            <path d="M12 2l3 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.9 21l1.2-6.8-5-4.9 6.9-1z" />
          </svg>
        </button>
      ))}
    </div>
  )
}

function StageTracker({ stage }: { stage: ReviewStage }) {
  const cur = reviewStageIndex(stage)
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {REVIEW_STAGES.map((s, i) => {
        const done = i <= cur
        const m = REVIEW_STAGE_META[s]
        return (
          <div key={s} className="flex items-center gap-1">
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={done ? { color: m.color, background: m.bg } : { color: '#94A3B8', background: '#F8FAFC' }}>
              {i === REVIEW_STAGES.length - 1 && stage === 'finalized' ? 'Finalized' : m.label}
            </span>
            {i < REVIEW_STAGES.length - 1 && <span className={`text-[10px] ${done ? 'text-brand-slate-gray' : 'text-brand-gray'}`}>›</span>}
          </div>
        )
      })}
    </div>
  )
}

function RatingCell({ label, rating, by, feedback }: { label: string; rating?: number; by?: string; feedback?: string }) {
  return (
    <div className="flex-1 min-w-[120px] p-3 rounded-xl border border-brand-gray">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-slate-gray mb-1">{label}</p>
      {rating != null ? (
        <>
          <Stars rating={rating} />
          {by && <p className="text-[11px] text-brand-slate-gray mt-1">{by}</p>}
          {feedback && <p className="text-xs text-brand-charcoal mt-1">{feedback}</p>}
        </>
      ) : <p className="text-xs text-brand-slate-gray">Awaiting…</p>}
    </div>
  )
}

function ReviewTrend({ reviews }: { reviews: MonthlyReview[] }) {
  const finalized = reviews.filter(r => r.selfRating != null).sort((a, b) => a.month.localeCompare(b.month)).slice(-6)
  if (finalized.length === 0) return null
  const managerAvg = (r: MonthlyReview) => {
    const vals = [r.tlRating, r.hrRating].filter((v): v is number => v != null)
    return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null
  }
  return (
    <div>
      <div className="flex items-end gap-3 h-28">
        {finalized.map(r => {
          const mgr = managerAvg(r)
          return (
            <div key={r.id} className="flex-1 flex flex-col items-center gap-1">
              <div className="flex items-end gap-1 h-20 w-full justify-center">
                <div className="w-3 rounded-t bg-brand-royal-blue" style={{ height: `${((r.selfRating || 0) / 5) * 100}%` }} title={`Self ${r.selfRating}`} />
                {mgr != null && <div className="w-3 rounded-t bg-emerald-500" style={{ height: `${(mgr / 5) * 100}%` }} title={`Manager ${mgr.toFixed(1)}`} />}
              </div>
              <span className="text-[10px] text-brand-slate-gray">{monthLabel(r.month).split(' ')[0].slice(0, 3)}</span>
            </div>
          )
        })}
      </div>
      <div className="flex items-center gap-4 mt-2 text-[11px] text-brand-slate-gray">
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-brand-royal-blue" /> Self</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> Manager avg</span>
      </div>
    </div>
  )
}

/** One month's review — display for everyone; TL/HR action forms shown only when admin. */
function MonthlyReviewCard({ review, worker, admin }: { review: MonthlyReview; worker: Worker; admin: boolean }) {
  const { workers, teamLeadReview, hrReview, finalizeReview, approveBonus } = useWorkforce()
  const formUrl = useFormUrl()
  const [tlRating, setTlRating] = useState(review.tlRating || 4)
  const [tlFeedback, setTlFeedback] = useState('')
  const [hrRating, setHrRating] = useState(review.hrRating || 4)
  const [hrFeedback, setHrFeedback] = useState('')
  const eligible = bonusEligible(review)

  return (
    <div className="p-4 rounded-xl border border-brand-gray space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="font-semibold text-brand-charcoal">{monthLabel(review.month)}</p>
        <div className="flex items-center gap-2 flex-wrap">
          {eligible && (
            <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
              Bonus {review.bonusApproved ? 'Approved' : 'Eligible'}
            </span>
          )}
          {admin && (
            <a href={formUrl} target="_blank" rel="noopener noreferrer" title="Open the submitted review form" className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-brand-gray text-brand-royal-blue hover:bg-brand-off-white transition">
              View Form ↗
            </a>
          )}
          {admin && (review.stage === 'finalized'
            ? <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Approved ✓</span>
            : <button onClick={() => finalizeReview(review.id, worker.hrLead)} className="text-xs font-semibold px-3 py-1 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition">Approve Performance</button>)}
        </div>
      </div>
      <StageTracker stage={review.stage} />
      <div className="flex flex-wrap gap-2">
        <RatingCell label="Self" rating={review.selfRating} feedback={review.selfComment} />
        <RatingCell label="Team Lead" rating={review.tlRating} by={review.tlBy} feedback={review.tlFeedback} />
        <RatingCell label="HR" rating={review.hrRating} by={review.hrBy} feedback={review.hrFeedback} />
      </div>

      {admin && review.stage !== 'pending' && (
        <div className="space-y-2 pt-1">
          {/* Team Lead review */}
          {review.tlRating == null && (
            <div className="p-3 rounded-xl bg-brand-off-white space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-xs font-semibold text-brand-charcoal">Team Lead review — {tlName(worker, workers) || 'Team Lead'}</span>
                <StarInput value={tlRating} onChange={setTlRating} size={5} />
              </div>
              <textarea value={tlFeedback} onChange={e => setTlFeedback(e.target.value)} rows={2} placeholder="Team lead feedback…" className="w-full text-sm" />
              <div className="flex justify-end">
                <button onClick={() => teamLeadReview(review.id, tlRating, tlFeedback.trim(), tlName(worker, workers) || 'Team Lead')} className="btn-primary text-sm">Submit Team Lead Review</button>
              </div>
            </div>
          )}
          {/* HR review — after TL */}
          {review.tlRating != null && review.hrRating == null && (
            <div className="p-3 rounded-xl bg-brand-off-white space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-xs font-semibold text-brand-charcoal">HR review — {worker.hrLead}</span>
                <StarInput value={hrRating} onChange={setHrRating} size={5} />
              </div>
              <textarea value={hrFeedback} onChange={e => setHrFeedback(e.target.value)} rows={2} placeholder="HR feedback…" className="w-full text-sm" />
              <div className="flex justify-end">
                <button onClick={() => hrReview(review.id, hrRating, hrFeedback.trim(), worker.hrLead)} className="btn-primary text-sm">Submit HR Review</button>
              </div>
            </div>
          )}
          {/* Bonus approval */}
          {review.hrRating != null && eligible && !review.bonusApproved && (
            <div className="flex items-center justify-end gap-2 flex-wrap">
              <button onClick={() => approveBonus(review.id, worker.hrLead)} className="text-sm px-4 py-2 rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition font-semibold">Approve Bonus ★</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/** In-app monthly review form (used when no external Google Form is attached). Always opens. */
function ReviewFormModal({ worker, month, onClose }: { worker: Worker; month: string; onClose: () => void }) {
  const { submitSelfReview } = useWorkforce()
  const [rating, setRating] = useState(4)
  const [wins, setWins] = useState('')
  const [challenges, setChallenges] = useState('')
  const [goals, setGoals] = useState('')

  const submit = () => {
    const comment = [
      wins.trim() && `Wins: ${wins.trim()}`,
      challenges.trim() && `Challenges: ${challenges.trim()}`,
      goals.trim() && `Next month: ${goals.trim()}`,
    ].filter(Boolean).join(' · ')
    submitSelfReview(worker.id, month, rating, comment)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-brand-charcoal/40 backdrop-blur-sm" />
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl animate-scale-in" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-brand-royal-blue text-white px-6 py-4 rounded-t-2xl flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold">Monthly Performance Review</h2>
            <p className="text-xs text-white/70">{worker.name} · {monthLabel(month)}</p>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white text-2xl leading-none">×</button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <span className="block text-sm font-medium text-brand-charcoal mb-1.5">Overall self-rating</span>
            <StarInput value={rating} onChange={setRating} />
          </div>
          <label className="block"><span className="block text-sm font-medium text-brand-charcoal mb-1.5">Key accomplishments this month</span>
            <textarea value={wins} onChange={e => setWins(e.target.value)} rows={2} placeholder="What went well…" className="w-full text-sm" /></label>
          <label className="block"><span className="block text-sm font-medium text-brand-charcoal mb-1.5">Challenges / blockers</span>
            <textarea value={challenges} onChange={e => setChallenges(e.target.value)} rows={2} placeholder="What was hard…" className="w-full text-sm" /></label>
          <label className="block"><span className="block text-sm font-medium text-brand-charcoal mb-1.5">Goals for next month</span>
            <textarea value={goals} onChange={e => setGoals(e.target.value)} rows={2} placeholder="What you'll focus on…" className="w-full text-sm" /></label>
          <div className="flex justify-end gap-2 pt-1">
            <button onClick={onClose} className="btn-ghost text-sm">Cancel</button>
            <button onClick={submit} className="btn-primary text-sm">Submit Review</button>
          </div>
        </div>
      </div>
    </div>
  )
}

/** The self-submit action + current-month state for the employee. */
function SelfReviewAction({ worker }: { worker: Worker }) {
  const { monthlyReviews } = useWorkforce()
  const formUrl = useFormUrl()
  const cm = currentMonth()
  const review = monthlyReviewFor(monthlyReviews, worker.id, cm)
  const [showForm, setShowForm] = useState(false)

  if (review && review.selfRating != null) {
    return <MonthlyReviewCard review={review} worker={worker} admin={false} />
  }
  return (
    <div className="p-4 rounded-xl border-2 border-dashed border-brand-royal-blue/40 bg-brand-powder-blue/20 space-y-3">
      <div>
        <p className="font-semibold text-brand-charcoal">Your {monthLabel(cm)} performance review is due</p>
        <p className="text-sm text-brand-slate-gray mt-0.5">Complete and submit the review form. Your Team Lead and HR will add their ratings after.</p>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={() => setShowForm(true)} className="btn-primary text-sm">Complete Review Form →</button>
        {formUrl && <a href={formUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-brand-royal-blue hover:underline">Open the attached Google Form ↗</a>}
      </div>
      {showForm && <ReviewFormModal worker={worker} month={cm} onClose={() => setShowForm(false)} />}
    </div>
  )
}

/** Admin view when the employee hasn't submitted yet — a simple line + Send Review Form. */
function PendingReviewLine({ worker, month }: { worker: Worker; month: string }) {
  const formUrl = useFormUrl()
  const [sent, setSent] = useState(false)
  const send = () => {
    try { navigator.clipboard?.writeText(formUrl) } catch { /* ignore */ }
    window.open(formUrl, '_blank', 'noopener')
    setSent(true); setTimeout(() => setSent(false), 2000)
  }
  return (
    <div className="p-4 rounded-xl border border-dashed border-brand-gray flex items-center justify-between gap-3 flex-wrap">
      <p className="text-sm text-brand-slate-gray">
        <span className="font-medium text-brand-charcoal">Not submitted</span> — {worker.name} hasn&apos;t completed their {monthLabel(month)} self-review yet.
      </p>
      <button onClick={send} className="btn-primary text-sm whitespace-nowrap">{sent ? 'Link sent ✓' : 'Send Review Form ↗'}</button>
    </div>
  )
}

function MonthlyReviewPanel({ worker, admin }: { worker: Worker; admin: boolean }) {
  const { monthlyReviews } = useWorkforce()
  const mine = monthlyReviews.filter(r => r.workerId === worker.id).sort((a, b) => b.month.localeCompare(a.month))
  const cm = currentMonth()
  const current = mine.find(r => r.month === cm)
  const history = mine.filter(r => r.month !== cm)

  return (
    <div className="bg-white rounded-2xl border border-brand-gray p-6 space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-base font-semibold text-brand-charcoal">Monthly Performance Review</h2>
        <span className="text-xs text-brand-slate-gray">Self · Team Lead · HR ratings</span>
      </div>

      {/* current month */}
      {admin
        ? (current && current.selfRating != null
            ? <MonthlyReviewCard review={current} worker={worker} admin />
            : <PendingReviewLine worker={worker} month={cm} />)
        : <SelfReviewAction worker={worker} />}

      {/* trend */}
      {mine.some(r => r.selfRating != null) && (
        <div className="pt-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-slate-gray mb-2">Trend</p>
          <ReviewTrend reviews={mine} />
        </div>
      )}

      {/* history */}
      {history.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-slate-gray mb-2">History</p>
          <div className="space-y-3">
            {history.map(r => <MonthlyReviewCard key={r.id} review={r} worker={worker} admin={admin} />)}
          </div>
        </div>
      )}
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
              <MonthlyReviewPanel worker={me} admin={false} />
              <div className="bg-white rounded-2xl border border-brand-gray p-6">
                <h2 className="text-base font-semibold text-brand-charcoal mb-5">Scorecard</h2>
                <Scorecard worker={me} />
              </div>
              <div className="bg-white rounded-2xl border border-brand-gray p-6">
                <h2 className="text-base font-semibold text-brand-charcoal mb-4">Feedback &amp; 1:1 Notes</h2>
                <FeedbackList notes={me.feedback} />
              </div>
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
  const { workers, addFeedback, monthlyReviews } = useWorkforce()
  const roster = workers.filter(w => w.stage === 'active')
  const [selectedId, setSelectedId] = useState<string>(preselect || roster[0]?.id || '')
  const selected = workers.find(w => w.id === selectedId) || roster[0] || null

  const [reviewer, setReviewer] = useState(roster[0]?.name || '')
  const [note, setNote] = useState('')

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
                  .map(w => ({ w, p: computePerformance(w, monthlyReviews) }))
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

                  <MonthlyReviewPanel worker={selected} admin />

                  {/* Feedback / 1:1 */}
                  <div className="bg-white rounded-2xl border border-brand-gray p-6">
                    <h2 className="text-base font-semibold text-brand-charcoal mb-4">Feedback &amp; 1:1 Notes</h2>
                    <form onSubmit={submitNote} className="flex gap-2 mb-4">
                      <input value={note} onChange={e => setNote(e.target.value)} placeholder="Log a 1:1 or feedback note…" className="flex-1" />
                      <button type="submit" className="btn-primary text-sm whitespace-nowrap">Add Note</button>
                    </form>
                    <FeedbackList notes={selected.feedback} />
                  </div>
                  <ReviewFormManager />
                </>
              )}
            </div>
          </div>
        </main>
      </div>
    </>
  )
}

/* ================= Connected review form (HR management) ================= */
const PERF_RESP_KEY = 'wop-perf-form-responses'
/** HR-only: attach/connect the Google Form employees fill, and jump to the responses. HR reviews — never fills. */
function ReviewFormManager() {
  const [url, setUrl] = useState(DEFAULT_FORM_URL)
  const [draft, setDraft] = useState(DEFAULT_FORM_URL)
  const [resp, setResp] = useState('')
  const [respDraft, setRespDraft] = useState('')
  const [saved, setSaved] = useState(false)
  useEffect(() => {
    try {
      const v = localStorage.getItem(PERF_FORM_KEY) || DEFAULT_FORM_URL; setUrl(v); setDraft(v)
      const r = localStorage.getItem(PERF_RESP_KEY) || ''; setResp(r); setRespDraft(r)
    } catch { /* ignore */ }
  }, [])
  const save = () => {
    try { localStorage.setItem(PERF_FORM_KEY, draft.trim()); localStorage.setItem(PERF_RESP_KEY, respDraft.trim()) } catch { /* ignore */ }
    setUrl(draft.trim()); setResp(respDraft.trim()); setSaved(true); setTimeout(() => setSaved(false), 1600)
  }
  return (
    <div className="bg-white rounded-2xl border border-brand-gray p-6">
      <h2 className="text-base font-semibold text-brand-charcoal">Connected Review Form (HR)</h2>
      <p className="text-sm text-brand-slate-gray mt-0.5 mb-4">Attach the Google Form employees complete each month, and the responses sheet you review. You review submissions below — you don&apos;t fill this form.</p>
      <div className="space-y-2 mb-4">
        <label className="block"><span className="block text-xs font-medium text-brand-charcoal mb-1">Google Form link (employees fill this)</span>
          <input value={draft} onChange={e => setDraft(e.target.value)} placeholder="https://docs.google.com/forms/…/viewform" className="w-full text-sm" /></label>
        <label className="block"><span className="block text-xs font-medium text-brand-charcoal mb-1">Responses link (Google Sheet — HR views)</span>
          <input value={respDraft} onChange={e => setRespDraft(e.target.value)} placeholder="https://docs.google.com/spreadsheets/…" className="w-full text-sm" /></label>
        <div className="flex items-center gap-2">
          <button onClick={save} className="btn-primary text-sm">Save</button>
          {saved && <span className="text-sm text-emerald-600 font-medium">Saved ✓</span>}
        </div>
      </div>
      <div className="flex items-center gap-4 flex-wrap text-sm">
        {url ? <a href={url} target="_blank" rel="noopener noreferrer" className="text-brand-royal-blue hover:underline">Preview the form ↗</a> : <span className="text-brand-slate-gray">No form attached — employees use the built-in review form.</span>}
        {resp && <a href={resp} target="_blank" rel="noopener noreferrer" className="text-brand-royal-blue hover:underline">View all responses ↗</a>}
      </div>
    </div>
  )
}
