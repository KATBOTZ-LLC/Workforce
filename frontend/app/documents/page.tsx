'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Sidebar from '@/app/layout/Sidebar'
import { useWorkforce, STAGE_META, REJECT_REASONS, Stage } from '@/app/lib/workforceStore'
import { useQueryParam } from '@/app/lib/useQueryParam'

export const dynamic = 'force-dynamic'

const PIPELINE_COLUMNS: { stage: Stage; title: string }[] = [
  { stage: 'invited', title: 'Invited' },
  { stage: 'verifying', title: 'Verifying' },
  { stage: 'verified', title: 'Ready for Account' },
  { stage: 'active', title: 'Onboarded' },
]

export default function DocumentsPage() {
  const role = useQueryParam('role')
  const workerId = useQueryParam('worker')
  if (role === 'employee') return <MyDocuments workerId={workerId} />
  return <AdminDocuments />
}

function MyDocuments({ workerId }: { workerId: string | null }) {
  const { workers } = useWorkforce()
  const me = workerId ? workers.find(w => w.id === workerId) : undefined
  const approved = me?.documents.filter(d => d.status === 'approved').length || 0

  return (
    <>
      <Sidebar />
      <div className="min-h-screen bg-brand-off-white with-sidebar">
        <header className="bg-white border-b border-brand-gray sticky top-0 z-10">
          <div className="px-8 py-5">
            <Link href={`/dashboard?role=employee&worker=${workerId || ''}`} className="text-brand-slate-gray hover:text-brand-royal-blue text-sm">← Dashboard</Link>
            <h1 className="text-2xl font-bold text-brand-charcoal mt-1">My Documents</h1>
          </div>
        </header>

        <main className="px-8 py-7">
          {!me && <div className="bg-white rounded-2xl border border-brand-gray p-10 text-center text-brand-slate-gray">No worker signed in.</div>}
          {me && (
            <div className="max-w-2xl space-y-4">
              <div className="bg-white rounded-2xl border border-brand-gray p-6 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-brand-charcoal">{approved}/{me.documents.length} documents verified</p>
                  <p className="text-sm text-brand-slate-gray mt-0.5">{me.accountCreated ? `Account active — ${me.professionalEmail}` : 'HR reviews each upload before your account is created.'}</p>
                </div>
                {!me.accountCreated && (
                  <Link href={`/onboard/${me.token}`} className="btn-primary whitespace-nowrap">Upload / Re-upload</Link>
                )}
              </div>
              <div className="bg-white rounded-2xl border border-brand-gray divide-y divide-brand-gray">
                {me.documents.map(doc => {
                  const done = doc.status === 'approved'
                  const rej = doc.status === 'rejected'
                  const pend = doc.status === 'pending'
                  return (
                    <div key={doc.key} className="p-5 flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="font-medium text-brand-charcoal">
                          {doc.label}
                          {doc.mandatory === false && <span className="ml-2 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-brand-off-white text-brand-slate-gray border border-brand-gray align-middle">Optional</span>}
                          {doc.link && <a href={doc.link} target="_blank" rel="noopener noreferrer" className="ml-2 text-xs text-brand-royal-blue hover:underline">Download form →</a>}
                        </p>
                        <p className="text-xs text-brand-slate-gray mt-0.5">{doc.status === 'not_uploaded' ? 'Not uploaded yet' : doc.fileName}</p>
                        {rej && <p className="text-xs text-brand-burgundy mt-0.5">Rejected: {doc.reason}</p>}
                      </div>
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0" style={{
                        color: done ? '#0F7A46' : rej ? '#800020' : pend ? '#B45309' : '#64748B',
                        background: done ? '#E8F6EF' : rej ? '#F7E7EA' : pend ? '#FEF3E2' : '#F1F5F9',
                      }}>{done ? 'Verified' : rej ? 'Rejected' : pend ? 'Pending' : 'Awaiting'}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  )
}

function AdminDocuments() {
  const preselect = useQueryParam('worker')
  const { workers, verifyDoc, rejectDoc, createAccount } = useWorkforce()

  const queue = workers.filter(w => w.documents.some(d => d.status !== 'not_uploaded'))
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const selected = workers.find(w => w.id === selectedId) || null
  const [tab, setTab] = useState<'pipeline' | 'verify'>('pipeline')
  // Per-document rejection drafts: presence of a key means "marked for rejection".
  type RejDraft = { reason: string; note: string }
  const [rejections, setRejections] = useState<Record<string, RejDraft>>({})

  // Arriving with ?worker=<id> jumps straight into that person's verification.
  useEffect(() => { if (preselect) setTab('verify') }, [preselect])
  const openWorker = (id: string) => { setSelectedId(id); setTab('verify') }

  // Default to the preselected worker (from ?worker=) or the first in queue.
  useEffect(() => {
    setSelectedId(prev => prev || preselect || queue[0]?.id || null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preselect, workers.length])

  // Clear doc selection whenever the selected worker changes.
  useEffect(() => { setRejections({}) }, [selectedId])

  const selectedDocs = Object.keys(rejections)
  const rejectableKeys = selected ? selected.documents.filter(d => d.status !== 'not_uploaded' && d.status !== 'approved').map(d => d.key) : []
  const toggleDoc = (key: string) => setRejections(prev => {
    if (key in prev) { const { [key]: _, ...rest } = prev; return rest }
    return { ...prev, [key]: { reason: REJECT_REASONS[0], note: '' } }
  })
  const setDocReason = (key: string, reason: string) => setRejections(prev => ({ ...prev, [key]: { ...prev[key], reason } }))
  const setDocNote = (key: string, note: string) => setRejections(prev => ({ ...prev, [key]: { ...prev[key], note } }))
  const selectAllRejectable = () => setRejections(prev => {
    const next = { ...prev }
    rejectableKeys.forEach(k => { if (!(k in next)) next[k] = { reason: REJECT_REASONS[0], note: '' } })
    return next
  })
  const clearSelection = () => setRejections({})
  const confirmRejection = () => {
    if (!selected) return
    selectedDocs.forEach(key => {
      const d = rejections[key]
      const finalReason = d.note.trim() ? `${d.reason} — ${d.note.trim()}` : d.reason
      rejectDoc(selected.id, key, finalReason)
    })
    clearSelection()
  }

  return (
    <>
      <Sidebar />
      <div className="min-h-screen bg-brand-off-white with-sidebar">
        <header className="bg-white border-b border-brand-gray sticky top-0 z-10">
          <div className="px-8 py-5 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <Link href="/dashboard?role=admin" className="text-brand-slate-gray hover:text-brand-royal-blue text-sm">← Dashboard</Link>
              <h1 className="text-2xl font-bold text-brand-charcoal mt-1">Onboarding &amp; Documents</h1>
            </div>
            <div className="flex items-center gap-1.5 bg-brand-off-white p-1 rounded-full border border-brand-gray">
              {(['pipeline', 'verify'] as const).map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold capitalize transition ${tab === t ? 'bg-brand-royal-blue text-white shadow' : 'text-brand-slate-gray hover:text-brand-charcoal'}`}>
                  {t === 'pipeline' ? 'Pipeline' : 'Verify Documents'}
                </button>
              ))}
            </div>
          </div>
        </header>

        {tab === 'pipeline' && (
          <main className="px-8 py-7">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 items-stretch min-h-[calc(100vh-200px)]">
              {PIPELINE_COLUMNS.map(col => {
                const items = workers.filter(w => w.stage === col.stage)
                const meta = STAGE_META[col.stage]
                return (
                  <div key={col.stage} className="bg-white rounded-2xl border border-brand-gray p-4 flex flex-col">
                    <div className="flex items-center justify-between mb-3 px-1">
                      <h2 className="text-sm font-semibold text-brand-charcoal">{col.title}</h2>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ color: meta.color, background: meta.bg }}>{items.length}</span>
                    </div>
                    <div className="space-y-2 flex-1">
                      {items.map(w => {
                        const approved = w.documents.filter(d => d.status === 'approved').length
                        return (
                          <button key={w.id} onClick={() => openWorker(w.id)}
                            className="block w-full text-left p-3 rounded-xl border border-brand-gray hover:shadow-md hover:-translate-y-0.5 transition-all">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-brand-powder-blue text-brand-royal-blue flex items-center justify-center text-xs font-semibold">
                                {w.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-brand-charcoal truncate">{w.name}</p>
                                <p className="text-xs text-brand-slate-gray truncate">{w.type} · {w.department}</p>
                              </div>
                            </div>
                            <div className="mt-2.5">
                              <div className="w-full bg-brand-off-white rounded-full h-1.5 overflow-hidden">
                                <div className="h-full rounded-full bg-brand-royal-blue" style={{ width: `${(approved / w.documents.length) * 100}%` }} />
                              </div>
                              <p className="text-[11px] text-brand-slate-gray mt-1">{approved}/{w.documents.length} docs verified</p>
                            </div>
                          </button>
                        )
                      })}
                      {items.length === 0 && <p className="text-xs text-brand-slate-gray px-1 py-4 text-center">Empty</p>}
                    </div>
                  </div>
                )
              })}
            </div>
          </main>
        )}

        {tab === 'verify' && (
        <main className="px-8 py-7">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Queue list */}
            <div className="bg-white rounded-2xl border border-brand-gray p-4 h-fit">
              <h2 className="text-sm font-semibold text-brand-slate-gray px-2 mb-2">Queue ({queue.length})</h2>
              <div className="space-y-1">
                {queue.map(w => {
                  const meta = STAGE_META[w.stage]
                  const approved = w.documents.filter(d => d.status === 'approved').length
                  return (
                    <button key={w.id} onClick={() => setSelectedId(w.id)}
                      className={`w-full text-left px-3 py-3 rounded-xl transition flex items-center justify-between ${selectedId === w.id ? 'bg-brand-powder-blue' : 'hover:bg-brand-off-white'}`}>
                      <div>
                        <p className="font-medium text-brand-charcoal text-sm">{w.name}</p>
                        <p className="text-xs text-brand-slate-gray">{approved}/{w.documents.length} verified</p>
                      </div>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ color: meta.color, background: meta.bg }}>{meta.label}</span>
                    </button>
                  )
                })}
                {queue.length === 0 && <p className="text-sm text-brand-slate-gray px-2 py-6 text-center">No submissions yet.</p>}
              </div>
            </div>

            {/* Detail */}
            <div className="lg:col-span-2 space-y-4">
              {!selected && <div className="bg-white rounded-2xl border border-brand-gray p-10 text-center text-brand-slate-gray">Select a worker to review.</div>}

              {selected && (
                <>
                  <div className="bg-white rounded-2xl border border-brand-gray p-6 flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-bold text-brand-charcoal">{selected.name}</h2>
                      <p className="text-sm text-brand-slate-gray">{selected.type} · {selected.department} · {selected.personalEmail}</p>
                    </div>
                    {(() => {
                      const meta = STAGE_META[selected.stage]
                      return <span className="text-xs font-semibold px-3 py-1 rounded-full" style={{ color: meta.color, background: meta.bg }}>{meta.label}</span>
                    })()}
                  </div>

                  <div className="bg-white rounded-2xl border border-brand-gray overflow-hidden">
                    <div className="px-5 py-3 border-b border-brand-gray flex items-center justify-between bg-brand-off-white">
                      <span className="text-xs font-medium text-brand-slate-gray">
                        Mark documents to reject, add a reason for each{selectedDocs.length > 0 && ` — ${selectedDocs.length} marked`}
                      </span>
                      {rejectableKeys.length > 0 && (
                        <button onClick={selectedDocs.length === rejectableKeys.length ? clearSelection : selectAllRejectable}
                          className="text-xs font-medium text-brand-royal-blue hover:underline">
                          {selectedDocs.length === rejectableKeys.length ? 'Deselect all' : 'Select all'}
                        </button>
                      )}
                    </div>
                    <div className="divide-y divide-brand-gray">
                      {selected.documents.map(doc => {
                        const rejectable = doc.status !== 'not_uploaded' && doc.status !== 'approved'
                        const draft = rejections[doc.key]
                        const checked = !!draft
                        return (
                          <div key={doc.key} className={`p-5 transition ${checked ? 'bg-red-50' : ''}`}>
                            <div className="flex items-center gap-4">
                              <input
                                type="checkbox"
                                disabled={!rejectable}
                                checked={checked}
                                onChange={() => toggleDoc(doc.key)}
                                className="w-4 h-4 rounded border-brand-gray flex-shrink-0 disabled:opacity-30"
                              />
                              <div className="min-w-0 flex-1">
                                <p className="font-medium text-brand-charcoal">
                                  {doc.label}
                                  {doc.mandatory === false && <span className="ml-2 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-brand-off-white text-brand-slate-gray border border-brand-gray align-middle">Optional</span>}
                                  {doc.link && <a href={doc.link} target="_blank" rel="noopener noreferrer" className="ml-2 text-xs text-brand-royal-blue hover:underline">Download form →</a>}
                                </p>
                                <p className="text-xs text-brand-slate-gray mt-0.5">
                                  {doc.status === 'not_uploaded' ? 'Not uploaded yet' : doc.fileName}
                                </p>
                                {doc.status === 'rejected' && <p className="text-xs text-brand-burgundy mt-0.5">Rejected: {doc.reason}</p>}
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <StatusPill status={doc.status} />
                                {rejectable && (
                                  <button onClick={() => verifyDoc(selected.id, doc.key)}
                                    className="text-sm px-3 py-1.5 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition">Verify</button>
                                )}
                              </div>
                            </div>
                            {/* Per-document reason */}
                            {checked && (
                              <div className="mt-3 pl-8 space-y-2">
                                <select value={draft.reason} onChange={e => setDocReason(doc.key, e.target.value)} className="w-full sm:w-56 text-sm">
                                  {REJECT_REASONS.map(r => <option key={r}>{r}</option>)}
                                </select>
                                <textarea
                                  value={draft.note}
                                  onChange={e => setDocNote(doc.key, e.target.value)}
                                  rows={2}
                                  placeholder={`What's wrong with ${doc.label}? (optional, shown to the employee)`}
                                  className="w-full text-sm"
                                />
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>

                    {/* Rejection action bar */}
                    {selectedDocs.length > 0 && (
                      <div className="px-5 py-4 bg-red-50 border-t border-brand-gray flex items-center justify-between gap-3 flex-wrap">
                        <span className="text-sm text-brand-charcoal">{selectedDocs.length} document{selectedDocs.length > 1 ? 's' : ''} marked for rejection</span>
                        <div className="flex items-center gap-2">
                          <button onClick={clearSelection} className="text-sm px-3 py-2 rounded-lg border border-brand-gray text-brand-slate-gray">Clear</button>
                          <button onClick={confirmRejection} className="text-sm px-4 py-2 rounded-lg bg-brand-burgundy text-white whitespace-nowrap font-semibold">
                            Confirm Rejection ({selectedDocs.length})
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="bg-white rounded-2xl border border-brand-gray p-6 flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold text-brand-charcoal">
                        {selected.accountCreated ? 'Account created' : selected.stage === 'verified' ? 'All documents verified' : 'Verify all documents to create account'}
                      </p>
                      <p className="text-sm text-brand-slate-gray mt-0.5">
                        {selected.accountCreated
                          ? `${selected.professionalEmail} · welcome email sent`
                          : 'Creating the account provisions the @katbotz.com email (₹100/month). Only after every document is verified.'}
                      </p>
                    </div>
                    <button
                      disabled={selected.stage !== 'verified' || selected.accountCreated}
                      onClick={() => createAccount(selected.id)}
                      className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap">
                      {selected.accountCreated ? '✓ Created' : 'Create Account'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </main>
        )}
      </div>
    </>
  )
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    not_uploaded: { label: 'Awaiting', color: '#64748B', bg: '#F1F5F9' },
    pending: { label: 'Pending', color: '#B45309', bg: '#FEF3E2' },
    approved: { label: 'Verified', color: '#0F7A46', bg: '#E8F6EF' },
    rejected: { label: 'Rejected', color: '#800020', bg: '#F7E7EA' },
  }
  const m = map[status] || map.not_uploaded
  return <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ color: m.color, background: m.bg }}>{m.label}</span>
}
