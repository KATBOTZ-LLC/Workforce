'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Sidebar from '@/app/layout/Sidebar'
import {
  useWorkforce, STAGE_META, WorkerType, Gender, EmploymentType, EmployeeStatus,
  TIMEZONES, ageFromDob, experienceDuration, fmtDate, computePerformance,
  lifecycleStage, LIFECYCLE_META, milestones, journeyEvents,
  ContractorMode, docRequirements,
} from '@/app/lib/workforceStore'
import { useQueryParam } from '@/app/lib/useQueryParam'

export const dynamic = 'force-dynamic'

const TYPES: WorkerType[] = ['Employee', 'Contractor', 'Intern']
const EMPLOYMENT_TYPES: EmploymentType[] = ['Full-time', 'Part-time', 'Contract']
const GENDERS: Gender[] = ['Male', 'Female', 'Other', 'Prefer not to say']
const DEPARTMENTS = ['Engineering', 'Sales', 'HR', 'Social Media', 'Finance', "CEO's Office"]
const LEADS = ['Ananya Rao', 'Ravi Shah', 'Priya Nair', 'Karan Singh']
const LOCATIONS = ['India', 'US']
const COUNTRIES = ['India', 'United States', 'Other']

const EMPTY_FORM = {
  firstName: '', lastName: '', gender: 'Prefer not to say' as Gender, dob: '', about: '',
  personalEmail: '', professionalEmail: '', phone: '',
  country: 'India', state: '', address: '', pincode: '', timezone: TIMEZONES[0],
  type: 'Employee' as WorkerType, contractorMode: 'independent' as ContractorMode,
  employmentType: 'Full-time' as EmploymentType, designation: '',
  department: 'Engineering', hrLead: 'Priya Nair', teamLeads: ['Ananya Rao'] as string[],
  location: 'India', dateOfJoining: '', workExperience: '',
}

/* Quick status+type filter presets, e.g. "Active Employees" / "Inactive Interns" */
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
const EMPTY_FILTERS: Filters = {
  types: [], departments: [], status: 'all',
}

export default function EmployeesPage() {
  const { workers, createWorker, setEmployeeStatus } = useWorkforce()
  const [showForm, setShowForm] = useState(false)
  const [created, setCreated] = useState<{ name: string; token: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const [query, setQuery] = useState('')
  const [formError, setFormError] = useState('')
  const [form, setForm] = useState(EMPTY_FORM)
  const [exitFor, setExitFor] = useState<string | null>(null)
  const [exitDate, setExitDate] = useState('')

  // Required-document checklist for this worker profile; HR can toggle each mandatory/optional before sending.
  const [docReqs, setDocReqs] = useState(() => docRequirements({ type: EMPTY_FORM.type, location: EMPTY_FORM.location }).map(d => ({ ...d })))
  useEffect(() => {
    setDocReqs(docRequirements({ type: form.type, location: form.location, contractorMode: form.contractorMode }).map(d => ({ ...d })))
  }, [form.type, form.location, form.contractorMode])
  const toggleDocMandatory = (key: string) => setDocReqs(rs => rs.map(r => r.key === key ? { ...r, mandatory: !r.mandatory } : r))

  const [showFilters, setShowFilters] = useState(false)
  const [preset, setPreset] = useState<string | null>(null)
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
  const [previewId, setPreviewId] = useState<string | null>(null)
  const preview = previewId ? workers.find(w => w.id === previewId) || null : null

  // Deep-link: open a worker's details when arriving with ?worker=<id> (e.g. from the org chart).
  const linkedWorker = useQueryParam('worker')
  useEffect(() => { if (linkedWorker) setPreviewId(linkedWorker) }, [linkedWorker])

  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const linkFor = (token: string) => `${origin}/onboard/${token}`

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    if (!form.firstName || !form.lastName || !form.personalEmail || !form.designation || !form.dateOfJoining) return

    // Duplicate-email prevention (see 02-FEATURES.md, "FIX #1"): one email = one worker.
    const emailLower = form.personalEmail.trim().toLowerCase()
    const dupe = workers.find(w => w.personalEmail.toLowerCase() === emailLower || w.professionalEmail.toLowerCase() === emailLower)
    if (dupe) {
      setFormError(`Email already registered to ${dupe.name} (${dupe.type}, ${STAGE_META[dupe.stage].label}). Use a different email or check if this is the same person.`)
      return
    }

    const payload = {
      ...form,
      professionalEmail: form.professionalEmail || `${form.firstName}.${form.lastName}`.toLowerCase() + '@katbotz.com',
      status: 'active' as EmployeeStatus,
    }
    const documents = docReqs.map(d => ({ key: d.key, label: d.label, mandatory: d.mandatory, link: d.link, status: 'not_uploaded' as const }))
    const w = createWorker(payload, documents)
    setCreated({ name: w.name, token: w.token })
    setShowForm(false)
    setForm(EMPTY_FORM)
  }

  const copy = (token: string) => {
    navigator.clipboard?.writeText(linkFor(token))
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const confirmExit = (workerId: string) => {
    setEmployeeStatus(workerId, 'inactive', exitDate || undefined)
    setExitFor(null)
    setExitDate('')
  }

  const applyPreset = (p: typeof PRESETS[number]) => {
    if (preset === p.label) {
      setPreset(null)
      setFilters(f => ({ ...f, status: 'all', types: [] }))
      return
    }
    setPreset(p.label)
    setFilters(f => ({ ...f, status: p.status, types: [p.type] }))
  }

  const toggleType = (t: WorkerType) => {
    setPreset(null)
    setFilters(f => ({ ...f, types: f.types.includes(t) ? f.types.filter(x => x !== t) : [...f.types, t] }))
  }
  const toggleDept = (d: string) => {
    setFilters(f => ({ ...f, departments: f.departments.includes(d) ? f.departments.filter(x => x !== d) : [...f.departments, d] }))
  }

  const activeFilterCount =
    filters.types.length + filters.departments.length + (filters.status !== 'all' ? 1 : 0)

  const clearFilters = () => { setFilters(EMPTY_FILTERS); setPreset(null) }

  const filtered = useMemo(() => workers.filter(w => {
    if (query) {
      const q = query.toLowerCase()
      if (!w.name.toLowerCase().includes(q) && !w.type.toLowerCase().includes(q) && !w.department.toLowerCase().includes(q) && !w.designation.toLowerCase().includes(q)) return false
    }
    if (filters.types.length && !filters.types.includes(w.type)) return false
    if (filters.departments.length && !filters.departments.includes(w.department)) return false
    if (filters.status !== 'all' && w.status !== filters.status) return false
    return true
  }), [workers, query, filters])

  return (
    <>
      <Sidebar />
      <div className="min-h-screen bg-brand-off-white with-sidebar">
        <header className="bg-white border-b border-brand-gray sticky top-0 z-10">
          <div className="px-8 py-5 flex justify-between items-center">
            <div>
              <Link href="/dashboard?role=admin" className="text-brand-slate-gray hover:text-brand-royal-blue text-sm">← Dashboard</Link>
              <h1 className="text-2xl font-bold text-brand-charcoal mt-1">Employees</h1>
            </div>
            <button onClick={() => setShowForm(v => !v)} className="btn-primary">
              {showForm ? 'Cancel' : '+ Create Worker'}
            </button>
          </div>
        </header>

        <main className="px-8 py-7 space-y-6">
          {/* Token success banner */}
          {created && (
            <div className="bg-white rounded-2xl border-2 border-brand-royal-blue p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-bold text-brand-charcoal">Onboarding link ready for {created.name}</h2>
                  <p className="text-sm text-brand-slate-gray mt-1">Send this to the worker&apos;s personal email. It expires in 7 days. No account is created yet — zero cost.</p>
                </div>
                <button onClick={() => setCreated(null)} className="text-brand-slate-gray hover:text-brand-charcoal text-xl leading-none">×</button>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <code className="flex-1 min-w-0 text-sm bg-brand-off-white border border-brand-gray rounded-lg px-4 py-2.5 text-brand-royal-blue overflow-x-auto whitespace-nowrap">
                  {linkFor(created.token)}
                </code>
                <button onClick={() => copy(created.token)} className="btn-primary whitespace-nowrap">{copied ? 'Copied!' : 'Copy Link'}</button>
                <Link href={`/onboard/${created.token}`} className="btn-ghost whitespace-nowrap">Open</Link>
              </div>
            </div>
          )}

          {/* Create form */}
          {showForm && (
            <div className="bg-white rounded-2xl border border-brand-gray p-6">
              <h2 className="text-lg font-bold text-brand-charcoal mb-5">Create Worker</h2>
              {formError && (
                <div className="mb-4 p-3 bg-brand-burgundy bg-opacity-10 border border-brand-burgundy rounded-lg">
                  <p className="text-sm text-brand-burgundy">{formError}</p>
                </div>
              )}
              <form onSubmit={submit} className="space-y-6">
                <FormSection title="Identity">
                  <Field label="First Name *"><input value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} required /></Field>
                  <Field label="Last Name *"><input value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} required /></Field>
                  <Field label="Gender">
                    <select value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value as Gender })}>
                      {GENDERS.map(g => <option key={g}>{g}</option>)}
                    </select>
                  </Field>
                  <Field label="Date of Birth"><input type="date" value={form.dob} onChange={e => setForm({ ...form, dob: e.target.value })} /></Field>
                  <div className="md:col-span-2">
                    <Field label="About">
                      <textarea value={form.about} onChange={e => setForm({ ...form, about: e.target.value })} rows={2} placeholder="Short bio..." />
                    </Field>
                  </div>
                </FormSection>

                <FormSection title="Contact">
                  <Field label="Personal Email * (link goes here)">
                    <input type="email" value={form.personalEmail} onChange={e => setForm({ ...form, personalEmail: e.target.value })} placeholder="personal@gmail.com" required />
                  </Field>
                  <Field label="Professional Email (created after verification)">
                    <input type="email" value={form.professionalEmail} onChange={e => setForm({ ...form, professionalEmail: e.target.value })} placeholder="name@katbotz.com" />
                  </Field>
                  <Field label="Phone Number"><input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+91 90000 00000" /></Field>
                </FormSection>

                <FormSection title="Region">
                  <Field label="Country">
                    <select value={form.country} onChange={e => setForm({ ...form, country: e.target.value })}>
                      {COUNTRIES.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </Field>
                  <Field label="Timezone">
                    <select value={form.timezone} onChange={e => setForm({ ...form, timezone: e.target.value })}>
                      {TIMEZONES.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </Field>
                </FormSection>

                <FormSection title="Employment">
                  <Field label="Worker Type">
                    <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value as WorkerType })}>
                      {TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </Field>
                  {form.type === 'Contractor' && (
                    <Field label="Engagement Mode">
                      <select value={form.contractorMode} onChange={e => setForm({ ...form, contractorMode: e.target.value as ContractorMode })}>
                        <option value="independent">Independent Contractor</option>
                        <option value="c2c">Staffing Agency / C2C</option>
                      </select>
                    </Field>
                  )}
                  <Field label="Employment Type">
                    <select value={form.employmentType} onChange={e => setForm({ ...form, employmentType: e.target.value as EmploymentType })}>
                      {EMPLOYMENT_TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </Field>
                  <Field label="Designation *"><input value={form.designation} onChange={e => setForm({ ...form, designation: e.target.value })} placeholder="e.g. Senior Developer" required /></Field>
                  <Field label="Department">
                    <select value={form.department} onChange={e => setForm({ ...form, department: e.target.value })}>
                      {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
                    </select>
                  </Field>
                  <Field label="HR Lead">
                    <select value={form.hrLead} onChange={e => setForm({ ...form, hrLead: e.target.value })}>
                      {LEADS.map(l => <option key={l}>{l}</option>)}
                    </select>
                  </Field>
                  <Field label="Location">
                    <select value={form.location} onChange={e => setForm({ ...form, location: e.target.value })}>
                      {LOCATIONS.map(l => <option key={l}>{l}</option>)}
                    </select>
                  </Field>
                  <Field label="Date of Joining *"><input type="date" value={form.dateOfJoining} onChange={e => setForm({ ...form, dateOfJoining: e.target.value })} required /></Field>
                  <div className="md:col-span-2">
                    <span className="block text-sm font-medium text-brand-charcoal mb-1.5">Team Lead(s) — one or more</span>
                    <div className="flex flex-wrap gap-2">
                      {LEADS.map(l => {
                        const on = form.teamLeads.includes(l)
                        return (
                          <button key={l} type="button"
                            onClick={() => setForm({ ...form, teamLeads: on ? form.teamLeads.filter(x => x !== l) : [...form.teamLeads, l] })}
                            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition border ${on ? 'bg-brand-royal-blue text-white border-brand-royal-blue' : 'bg-white text-brand-charcoal border-brand-gray hover:bg-brand-off-white'}`}>
                            {l}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </FormSection>

                <FormSection title="Document Requirements">
                  <div className="md:col-span-2">
                    <p className="text-sm text-brand-slate-gray mb-3">
                      Auto-selected for <span className="font-medium text-brand-charcoal">{form.location === 'US' ? 'USA' : 'India'} · {form.type}{form.type === 'Contractor' ? ` · ${form.contractorMode === 'c2c' ? 'Staffing Agency / C2C' : 'Independent'}` : ''}</span>. Toggle each as mandatory or optional — the worker must upload all mandatory documents.
                    </p>
                    <div className="space-y-1.5">
                      {docReqs.map(d => (
                        <div key={d.key} className="flex items-center justify-between gap-3 p-2.5 rounded-xl border border-brand-gray">
                          <span className="text-sm text-brand-charcoal">
                            {d.label}
                            {d.link && <a href={d.link} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="ml-2 text-xs text-brand-royal-blue hover:underline">Download →</a>}
                          </span>
                          <button type="button" onClick={() => toggleDocMandatory(d.key)}
                            className={`text-[11px] font-semibold px-2.5 py-1 rounded-full flex-shrink-0 transition ${d.mandatory ? 'bg-brand-royal-blue text-white' : 'bg-brand-off-white text-brand-slate-gray border border-brand-gray'}`}>
                            {d.mandatory ? 'Mandatory' : 'Optional'}
                          </button>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-brand-slate-gray mt-2">{docReqs.filter(d => d.mandatory).length} mandatory · {docReqs.filter(d => !d.mandatory).length} optional</p>
                  </div>
                </FormSection>

                <div className="flex justify-end">
                  <button type="submit" className="btn-primary">Generate Token &amp; Link</button>
                </div>
              </form>
            </div>
          )}

          {/* Search + filters */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 flex-1 min-w-[240px]">
                <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search name, type, department, designation..." className="w-full max-w-sm px-4 py-2 border border-brand-gray rounded-xl bg-white text-sm" />
                <button onClick={() => setShowFilters(v => !v)} className="btn-ghost text-sm whitespace-nowrap">
                  Filters {activeFilterCount > 0 && <span className="ml-1 bg-brand-royal-blue text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{activeFilterCount}</span>}
                </button>
                {activeFilterCount > 0 && <button onClick={clearFilters} className="text-xs text-brand-slate-gray hover:text-brand-burgundy whitespace-nowrap">Clear all</button>}
              </div>
              <p className="text-sm text-brand-slate-gray whitespace-nowrap">{filtered.length} of {workers.length}</p>
            </div>

            {/* Quick presets */}
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
              <div className="bg-white rounded-2xl border border-brand-gray p-5 grid grid-cols-1 md:grid-cols-3 gap-5">
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
                <div>
                  <p className="text-xs font-semibold text-brand-slate-gray uppercase tracking-wide mb-2">Employee Status</p>
                  <select value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value as EmployeeStatus | 'all' })}>
                    <option value="all">All</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Worker grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map(w => {
              const approved = w.documents.filter(d => d.status === 'approved').length
              const total = w.documents.length
              const meta = STAGE_META[w.stage]
              const age = ageFromDob(w.dob)
              return (
                <div key={w.id} className={`bg-white rounded-2xl border p-5 hover:shadow-lg transition-all ${w.status === 'inactive' ? 'border-brand-gray opacity-70' : 'border-brand-gray'}`}>
                  <div className="flex items-start justify-between">
                    <button onClick={() => setPreviewId(w.id)} className="flex items-center gap-3 text-left min-w-0 group">
                      <div className="w-11 h-11 rounded-full bg-brand-powder-blue text-brand-royal-blue flex items-center justify-center font-semibold flex-shrink-0">
                        {w.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-brand-charcoal leading-tight group-hover:text-brand-royal-blue transition-colors truncate">{w.name}</h3>
                        <p className="text-xs text-brand-slate-gray truncate">{w.designation} · {w.department}</p>
                      </div>
                    </button>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ color: meta.color, background: meta.bg }}>{meta.label}</span>
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${w.status === 'active' ? 'text-emerald-700 bg-emerald-50' : 'text-brand-burgundy bg-red-50'}`}>
                        {w.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 space-y-1 text-sm text-brand-slate-gray">
                    <p>{w.accountCreated ? w.professionalEmail : w.personalEmail}</p>
                    <p className="text-xs">{w.phone ? `${w.phone} · ` : ''}{w.location}</p>
                    <p className="text-xs">HR: {w.hrLead} · Team: {w.teamLeads.join(', ')}</p>
                    <p className="text-xs">
                      {w.type} · {w.employmentType} · Joined {fmtDate(w.dateOfJoining)} ({experienceDuration(w.dateOfJoining)})
                      {age !== null && ` · Age ${age}`}
                    </p>
                    {w.status === 'inactive' && w.dateOfExit && <p className="text-xs text-brand-burgundy">Exited {fmtDate(w.dateOfExit)}</p>}
                  </div>

                  {/* Doc progress */}
                  <div className="mt-4">
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-brand-slate-gray">Documents</span>
                      <span className="font-semibold text-brand-charcoal">{approved}/{total} verified</span>
                    </div>
                    <div className="w-full bg-brand-off-white rounded-full h-2 overflow-hidden">
                      <div className="h-full rounded-full bg-brand-royal-blue transition-all" style={{ width: `${(approved / total) * 100}%` }} />
                    </div>
                  </div>

                  {/* Projects */}
                  {w.projects.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {w.projects.map(p => (
                        <span key={p.id} className="text-[11px] font-medium px-2 py-1 rounded-lg bg-brand-off-white text-brand-charcoal">
                          {p.name} <span className="text-brand-slate-gray">· {p.lead}</span>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* View details */}
                  <button onClick={() => setPreviewId(w.id)}
                    className="mt-4 w-full text-sm py-2 rounded-lg bg-brand-royal-blue text-white hover:bg-opacity-90 transition font-medium">
                    View Employee Details
                  </button>

                  {/* Status toggle */}
                  {w.status === 'active' ? (
                    <button onClick={() => { setExitFor(exitFor === w.id ? null : w.id); setExitDate('') }}
                      className="mt-2 w-full text-sm py-2 rounded-lg border border-brand-gray text-brand-burgundy hover:bg-red-50 transition">
                      {exitFor === w.id ? 'Cancel' : 'Mark Inactive'}
                    </button>
                  ) : (
                    <button onClick={() => setEmployeeStatus(w.id, 'active')}
                      className="mt-2 w-full text-sm py-2 rounded-lg border border-brand-gray text-emerald-700 hover:bg-emerald-50 transition">
                      Reactivate
                    </button>
                  )}
                  {exitFor === w.id && (
                    <div className="mt-3 space-y-2 p-3 bg-red-50 rounded-xl">
                      <label className="block">
                        <span className="block text-xs font-medium text-brand-charcoal mb-1">Date of Exit</span>
                        <input type="date" value={exitDate} onChange={e => setExitDate(e.target.value)} />
                      </label>
                      <button onClick={() => confirmExit(w.id)} className="btn-primary w-full text-sm" style={{ background: '#800020' }}>Confirm Inactive</button>
                    </div>
                  )}
                </div>
              )
            })}
            {filtered.length === 0 && (
              <div className="col-span-full bg-white rounded-2xl border border-brand-gray p-10 text-center text-brand-slate-gray">No workers match these filters.</div>
            )}
          </div>
        </main>

        {preview && (
          <WorkerPreview
            worker={preview}
            onClose={() => setPreviewId(null)}
          />
        )}
      </div>
    </>
  )
}

/* ---------- Full profile slide-over (view + edit + manage documents) ---------- */
type PreviewWorker = import('@/app/lib/workforceStore').Worker
type Draft = Pick<PreviewWorker,
  'firstName' | 'lastName' | 'gender' | 'dob' | 'about' | 'personalEmail' | 'professionalEmail' | 'phone' |
  'address' | 'state' | 'country' | 'pincode' | 'timezone' | 'type' | 'employmentType' | 'designation' |
  'department' | 'hrLead' | 'teamLeads' | 'location' | 'dateOfJoining' | 'workExperience'>

function WorkerPreview({ worker: w, onClose }: {
  worker: PreviewWorker
  onClose: () => void
}) {
  const { updateWorker, leaveRequests } = useWorkforce()
  const approved = w.documents.filter(d => d.status === 'approved').length
  const age = ageFromDob(w.dob)
  const meta = STAGE_META[w.stage]
  const perf = computePerformance(w)
  const life = lifecycleStage(w)
  const lifeMeta = LIFECYCLE_META[life]
  const stones = milestones(w)
  const journey = journeyEvents(w, leaveRequests)

  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<Draft>(pickDraft(w))
  const [viewDoc, setViewDoc] = useState<PreviewWorker['documents'][number] | null>(null)

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft(d => ({ ...d, [k]: v }))
  const startEdit = () => { setDraft(pickDraft(w)); setEditing(true) }
  const save = () => { updateWorker(w.id, draft); setEditing(false) }

  // Close on Escape (but let Escape cancel edit first).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') editing ? setEditing(false) : onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, editing])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-brand-charcoal/40 backdrop-blur-sm animate-fade-in" onClick={() => editing ? setEditing(false) : onClose()} />

      <div className="relative w-full max-w-2xl max-h-[90vh] bg-brand-off-white rounded-2xl overflow-y-auto shadow-2xl animate-scale-in">
        {/* header */}
        <div className="sticky top-0 bg-brand-royal-blue text-white px-6 py-5 flex items-start justify-between z-10 rounded-t-2xl">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-14 h-14 rounded-full bg-white/15 flex items-center justify-center font-bold text-lg flex-shrink-0">
              {w.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-white truncate">{w.name}</h2>
              <p className="text-white/70 text-sm truncate">{w.designation} · {w.department}</p>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white/15">{meta.label}</span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white/15">{life}</span>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${w.status === 'active' ? 'bg-emerald-500/30' : 'bg-red-500/30'}`}>
                  {w.status === 'active' ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
            {!editing ? (
              <button onClick={startEdit} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 transition">Edit</button>
            ) : (
              <>
                <button onClick={save} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-white text-brand-royal-blue hover:bg-brand-powder-blue transition">Save</button>
                <button onClick={() => setEditing(false)} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 transition">Cancel</button>
              </>
            )}
            <button onClick={() => editing ? setEditing(false) : onClose()} className="text-white/70 hover:text-white text-2xl leading-none">×</button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* quick stats */}
          <div className="grid grid-cols-3 gap-3">
            <PreviewStat label="Documents" value={`${approved}/${w.documents.length}`} />
            <PreviewStat label="Experience" value={experienceDuration(w.dateOfJoining)} />
            <PreviewStat label="Perf. score" value={`${perf.score}`} />
          </div>

          <PreviewSection title="Identity">
            {editing ? (
              <>
                <ERow label="First name"><input value={draft.firstName} onChange={e => set('firstName', e.target.value)} /></ERow>
                <ERow label="Last name"><input value={draft.lastName} onChange={e => set('lastName', e.target.value)} /></ERow>
                <ERow label="Gender">
                  <select value={draft.gender} onChange={e => set('gender', e.target.value as Draft['gender'])}>{GENDERS.map(g => <option key={g}>{g}</option>)}</select>
                </ERow>
                <ERow label="Date of birth"><input type="date" value={draft.dob || ''} onChange={e => set('dob', e.target.value)} /></ERow>
                <ERow label="About"><textarea rows={2} value={draft.about || ''} onChange={e => set('about', e.target.value)} /></ERow>
              </>
            ) : (
              <>
                <Row label="First name" value={w.firstName} />
                <Row label="Last name" value={w.lastName} />
                <Row label="Gender" value={w.gender} />
                <Row label="Date of birth" value={w.dob ? fmtDate(w.dob) : '—'} />
                <Row label="Age" value={age !== null ? `${age}` : '—'} />
                <Row label="About" value={w.about || '—'} />
              </>
            )}
          </PreviewSection>

          <PreviewSection title="Contact">
            {editing ? (
              <>
                <ERow label="Personal email"><input type="email" value={draft.personalEmail} onChange={e => set('personalEmail', e.target.value)} /></ERow>
                <ERow label="Professional email"><input type="email" value={draft.professionalEmail} onChange={e => set('professionalEmail', e.target.value)} /></ERow>
                <ERow label="Phone"><input type="tel" value={draft.phone} onChange={e => set('phone', e.target.value)} /></ERow>
              </>
            ) : (
              <>
                <Row label="Personal email" value={w.personalEmail} />
                <Row label="Professional email" value={w.professionalEmail} />
                <Row label="Phone" value={w.phone} />
              </>
            )}
          </PreviewSection>

          <PreviewSection title="Address">
            {editing ? (
              <>
                <ERow label="Address"><input value={draft.address} onChange={e => set('address', e.target.value)} /></ERow>
                <ERow label="State"><input value={draft.state} onChange={e => set('state', e.target.value)} /></ERow>
                <ERow label="Country">
                  <select value={draft.country} onChange={e => set('country', e.target.value)}>{COUNTRIES.map(c => <option key={c}>{c}</option>)}</select>
                </ERow>
                <ERow label="Pincode"><input value={draft.pincode} onChange={e => set('pincode', e.target.value)} /></ERow>
                <ERow label="Timezone">
                  <select value={draft.timezone} onChange={e => set('timezone', e.target.value)}>{TIMEZONES.map(t => <option key={t}>{t}</option>)}</select>
                </ERow>
              </>
            ) : (
              <>
                <Row label="Address" value={w.address} />
                <Row label="State" value={w.state} />
                <Row label="Country" value={w.country} />
                <Row label="Pincode" value={w.pincode} />
                <Row label="Timezone" value={w.timezone} />
              </>
            )}
          </PreviewSection>

          <PreviewSection title="Employment">
            {editing ? (
              <>
                <ERow label="Worker type">
                  <select value={draft.type} onChange={e => set('type', e.target.value as Draft['type'])}>{TYPES.map(t => <option key={t}>{t}</option>)}</select>
                </ERow>
                <ERow label="Employment type">
                  <select value={draft.employmentType} onChange={e => set('employmentType', e.target.value as Draft['employmentType'])}>{EMPLOYMENT_TYPES.map(t => <option key={t}>{t}</option>)}</select>
                </ERow>
                <ERow label="Designation"><input value={draft.designation} onChange={e => set('designation', e.target.value)} /></ERow>
                <ERow label="Department">
                  <select value={draft.department} onChange={e => set('department', e.target.value)}>{DEPARTMENTS.map(d => <option key={d}>{d}</option>)}</select>
                </ERow>
                <ERow label="HR lead">
                  <select value={draft.hrLead} onChange={e => set('hrLead', e.target.value)}>{LEADS.map(l => <option key={l}>{l}</option>)}</select>
                </ERow>
                <ERow label="Team lead(s)">
                  <div className="flex flex-wrap gap-1.5 justify-end">
                    {LEADS.map(l => {
                      const on = draft.teamLeads.includes(l)
                      return (
                        <button key={l} type="button"
                          onClick={() => set('teamLeads', on ? draft.teamLeads.filter(x => x !== l) : [...draft.teamLeads, l])}
                          className={`px-2 py-1 rounded-full text-[11px] font-semibold transition border ${on ? 'bg-brand-royal-blue text-white border-brand-royal-blue' : 'bg-white text-brand-charcoal border-brand-gray'}`}>
                          {l}
                        </button>
                      )
                    })}
                  </div>
                </ERow>
                <ERow label="Location">
                  <select value={draft.location} onChange={e => set('location', e.target.value)}>{LOCATIONS.map(l => <option key={l}>{l}</option>)}</select>
                </ERow>
                <ERow label="Date of joining"><input type="date" value={draft.dateOfJoining} onChange={e => set('dateOfJoining', e.target.value)} /></ERow>
                <ERow label="Prior experience"><input value={draft.workExperience || ''} onChange={e => set('workExperience', e.target.value)} /></ERow>
              </>
            ) : (
              <>
                <Row label="Worker type" value={w.type} />
                <Row label="Employment type" value={w.employmentType} />
                <Row label="Designation" value={w.designation} />
                <Row label="Department" value={w.department} />
                <Row label="HR lead" value={w.hrLead} />
                <Row label="Team lead(s)" value={w.teamLeads.join(', ') || '—'} />
                <Row label="Location" value={w.location} />
                <Row label="Date of joining" value={fmtDate(w.dateOfJoining)} />
                <Row label="Current experience" value={experienceDuration(w.dateOfJoining)} />
                <Row label="Prior experience" value={w.workExperience || '—'} />
                {w.status === 'inactive' && <Row label="Date of exit" value={w.dateOfExit ? fmtDate(w.dateOfExit) : '—'} />}
              </>
            )}
          </PreviewSection>

          {/* Lifecycle */}
          <PreviewSection title="Lifecycle">
            <div className="flex items-center justify-between py-1.5">
              <span className="text-sm text-brand-slate-gray">Current stage</span>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ color: lifeMeta.color, background: lifeMeta.bg }}>{life}</span>
            </div>
            <div className="pt-2">
              <p className="text-xs font-semibold text-brand-slate-gray uppercase tracking-wide mb-2">Milestones</p>
              <div className="space-y-1.5">
                {stones.map(m => (
                  <div key={m.label} className="flex items-center justify-between text-sm">
                    <span className={m.done ? 'text-brand-slate-gray line-through' : 'text-brand-charcoal'}>
                      {m.done ? '✓ ' : ''}{m.label}
                    </span>
                    <span className="text-xs text-brand-slate-gray">{fmtDate(m.date)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="pt-3">
              <p className="text-xs font-semibold text-brand-slate-gray uppercase tracking-wide mb-2">Journey</p>
              <div className="relative pl-5">
                <span className="absolute left-1.5 top-1 bottom-1 w-px bg-brand-gray" />
                {journey.map((e, i) => (
                  <div key={i} className="relative pb-3 last:pb-0">
                    <span className="absolute -left-[14px] top-1 w-2.5 h-2.5 rounded-full ring-4 ring-brand-off-white" style={{ background: e.color }} />
                    <p className="text-sm text-brand-charcoal">{e.label}</p>
                    <p className="text-xs text-brand-slate-gray">{fmtDate(e.date)}</p>
                  </div>
                ))}
              </div>
            </div>
          </PreviewSection>

          {/* Documents — read-only (verification happens in the Onboarding section) */}
          <PreviewSection title={`Documents (${approved}/${w.documents.length} verified)`}>
            {w.documents.map(d => {
              const uploaded = d.status !== 'not_uploaded'
              return (
                <div key={d.key} className="flex items-center justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <p className="text-sm text-brand-charcoal">
                      {d.label}
                      {d.mandatory === false && <span className="ml-2 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-brand-off-white text-brand-slate-gray border border-brand-gray align-middle">Optional</span>}
                    </p>
                    {d.fileName && <p className="text-xs text-brand-slate-gray truncate">{d.fileName}</p>}
                    {d.status === 'rejected' && d.reason && <p className="text-xs text-brand-burgundy">Rejected: {d.reason}</p>}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {uploaded && (
                      <button onClick={() => setViewDoc(d)} className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-brand-gray text-brand-royal-blue hover:bg-brand-off-white transition">View</button>
                    )}
                    <DocPill status={d.status} />
                  </div>
                </div>
              )
            })}
          </PreviewSection>

          {/* Projects */}
          {w.projects.length > 0 && (
            <PreviewSection title="Projects">
              {w.projects.map(p => (
                <div key={p.id} className="flex items-center justify-between py-1.5">
                  <div>
                    <p className="text-sm text-brand-charcoal">{p.name}</p>
                    <p className="text-xs text-brand-slate-gray">Lead: {p.lead} · from {fmtDate(p.startDate)}</p>
                  </div>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-brand-off-white text-brand-charcoal capitalize">{p.status.replace('_', ' ')}</span>
                </div>
              ))}
            </PreviewSection>
          )}

          {/* Goals */}
          {w.goals.length > 0 && (
            <PreviewSection title="Goals">
              {w.goals.map(g => (
                <div key={g.id} className="flex items-center justify-between py-1.5">
                  <span className={`text-sm ${g.status === 'completed' ? 'line-through text-brand-slate-gray' : 'text-brand-charcoal'}`}>
                    <span className="text-[10px] uppercase tracking-wide text-brand-slate-gray mr-1.5">{g.period}</span>{g.title}
                  </span>
                  <span className="text-xs text-brand-slate-gray capitalize">{g.status.replace('_', ' ')}</span>
                </div>
              ))}
            </PreviewSection>
          )}
        </div>
      </div>

      {/* Document viewer — demo scan (random placeholder image) */}
      {viewDoc && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center p-6" onClick={() => setViewDoc(null)}>
          <div className="absolute inset-0 bg-brand-charcoal/70 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl overflow-hidden shadow-2xl max-w-lg w-full animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-3 border-b border-brand-gray flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-brand-charcoal truncate">{viewDoc.label}</p>
                <p className="text-xs text-brand-slate-gray truncate">{viewDoc.fileName || 'scan.jpg'} · demo scan</p>
              </div>
              <button onClick={() => setViewDoc(null)} className="text-brand-slate-gray hover:text-brand-charcoal text-2xl leading-none flex-shrink-0">×</button>
            </div>
            <img
              src={demoScan(`${w.id}-${viewDoc.key}`, viewDoc.label, w.name)}
              alt={`${viewDoc.label} (demo)`}
              className="w-full h-auto block bg-brand-off-white"
            />
            <div className="px-5 py-2.5 bg-brand-off-white">
              <p className="text-[11px] text-brand-slate-gray">Placeholder image for demo purposes — no real document is stored.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function pickDraft(w: PreviewWorker): Draft {
  return {
    firstName: w.firstName, lastName: w.lastName, gender: w.gender, dob: w.dob, about: w.about,
    personalEmail: w.personalEmail, professionalEmail: w.professionalEmail, phone: w.phone,
    address: w.address, state: w.state, country: w.country, pincode: w.pincode, timezone: w.timezone,
    type: w.type, employmentType: w.employmentType, designation: w.designation, department: w.department,
    hrLead: w.hrLead, teamLeads: [...w.teamLeads], location: w.location, dateOfJoining: w.dateOfJoining,
    workExperience: w.workExperience,
  }
}

function ERow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="text-sm text-brand-slate-gray flex-shrink-0">{label}</span>
      <div className="w-56 max-w-[60%]">{children}</div>
    </div>
  )
}

function PreviewStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-xl border border-brand-gray p-3 text-center">
      <p className="text-lg font-bold text-brand-charcoal">{value}</p>
      <p className="text-[11px] text-brand-slate-gray mt-0.5">{label}</p>
    </div>
  )
}
/* Self-contained demo "document scan" — an inline SVG data URI (no network needed). */
function demoScan(seed: string, label: string, owner: string): string {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  const hue = h % 360
  const band = `hsl(${hue} 55% 42%)`
  const tint = `hsl(${hue} 60% 96%)`
  const line = (x: number, y: number, wid: number) => `<rect x="${x}" y="${y}" width="${wid}" height="8" rx="4" fill="#CBD5E1"/>`
  const initials = owner.split(' ').map(n => n[0]).slice(0, 2).join('')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="480" viewBox="0 0 720 480">
    <rect width="720" height="480" fill="${tint}"/>
    <rect x="40" y="40" width="640" height="400" rx="14" fill="#ffffff" stroke="#E2E8F0" stroke-width="2"/>
    <rect x="40" y="40" width="640" height="64" rx="14" fill="${band}"/>
    <rect x="40" y="86" width="640" height="18" fill="${band}"/>
    <text x="66" y="82" font-family="Arial, sans-serif" font-size="22" font-weight="700" fill="#ffffff">${label.replace(/&/g, '&amp;').slice(0, 40)}</text>
    <rect x="66" y="140" width="150" height="180" rx="8" fill="${tint}" stroke="#CBD5E1" stroke-width="2"/>
    <circle cx="141" cy="205" r="42" fill="${band}" opacity="0.85"/>
    <text x="141" y="217" text-anchor="middle" font-family="Arial, sans-serif" font-size="34" font-weight="700" fill="#ffffff">${initials}</text>
    <rect x="66" y="332" width="150" height="12" rx="6" fill="#CBD5E1"/>
    ${line(250, 150, 380)}${line(250, 182, 320)}${line(250, 214, 360)}${line(250, 246, 260)}${line(250, 278, 340)}${line(250, 310, 300)}
    <rect x="250" y="352" width="180" height="40" rx="6" fill="none" stroke="#CBD5E1" stroke-width="2" stroke-dasharray="6 5"/>
    <text x="340" y="377" text-anchor="middle" font-family="Arial, sans-serif" font-size="13" fill="#94A3B8">Signature</text>
    <text x="654" y="420" text-anchor="end" font-family="Arial, sans-serif" font-size="12" fill="#94A3B8">DEMO · not a real document</text>
  </svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

function PreviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-brand-gray p-5">
      <h3 className="text-sm font-semibold text-brand-royal-blue uppercase tracking-wide mb-3">{title}</h3>
      <div className="divide-y divide-brand-gray/60">{children}</div>
    </div>
  )
}
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5">
      <span className="text-sm text-brand-slate-gray flex-shrink-0">{label}</span>
      <span className="text-sm text-brand-charcoal text-right break-words">{value}</span>
    </div>
  )
}
function DocPill({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    not_uploaded: { label: 'Awaiting', color: '#64748B', bg: '#F1F5F9' },
    pending: { label: 'Pending', color: '#B45309', bg: '#FEF3E2' },
    approved: { label: 'Verified', color: '#0F7A46', bg: '#E8F6EF' },
    rejected: { label: 'Rejected', color: '#800020', bg: '#F7E7EA' },
  }
  const m = map[status] || map.not_uploaded
  return <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ color: m.color, background: m.bg }}>{m.label}</span>
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-brand-royal-blue uppercase tracking-wide mb-3">{title}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-brand-charcoal mb-1.5">{label}</span>
      {children}
    </label>
  )
}
