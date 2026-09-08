'use client'

/**
 * Live Database — the frontend reading PostgreSQL through the API.
 *
 * This page exists to make one claim checkable rather than asserted: the schema
 * in WF-001_Schema_Blueprint.docx is a real, running database, and access is
 * derived from the org chart on every request rather than stored anywhere.
 *
 * Switching who you are signed in as re-runs every panel below. Nothing on this
 * page filters by tier in the browser — the lists get shorter because the
 * database returned less.
 */

import { useCallback, useEffect, useState } from 'react'
import { clearSession, fetchMe, getSessionToken, MeProfile } from '../lib/authClient'
import Onboarding from './Onboarding'
import {
  ApiError, DevSignIn, DirectoryEntry, HeadcountRow,
  devLogin, fetchDevSignIn, fetchDirectory, fetchHeadcount, searchDirectory,
} from '../lib/liveApi'

const TIER_STYLE: Record<string, string> = {
  founder: 'bg-brand-royal-blue text-white',
  hr: 'bg-brand-powder-blue text-brand-royal-blue',
  hr_admin: 'bg-brand-powder-blue text-brand-royal-blue',
  employee: 'bg-brand-gray text-brand-dark-gray',
  intern: 'bg-brand-warm-stone text-brand-dark-gray',
}

function Tier({ tier }: { tier: string }) {
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${TIER_STYLE[tier] || 'bg-brand-gray'}`}>
      {tier === 'hr_admin' ? 'hr' : tier}
    </span>
  )
}

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-brand-gray bg-white p-5 shadow-sm">
      <h2 className="text-sm font-bold uppercase tracking-wide text-brand-royal-blue">{title}</h2>
      {subtitle && <p className="mt-1 text-xs text-brand-slate">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </section>
  )
}

export default function LivePage() {
  const [dev, setDev] = useState<DevSignIn | null>(null)
  const [passcode, setPasscode] = useState('')
  const [me, setMe] = useState<MeProfile | null>(null)
  const [directory, setDirectory] = useState<DirectoryEntry[]>([])
  const [headcount, setHeadcount] = useState<HeadcountRow[] | null>(null)
  const [headcountDenied, setHeadcountDenied] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<DirectoryEntry[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const token = getSessionToken()
    if (!token) { setMe(null); setDirectory([]); setHeadcount(null); return }
    setBusy(true); setError(null)
    try {
      setMe(await fetchMe(token))
      setDirectory(await fetchDirectory())
      // A 403 here is the expected, correct answer for an ordinary employee. It
      // is shown as the rule that produced it, not as a failure.
      try {
        setHeadcount(await fetchHeadcount()); setHeadcountDenied(null)
      } catch (e) {
        setHeadcount(null)
        setHeadcountDenied(e instanceof ApiError && e.status === 403 ? e.message : String(e))
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      if (e instanceof ApiError && e.status === 401) clearSession()
    } finally {
      setBusy(false)
    }
  }, [])

  useEffect(() => { fetchDevSignIn().then(setDev) }, [])

  async function unlock(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const next = await fetchDevSignIn(passcode)
    if (next && next.emails.length === 0) setError('Wrong passcode.')
    setDev(next)
  }
  useEffect(() => { load() }, [load])

  async function signInAs(email: string) {
    setBusy(true); setError(null); setResults(null); setQuery('')
    try { await devLogin(email, passcode || undefined); await load() }
    catch (e) { setError(e instanceof Error ? e.message : String(e)); setBusy(false) }
  }

  async function runSearch(e: React.FormEvent) {
    e.preventDefault()
    if (query.trim().length < 2) { setResults(null); return }
    try { setResults(await searchDirectory(query.trim())) }
    catch (err) { setError(err instanceof Error ? err.message : String(err)) }
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-slate">
          Workforce Platform · WF-001
        </p>
        <h1 className="mt-1 text-3xl font-bold text-brand-royal-blue">Live Database</h1>
        <p className="mt-2 max-w-3xl text-sm text-brand-slate">
          Every number on this page is a query against PostgreSQL — 37 tables, 54 foreign keys,
          as approved in the schema blueprint. Access tier is not stored anywhere; it is resolved
          from the org chart on each request. Change who you are signed in as and watch what the
          database is willing to return.
        </p>
      </header>

      {error && (
        <div className="mb-6 rounded border border-brand-burgundy bg-red-50 px-4 py-3 text-sm text-brand-burgundy">
          {error}
        </div>
      )}

      <div className="grid gap-6">
        <Card
          title="Signed in as"
          subtitle={dev
            ? 'Dev-only sign-in (WF_DEV_LOGIN=1). Real Google Sign-In needs an OAuth client id from the KATBOTZ cloud console.'
            : 'Dev sign-in is not enabled. Start the backend with WF_DEV_LOGIN=1 to use this page.'}
        >
          {me ? (
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              <div>
                <div className="text-lg font-semibold text-brand-navy">{me.display_name}</div>
                <div className="text-xs text-brand-slate">{me.email}</div>
              </div>
              <div className="text-sm text-brand-dark-gray">{me.role_title || '—'}</div>
              <div className="text-sm text-brand-slate">{me.department || '—'}</div>
              <Tier tier={me.tier} />
              <div className="text-xs text-brand-slate">
                sees {me.visible_person_ids === 'all' ? 'everyone' : `${me.visible_person_ids.length} person(s)`}
              </div>
              <button
                onClick={() => { clearSession(); load() }}
                className="ml-auto rounded border border-brand-gray px-3 py-1 text-xs text-brand-slate hover:bg-brand-light-gray"
              >
                Sign out
              </button>
            </div>
          ) : (
            <p className="text-sm text-brand-slate">Not signed in.</p>
          )}

          {dev && dev.passcodeRequired && dev.emails.length === 0 && (
            <form onSubmit={unlock} className="mt-4 flex gap-2 border-t border-brand-gray pt-4">
              <input
                type="password" value={passcode} onChange={(e) => setPasscode(e.target.value)}
                placeholder="Demo passcode"
                className="flex-1 rounded border border-brand-gray px-3 py-2 text-sm outline-none focus:border-brand-royal-blue"
              />
              <button className="rounded bg-brand-royal-blue px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
                Unlock
              </button>
            </form>
          )}

          {dev && dev.emails.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2 border-t border-brand-gray pt-4">
              {['ashish.katyayan@katbotz.com', 'akshat@katbotz.com', 'ananya@katbotz.com', 'koushika@katbotz.com']
                .filter((e) => dev.emails.includes(e))
                .map((email) => (
                  <button
                    key={email}
                    disabled={busy}
                    onClick={() => signInAs(email)}
                    className={`rounded border px-3 py-1.5 text-xs transition disabled:opacity-40 ${
                      me?.email === email
                        ? 'border-brand-royal-blue bg-brand-royal-blue text-white'
                        : 'border-brand-gray text-brand-dark-gray hover:border-brand-royal-blue'
                    }`}
                  >
                    {email}
                  </button>
                ))}
            </div>
          )}
        </Card>

        {me && <Onboarding canOnboard={me.tier === 'founder' || me.tier === 'hr'} />}

        <Card
          title="Headcount by department"
          subtitle="Counted from ROLE, because this is the org chart. Restricted to the founder and HR tiers by the database, not by this page."
        >
          {headcountDenied ? (
            <p className="rounded bg-brand-light-gray px-3 py-2 text-sm text-brand-slate">
              <span className="font-semibold text-brand-burgundy">403 </span>{headcountDenied}
            </p>
          ) : headcount ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-brand-gray text-left text-xs uppercase tracking-wide text-brand-slate">
                  <th className="pb-2">Department</th>
                  <th className="pb-2 text-right">People</th>
                  <th className="pb-2 text-right">Filled seats</th>
                  <th className="pb-2 text-right">Open seats</th>
                </tr>
              </thead>
              <tbody>
                {headcount.map((r) => (
                  <tr key={r.department} className="border-b border-brand-light-gray">
                    <td className="py-1.5 text-brand-navy">{r.department}</td>
                    <td className="py-1.5 text-right font-semibold">{r.people}</td>
                    <td className="py-1.5 text-right text-brand-slate">{r.filled_seats}</td>
                    <td className="py-1.5 text-right text-brand-slate">
                      {r.open_seats > 0 ? <span className="text-brand-warning font-semibold">{r.open_seats}</span> : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-brand-slate">Sign in to load.</p>
          )}
        </Card>

        <Card
          title="Directory search"
          subtitle="Trigram index on PERSON — tolerant of misspelling, so no separate search product is needed. Try 'Akshit' or 'Koushka'."
        >
          <form onSubmit={runSearch} className="flex gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search a name, spelled roughly"
              className="flex-1 rounded border border-brand-gray px-3 py-2 text-sm outline-none focus:border-brand-royal-blue"
            />
            <button className="rounded bg-brand-royal-blue px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
              Search
            </button>
          </form>
          {results && (
            <p className="mt-3 text-sm text-brand-dark-gray">
              {results.length === 0
                ? 'No match above the similarity threshold.'
                : results.map((r) => r.display_name).join(', ')}
            </p>
          )}
        </Card>

        <Card
          title={`Directory — ${directory.length} ${directory.length === 1 ? 'person' : 'people'} visible`}
          subtitle="A person may hold several seats at once; exactly one is primary. Date of birth is a restricted field and is never selected by this query."
        >
          {directory.length === 0 ? (
            <p className="text-sm text-brand-slate">Sign in to load.</p>
          ) : (
            <div className="divide-y divide-brand-light-gray">
              {directory.map((p) => (
                <div key={p.person_id} className="flex flex-wrap items-start gap-x-4 gap-y-1 py-2.5">
                  <div className="w-48 shrink-0">
                    <div className="text-sm font-semibold text-brand-navy">{p.display_name}</div>
                    <div className="text-[11px] text-brand-slate">{p.email || '—'}</div>
                  </div>
                  <Tier tier={p.resolved_tier} />
                  <div className="flex flex-1 flex-wrap gap-1.5">
                    {p.seats.length === 0 && <span className="text-xs italic text-brand-slate">no current seat</span>}
                    {p.seats.map((s) => (
                      <span
                        key={s.role_id}
                        title={`${s.department}${s.is_primary ? ' · primary seat' : ''}`}
                        className={`rounded px-2 py-0.5 text-[11px] ${
                          s.is_primary
                            ? 'border border-brand-royal-blue bg-brand-powder-blue text-brand-royal-blue'
                            : 'border border-brand-gray text-brand-slate'
                        }`}
                      >
                        {s.title} <span className="opacity-60">· {s.department}</span>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </main>
  )
}
