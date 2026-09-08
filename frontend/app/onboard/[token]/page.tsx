'use client'

/**
 * The worker's onboarding page, reached by the emailed link. No sign-in.
 *
 * Reads and writes the real database through /api/onboard/<token>. What it
 * shows is decided server-side: which documents are required comes from the
 * checklist frozen when the engagement was created, so editing a requirement
 * later cannot change what this person was asked for halfway through.
 *
 * Uploading is not approving. Everything lands as Pending and waits for HR.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import {
  ACCEPTED, LinkInvalid, MAX_MB, OnboardChecklist, OnboardItem,
  fetchChecklist, uploadDocument,
} from '@/app/lib/onboardApi'

export const dynamic = 'force-dynamic'

const STATUS_STYLE: Record<string, string> = {
  Outstanding: 'bg-brand-gray text-brand-dark-gray',
  Pending: 'bg-amber-100 text-amber-800',
  Approved: 'bg-emerald-100 text-emerald-800',
  Rejected: 'bg-red-100 text-brand-burgundy',
}

const STATUS_LABEL: Record<string, string> = {
  Outstanding: 'Not uploaded',
  Pending: 'With HR',
  Approved: 'Approved',
  Rejected: 'Needs re-upload',
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-brand-off-white px-4 py-10">
      <div className="mx-auto max-w-3xl">{children}</div>
    </div>
  )
}

export default function OnboardPage() {
  const params = useParams()
  const token = String(params.token || '')

  const [data, setData] = useState<OnboardChecklist | null>(null)
  const [invalid, setInvalid] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [rowError, setRowError] = useState<Record<string, string>>({})
  const inputs = useRef<Record<string, HTMLInputElement | null>>({})

  const load = useCallback(async () => {
    try {
      setData(await fetchChecklist(token))
      setLoadError(null)
    } catch (e) {
      if (e instanceof LinkInvalid) setInvalid(true)
      else setLoadError(e instanceof Error ? e.message : String(e))
    }
  }, [token])

  useEffect(() => { load() }, [load])

  async function pick(item: OnboardItem, file: File | undefined) {
    if (!file) return
    setRowError((p) => ({ ...p, [item.document_id]: '' }))
    // Checked here only to save the worker a round trip; the backend refuses
    // oversized and wrong-type files regardless.
    if (file.size > MAX_MB * 1024 * 1024) {
      setRowError((p) => ({ ...p, [item.document_id]: `That file is ${Math.round(file.size / 1024 / 1024)} MB. The limit is ${MAX_MB} MB.` }))
      return
    }
    setBusyId(item.document_id)
    try {
      await uploadDocument(token, item.document_id, file)
      await load()
    } catch (e) {
      setRowError((p) => ({ ...p, [item.document_id]: e instanceof Error ? e.message : String(e) }))
    } finally {
      setBusyId(null)
      const el = inputs.current[item.document_id]
      if (el) el.value = ''   // so re-picking the same file fires onChange again
    }
  }

  if (invalid) {
    return (
      <Shell>
        <div className="rounded-2xl border border-brand-gray bg-white p-10 text-center">
          <h1 className="text-xl font-bold text-brand-charcoal">This link is no longer valid</h1>
          <p className="mt-2 text-sm text-brand-slate">
            Onboarding links expire after seven days, and stop working once your
            account has been activated. Ask HR to send a new one.
          </p>
        </div>
      </Shell>
    )
  }

  if (loadError) {
    return (
      <Shell>
        <div className="rounded-2xl border border-brand-burgundy bg-white p-8 text-center">
          <p className="text-sm text-brand-burgundy">{loadError}</p>
          <button onClick={load} className="mt-4 rounded bg-brand-royal-blue px-4 py-2 text-sm font-semibold text-white">
            Try again
          </button>
        </div>
      </Shell>
    )
  }

  if (!data) {
    return <Shell><p className="text-sm text-brand-slate">Loading your checklist…</p></Shell>
  }

  const approved = data.items.filter((i) => i.status === 'Approved').length
  const rejected = data.items.filter((i) => i.status === 'Rejected')
  const done = data.mandatory_outstanding === 0

  return (
    <Shell>
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-slate">
          KATBOTZ Onboarding · {data.employment_code}
        </p>
        <h1 className="mt-1 text-2xl font-bold text-brand-royal-blue">
          Welcome, {data.display_name}
        </h1>
        <p className="mt-2 text-sm text-brand-slate">
          {data.worker_type}{data.region ? ` · ${data.region}` : ''} — this list is
          specific to that, so you are only asked for documents that apply to you.
        </p>
      </header>

      <div className="mb-6 rounded-lg border border-brand-gray bg-white p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold text-brand-navy">
            {approved} of {data.items.length} approved
          </span>
          <span className="text-brand-slate">
            {done ? 'Everything required is approved' : `${data.mandatory_outstanding} required document(s) still needed`}
          </span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded bg-brand-gray">
          <div className="h-full bg-brand-royal-blue transition-all"
               style={{ width: `${data.items.length ? (approved / data.items.length) * 100 : 0}%` }} />
        </div>
      </div>

      {rejected.length > 0 && (
        <div className="mb-6 rounded-lg border border-brand-burgundy bg-red-50 p-4">
          <p className="text-sm font-semibold text-brand-burgundy">
            {rejected.length} document{rejected.length > 1 ? 's' : ''} need re-uploading
          </p>
          <ul className="mt-2 space-y-1 text-sm text-brand-dark-gray">
            {rejected.map((i) => (
              <li key={i.document_id}>
                <span className="font-medium">{i.document_name}</span>
                {i.rejection_reason ? ` — ${i.rejection_reason}` : ''}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-brand-slate">
            Your previous file is kept on record. Uploading a new one adds a version
            rather than replacing it.
          </p>
        </div>
      )}

      <div className="divide-y divide-brand-light-gray rounded-lg border border-brand-gray bg-white">
        {data.items.map((item) => (
          <div key={item.document_id} className="flex flex-wrap items-center gap-3 p-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-brand-navy">{item.document_name}</span>
                {item.is_mandatory
                  ? <span className="text-[10px] font-bold uppercase text-brand-burgundy">required</span>
                  : <span className="text-[10px] uppercase text-brand-slate">optional</span>}
              </div>
              {item.current_file_name && (
                <div className="mt-0.5 truncate text-xs text-brand-slate">
                  {item.current_file_name}
                  {item.version_count > 1 ? ` · version ${item.version_count}` : ''}
                </div>
              )}
              {item.reference_url && (
                <a href={item.reference_url} target="_blank" rel="noopener noreferrer"
                   className="mt-0.5 inline-block text-xs text-brand-royal-blue underline">
                  Open the form to fill in
                </a>
              )}
              {rowError[item.document_id] && (
                <div className="mt-1 text-xs text-brand-burgundy">{rowError[item.document_id]}</div>
              )}
            </div>

            <span className={`rounded px-2 py-0.5 text-[11px] font-semibold ${STATUS_STYLE[item.status]}`}>
              {STATUS_LABEL[item.status] || item.status}
            </span>

            <input
              ref={(el) => { inputs.current[item.document_id] = el }}
              type="file" accept={ACCEPTED} className="hidden"
              onChange={(e) => pick(item, e.target.files?.[0])}
            />
            <button
              disabled={busyId === item.document_id || item.status === 'Approved'}
              onClick={() => inputs.current[item.document_id]?.click()}
              className="rounded border border-brand-royal-blue px-3 py-1.5 text-xs font-semibold text-brand-royal-blue transition hover:bg-brand-powder-blue disabled:cursor-not-allowed disabled:border-brand-gray disabled:text-brand-slate"
            >
              {busyId === item.document_id ? 'Uploading…'
                : item.status === 'Approved' ? 'Approved'
                : item.status === 'Outstanding' ? 'Upload'
                : 'Replace'}
            </button>
          </div>
        ))}
      </div>

      <p className="mt-6 text-xs text-brand-slate">
        Uploading does not approve a document — HR reviews each one and will tell
        you if anything needs redoing. PDF, JPG, PNG or HEIC, up to {MAX_MB} MB each.
        {done && ' Everything required is in and approved; HR will activate your account.'}
      </p>
    </Shell>
  )
}
