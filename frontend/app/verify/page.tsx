'use client'

/**
 * HR verification — the roster, each engagement's checklist, and activation.
 *
 * Every decision here is a write to PostgreSQL, and the rules that matter are
 * enforced there rather than in this file:
 *
 *   * A rejection with no reason is refused by a CHECK constraint.
 *   * The same file version cannot be reviewed twice — a change of mind is a
 *     new upload, so both decisions survive.
 *   * Activation counts outstanding mandatory documents while holding a row
 *     lock on EMPLOYMENT, so two people clicking at once cannot both succeed.
 *
 * When a button below is disabled that is a convenience, not the control.
 */

import { useCallback, useEffect, useState } from 'react'
import { clearSession, fetchMe, getSessionToken, MeProfile } from '../lib/authClient'
import {
  ApiError, Checklist, ChecklistItem, DevSignIn, RosterRow,
  activateEmployment, devLogin, fetchChecklistFor, fetchDevSignIn, fetchRoster,
  reviewFile, uploadAsHr,
} from '../lib/liveApi'

const STAGE_STYLE: Record<string, string> = {
  Invited: 'bg-brand-gray text-brand-dark-gray',
  Verifying: 'bg-amber-100 text-amber-800',
  Verified: 'bg-brand-powder-blue text-brand-royal-blue',
  Active: 'bg-emerald-100 text-emerald-800',
  Inactive: 'bg-brand-warm-stone text-brand-dark-gray',
}

const DOC_STYLE: Record<string, string> = {
  Outstanding: 'bg-brand-gray text-brand-dark-gray',
  Pending: 'bg-amber-100 text-amber-800',
  Approved: 'bg-emerald-100 text-emerald-800',
  Rejected: 'bg-red-100 text-brand-burgundy',
}

export default function VerifyPage() {
  const [dev, setDev] = useState<DevSignIn | null>(null)
  const [passcode, setPasscode] = useState('')
  const [me, setMe] = useState<MeProfile | null>(null)
  const [roster, setRoster] = useState<RosterRow[]>([])
  const [openId, setOpenId] = useState<string | null>(null)
  const [checklist, setChecklist] = useState<Checklist | null>(null)
  const [rejecting, setRejecting] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const token = getSessionToken()
    if (!token) { setMe(null); setRoster([]); return }
    try {
      setMe(await fetchMe(token))
      setRoster(await fetchRoster())
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      if (e instanceof ApiError && e.status === 401) clearSession()
    }
  }, [])

  useEffect(() => { fetchDevSignIn().then(setDev) }, [])
  useEffect(() => { load() }, [load])

  const openChecklist = useCallback(async (id: string) => {
    setOpenId(id); setChecklist(null); setError(null)
    try { setChecklist(await fetchChecklistFor(id)) }
    catch (e) { setError(e instanceof Error ? e.message : String(e)) }
  }, [])

  async function decide(item: ChecklistItem, decision: 'Approved' | 'Rejected', why?: string) {
    if (!item.current_file_id || !openId) return
    setBusy(true); setError(null); setNote(null)
    try {
      await reviewFile(item.current_file_id, decision, why)
      await openChecklist(openId)
      await load()
      setRejecting(null); setReason('')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally { setBusy(false) }
  }

  async function activate(row: RosterRow) {
    setBusy(true); setError(null); setNote(null)
    try {
      const r = await activateEmployment(row.employment_id)
      setNote(`${r.employment_code}: ${r.message}`)
      await load()
      if (openId === row.employment_id) await openChecklist(row.employment_id)
    } catch (e) {
      // A 409 here is the gate doing its job, and it names what is missing.
      setError(e instanceof Error ? e.message : String(e))
    } finally { setBusy(false) }
  }

  async function hrUpload(item: ChecklistItem, file: File | undefined) {
    if (!file || !openId) return
    setBusy(true); setError(null)
    try { await uploadAsHr(item.document_id, file); await openChecklist(openId); await load() }
    catch (e) { setError(e instanceof Error ? e.message : String(e)) }
    finally { setBusy(false) }
  }

  async function unlock(e: React.FormEvent) {
    e.preventDefault(); setError(null)
    const d = await fetchDevSignIn(passcode)
    if (d && d.emails.length === 0) setError('Wrong passcode.')
    setDev(d)
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-slate">
          Workforce Platform · WF-001
        </p>
        <h1 className="mt-1 text-3xl font-bold text-brand-royal-blue">HR Verification</h1>
        <p className="mt-2 max-w-3xl text-sm text-brand-slate">
          Approve or reject each uploaded document, then activate the engagement.
          Activation is refused until every mandatory document is approved — the
          database enforces that, not this page.
        </p>
      </header>

      {error && (
        <div className="mb-4 rounded border border-brand-burgundy bg-red-50 px-4 py-3 text-sm text-brand-burgundy">
          {error}
        </div>
      )}
      {note && (
        <div className="mb-4 rounded border border-emerald-500 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {note}
        </div>
      )}

      {!me && (
        <section className="mb-6 rounded-lg border border-brand-gray bg-white p-5">
          <h2 className="text-sm font-bold uppercase tracking-wide text-brand-royal-blue">Sign in</h2>
          {!dev && <p className="mt-2 text-sm text-brand-slate">Dev sign-in is not enabled.</p>}
          {dev && dev.passcodeRequired && dev.emails.length === 0 && (
            <form className="mt-3 flex gap-2" onSubmit={unlock}>
              <input type="password" value={passcode} onChange={(e) => setPasscode(e.target.value)}
                     placeholder="Demo passcode"
                     className="flex-1 rounded border border-brand-gray px-3 py-2 text-sm outline-none focus:border-brand-royal-blue" />
              <button className="rounded bg-brand-royal-blue px-4 py-2 text-sm font-semibold text-white">Unlock</button>
            </form>
          )}
          {dev && dev.emails.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {dev.emails
                .filter((e) => ['ashish.katyayan@katbotz.com', 'akshat@katbotz.com'].includes(e))
                .map((e) => (
                  <button key={e}
                          onClick={async () => { await devLogin(e, passcode || undefined); await load() }}
                          className="rounded border border-brand-gray px-3 py-1.5 text-xs hover:border-brand-royal-blue">
                    {e}
                  </button>
                ))}
            </div>
          )}
        </section>
      )}

      {me && (
        <>
          <div className="mb-4 flex items-center gap-3 text-sm">
            <span className="font-semibold text-brand-navy">{me.display_name}</span>
            <span className="rounded bg-brand-powder-blue px-2 py-0.5 text-[11px] font-semibold uppercase text-brand-royal-blue">
              {me.tier}
            </span>
            <button onClick={() => { clearSession(); load() }}
                    className="ml-auto rounded border border-brand-gray px-3 py-1 text-xs text-brand-slate hover:bg-brand-light-gray">
              Sign out
            </button>
          </div>

          <section className="mb-6 overflow-x-auto rounded-lg border border-brand-gray bg-white">
            {roster.length === 0 ? (
              <p className="p-5 text-sm text-brand-slate">
                No engagements yet. Fill in{' '}
                <code className="text-xs">db/import/roster_template.csv</code> and run the
                importer, or create one from the Employees page.
              </p>
            ) : (
              <table className="w-full min-w-[820px] text-sm">
                <thead>
                  <tr className="border-b border-brand-gray text-left text-xs uppercase tracking-wide text-brand-slate">
                    <th className="p-3">Code</th><th className="p-3">Person</th>
                    <th className="p-3">Type</th><th className="p-3">Region</th>
                    <th className="p-3">Stage</th><th className="p-3">Documents</th>
                    <th className="p-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {roster.map((r) => (
                    <tr key={r.employment_id} className="border-b border-brand-light-gray">
                      <td className="p-3 font-mono text-xs">{r.employment_code}</td>
                      <td className="p-3">
                        <div className="font-semibold text-brand-navy">{r.display_name}</div>
                        <div className="text-[11px] text-brand-slate">{r.designation}</div>
                      </td>
                      <td className="p-3 text-brand-dark-gray">
                        {r.worker_type}{r.contractor_mode ? ` · ${r.contractor_mode}` : ''}
                      </td>
                      <td className="p-3 text-brand-slate">{r.region || '—'}</td>
                      <td className="p-3">
                        <span className={`rounded px-2 py-0.5 text-[11px] font-semibold ${STAGE_STYLE[r.stage] || ''}`}>
                          {r.stage}
                        </span>
                      </td>
                      <td className="p-3 text-brand-slate">
                        {r.docs_approved}/{r.docs_total}
                        {r.docs_mandatory_outstanding > 0 && (
                          <span className="ml-1 text-brand-warning">· {r.docs_mandatory_outstanding} required left</span>
                        )}
                      </td>
                      <td className="p-3 text-right whitespace-nowrap">
                        <button onClick={() => openChecklist(r.employment_id)}
                                className="rounded border border-brand-gray px-2 py-1 text-xs hover:border-brand-royal-blue">
                          {openId === r.employment_id ? 'Reviewing' : 'Review'}
                        </button>
                        <button disabled={!r.can_activate || busy} onClick={() => activate(r)}
                                className="ml-2 rounded bg-brand-royal-blue px-2 py-1 text-xs font-semibold text-white disabled:bg-brand-gray disabled:text-brand-slate">
                          Activate
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          {openId && (
            <section className="rounded-lg border border-brand-gray bg-white p-5">
              {!checklist ? <p className="text-sm text-brand-slate">Loading checklist…</p> : (
                <>
                  <div className="mb-4 flex flex-wrap items-center gap-3">
                    <h2 className="text-sm font-bold uppercase tracking-wide text-brand-royal-blue">
                      {checklist.employment_code} · {checklist.display_name}
                    </h2>
                    <span className={`rounded px-2 py-0.5 text-[11px] font-semibold ${STAGE_STYLE[checklist.stage] || ''}`}>
                      {checklist.stage}
                    </span>
                    <span className="text-xs text-brand-slate">
                      {checklist.mandatory_outstanding === 0
                        ? 'All mandatory documents approved'
                        : `${checklist.mandatory_outstanding} mandatory outstanding`}
                    </span>
                  </div>

                  <div className="divide-y divide-brand-light-gray">
                    {checklist.items.map((item) => (
                      <div key={item.document_id} className="py-3">
                        <div className="flex flex-wrap items-center gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-brand-navy">{item.document_name}</span>
                              {item.is_mandatory
                                ? <span className="text-[10px] font-bold uppercase text-brand-burgundy">required</span>
                                : <span className="text-[10px] uppercase text-brand-slate">optional</span>}
                              {item.version_count > 1 && (
                                <span className="text-[10px] text-brand-slate">· {item.version_count} versions</span>
                              )}
                            </div>
                            {item.current_file_name && (
                              <div className="mt-0.5 truncate text-xs text-brand-slate">{item.current_file_name}</div>
                            )}
                            {item.rejection_reason && (
                              <div className="mt-0.5 text-xs text-brand-burgundy">Rejected: {item.rejection_reason}</div>
                            )}
                          </div>

                          <span className={`rounded px-2 py-0.5 text-[11px] font-semibold ${DOC_STYLE[item.status] || ''}`}>
                            {item.status}
                          </span>

                          {item.current_file_id && item.review_status === null && (
                            <>
                              <button disabled={busy} onClick={() => decide(item, 'Approved')}
                                      className="rounded bg-emerald-600 px-3 py-1 text-xs font-semibold text-white disabled:opacity-50">
                                Approve
                              </button>
                              <button disabled={busy} onClick={() => { setRejecting(item.document_id); setReason('') }}
                                      className="rounded border border-brand-burgundy px-3 py-1 text-xs font-semibold text-brand-burgundy disabled:opacity-50">
                                Reject
                              </button>
                            </>
                          )}
                          {!item.current_file_id && (
                            <label className="cursor-pointer rounded border border-brand-gray px-3 py-1 text-xs text-brand-slate hover:border-brand-royal-blue">
                              Upload for them
                              <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.heic"
                                     onChange={(e) => hrUpload(item, e.target.files?.[0])} />
                            </label>
                          )}
                        </div>

                        {rejecting === item.document_id && (
                          <form className="mt-2 flex gap-2"
                                onSubmit={(e) => { e.preventDefault(); decide(item, 'Rejected', reason) }}>
                            <input value={reason} onChange={(e) => setReason(e.target.value)} autoFocus
                                   placeholder="Why is it being rejected? The worker sees this."
                                   className="flex-1 rounded border border-brand-gray px-3 py-1.5 text-xs outline-none focus:border-brand-burgundy" />
                            <button disabled={!reason.trim() || busy}
                                    className="rounded bg-brand-burgundy px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40">
                              Confirm rejection
                            </button>
                            <button type="button" onClick={() => setRejecting(null)}
                                    className="rounded border border-brand-gray px-3 py-1.5 text-xs text-brand-slate">
                              Cancel
                            </button>
                          </form>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </section>
          )}
        </>
      )}
    </main>
  )
}
