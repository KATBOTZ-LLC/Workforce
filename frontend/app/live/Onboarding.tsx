'use client'

/**
 * Onboard a worker, and the roster that results — both on PostgreSQL.
 *
 * The point of this panel is that submitting it writes to six tables in one
 * transaction. If any single rule is broken, nothing is written at all: no
 * half-created person, no engagement without a checklist.
 *
 * The checklist length is not chosen here. It follows from worker type, the
 * region of the chosen work location, and (for contractors) the engagement
 * mode — resolved in the database from DOCUMENT_REQUIREMENT.
 */

import { useEffect, useState } from 'react'
import {
  ApiError, CreatedWorker, FormOptions, NewWorker, RosterRow,
  createWorker, fetchFormOptions, fetchRoster,
} from '../lib/liveApi'

const BLANK: NewWorker = {
  first_name: '', last_name: '', professional_email: '', personal_email: '',
  worker_type: 'Employee', contractor_mode: null, designation: '',
  department_id: '', work_location_id: '', hr_lead_person_id: '', joined_on: '',
}

export default function Onboarding({ canOnboard }: { canOnboard: boolean }) {
  const [options, setOptions] = useState<FormOptions | null>(null)
  const [roster, setRoster] = useState<RosterRow[]>([])
  const [form, setForm] = useState<NewWorker>(BLANK)
  const [created, setCreated] = useState<CreatedWorker | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!canOnboard) { setOptions(null); setRoster([]); return }
    fetchFormOptions().then(setOptions).catch(() => setOptions(null))
    fetchRoster().then(setRoster).catch(() => setRoster([]))
  }, [canOnboard])

  const set = <K extends keyof NewWorker>(k: K, v: NewWorker[K]) =>
    setForm((f) => ({ ...f, [k]: v }))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setError(null); setCreated(null)
    try {
      const result = await createWorker({
        ...form,
        last_name: form.last_name || null,
        personal_email: form.personal_email || null,
        hr_lead_person_id: form.hr_lead_person_id || null,
        // Only meaningful for a Contractor — the database enforces that too.
        contractor_mode: form.worker_type === 'Contractor' ? (form.contractor_mode || 'independent') : null,
      })
      setCreated(result)
      setForm(BLANK)
      setRoster(await fetchRoster())
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  if (!canOnboard) {
    return (
      <section className="rounded-lg border border-brand-gray bg-white p-5 shadow-sm">
        <h2 className="text-sm font-bold uppercase tracking-wide text-brand-royal-blue">Onboarding</h2>
        <p className="mt-3 rounded bg-brand-light-gray px-3 py-2 text-sm text-brand-slate">
          <span className="font-semibold text-brand-burgundy">403 </span>
          Onboarding is available to the founder and HR tiers. The roster is not loaded because the
          database declined to return it — not because this page hid it.
        </p>
      </section>
    )
  }

  const label = 'block text-[11px] font-semibold uppercase tracking-wide text-brand-slate mb-1'
  const field = 'w-full rounded border border-brand-gray px-2.5 py-1.5 text-sm outline-none focus:border-brand-royal-blue'

  return (
    <section className="rounded-lg border border-brand-gray bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wide text-brand-royal-blue">
            Roster — {roster.length} {roster.length === 1 ? 'engagement' : 'engagements'}
          </h2>
          <p className="mt-1 text-xs text-brand-slate">
            One row per engagement, not per person. Document progress is counted from the same rows
            the activation gate counts, so the two cannot disagree.
          </p>
        </div>
        <button
          onClick={() => { setOpen(!open); setCreated(null); setError(null) }}
          className="shrink-0 rounded bg-brand-royal-blue px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
        >
          {open ? 'Cancel' : '+ Onboard a worker'}
        </button>
      </div>

      {open && options && (
        <form onSubmit={submit} className="mt-4 grid gap-3 rounded border border-brand-gray bg-brand-light-gray p-4 md:grid-cols-3">
          <div><label className={label}>First name *</label>
            <input required className={field} value={form.first_name} onChange={(e) => set('first_name', e.target.value)} /></div>
          <div><label className={label}>Last name</label>
            <input className={field} value={form.last_name || ''} onChange={(e) => set('last_name', e.target.value)} placeholder="optional" /></div>
          <div><label className={label}>Designation *</label>
            <input required className={field} value={form.designation} onChange={(e) => set('designation', e.target.value)} /></div>

          <div><label className={label}>Professional email *</label>
            <input required type="email" className={field} value={form.professional_email} onChange={(e) => set('professional_email', e.target.value)} /></div>
          <div><label className={label}>Personal email</label>
            <input type="email" className={field} value={form.personal_email || ''} onChange={(e) => set('personal_email', e.target.value)} placeholder="optional" /></div>
          <div><label className={label}>Joined on *</label>
            <input required type="date" className={field} value={form.joined_on} onChange={(e) => set('joined_on', e.target.value)} /></div>

          <div><label className={label}>Worker type *</label>
            <select className={field} value={form.worker_type}
              onChange={(e) => set('worker_type', e.target.value as NewWorker['worker_type'])}>
              <option>Employee</option><option>Contractor</option><option>Intern</option>
            </select></div>
          <div><label className={label}>Engagement mode</label>
            <select className={field} disabled={form.worker_type !== 'Contractor'}
              value={form.contractor_mode || 'independent'}
              onChange={(e) => set('contractor_mode', e.target.value as 'independent' | 'c2c')}>
              <option value="independent">Independent</option>
              <option value="c2c">Staffing agency (C2C)</option>
            </select>
            <p className="mt-1 text-[10px] text-brand-slate">Contractors only.</p></div>
          <div><label className={label}>Work location *</label>
            <select required className={field} value={form.work_location_id}
              onChange={(e) => set('work_location_id', e.target.value)}>
              <option value="">Select…</option>
              {options.work_locations.map((l) => <option key={l.id} value={l.id}>{l.name} — {l.region}</option>)}
            </select>
            <p className="mt-1 text-[10px] text-brand-slate">Sets the region, which picks the checklist.</p></div>

          <div><label className={label}>Department *</label>
            <select required className={field} value={form.department_id}
              onChange={(e) => set('department_id', e.target.value)}>
              <option value="">Select…</option>
              {options.departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select></div>
          <div><label className={label}>HR lead</label>
            <select className={field} value={form.hr_lead_person_id || ''}
              onChange={(e) => set('hr_lead_person_id', e.target.value)}>
              <option value="">None</option>
              {options.hr_leads.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select></div>
          <div className="flex items-end">
            <button disabled={busy} className="w-full rounded bg-brand-royal-blue px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40">
              {busy ? 'Writing…' : 'Create'}
            </button>
          </div>
        </form>
      )}

      {error && (
        <div className="mt-3 rounded border border-brand-burgundy bg-red-50 px-3 py-2 text-sm text-brand-burgundy">
          <span className="font-semibold">The database refused this: </span>{error}
          <div className="mt-1 text-xs opacity-80">Nothing was written. The whole transaction rolled back.</div>
        </div>
      )}

      {created && (
        <div className="mt-3 rounded border border-brand-success bg-green-50 px-3 py-2.5 text-sm">
          <div className="font-semibold text-brand-navy">
            {created.employment_code} created — {created.region} checklist,{' '}
            {created.documents_required} documents ({created.documents_mandatory} mandatory)
          </div>
          <div className="mt-1 text-xs text-brand-dark-gray">
            Onboarding link, shown once and never stored:
            <code className="ml-1 rounded bg-white px-1.5 py-0.5 text-[11px]">{created.onboarding_url}</code>
          </div>
          <div className="mt-1 text-[11px] text-brand-slate">
            The database holds only a SHA-256 hash of it, so a leak yields no working links.
          </div>
        </div>
      )}

      <div className="mt-4 overflow-x-auto">
        {roster.length === 0 ? (
          <p className="text-sm text-brand-slate">
            No engagements yet. The org chart has 34 people, but an engagement needs a join date and a
            worker type — neither is in the org matrix, so none were invented.
          </p>
        ) : (
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b border-brand-gray text-left text-xs uppercase tracking-wide text-brand-slate">
                <th className="pb-2">Code</th><th className="pb-2">Name</th><th className="pb-2">Type</th>
                <th className="pb-2">Region</th><th className="pb-2">Department</th><th className="pb-2">Stage</th>
                <th className="pb-2 pr-4 text-right">Docs</th><th className="pb-2 pl-2">Account gate</th>
              </tr>
            </thead>
            <tbody>
              {roster.map((r) => (
                <tr key={r.employment_id} className="border-b border-brand-light-gray">
                  <td className="py-1.5 font-mono text-xs text-brand-royal-blue">{r.employment_code}</td>
                  <td className="py-1.5 font-semibold text-brand-navy">{r.display_name}
                    <div className="text-[10px] font-normal text-brand-slate">{r.designation}</div></td>
                  <td className="py-1.5 text-brand-dark-gray">{r.worker_type}
                    {r.contractor_mode && <span className="text-brand-slate"> · {r.contractor_mode}</span>}</td>
                  <td className="py-1.5 text-brand-slate">{r.region || '—'}</td>
                  <td className="py-1.5 text-brand-slate">{r.department || '—'}</td>
                  <td className="py-1.5"><span className="rounded bg-brand-warm-stone px-2 py-0.5 text-[11px]">{r.stage}</span></td>
                  <td className="py-1.5 pr-4 text-right tabular-nums text-brand-slate">{r.docs_approved}/{r.docs_total}</td>
                  <td className="py-1.5 pl-2 text-xs">
                    {r.can_activate
                      ? <span className="font-semibold text-brand-success">Ready to activate</span>
                      : <span className="text-brand-warning">Blocked — {r.docs_mandatory_outstanding} mandatory left</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  )
}
