'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import Sidebar from '@/app/layout/Sidebar'
import { useQueryParam } from '@/app/lib/useQueryParam'
import {
  HANDBOOK,
  HANDBOOK_ISSUED,
  HANDBOOK_PDF,
  HANDBOOK_VERSION,
  SCOPE_LABELS,
  type Block,
  type Chapter,
  type Part,
  type Scope,
} from '@/app/lib/handbookContent'

export const dynamic = 'force-dynamic'

/* ─────────────────────────────── inline text ─────────────────────────────── */

// Splits on **bold**, absolute URLs, and email addresses — capture groups keep
// the delimiters in the result so each token can be rendered on its own.
const INLINE = /(\*\*[^*]+\*\*|https?:\/\/[^\s,;)]*[^\s,;).]|[\w.+-]+@[\w-]+\.[\w.]+)/g

function inline(text: string): React.ReactNode {
  return text
    .split(INLINE)
    .filter(Boolean)
    .map((tok, i) => {
      if (tok.startsWith('**') && tok.endsWith('**')) {
        return <strong key={i} className="font-semibold">{tok.slice(2, -2)}</strong>
      }
      if (/^https?:\/\//.test(tok)) {
        return (
          <a key={i} href={tok} target="_blank" rel="noreferrer" className="break-all hover:underline">
            {tok}
          </a>
        )
      }
      if (/^[\w.+-]+@[\w-]+\.[\w.]+$/.test(tok)) {
        return <a key={i} href={`mailto:${tok}`} className="hover:underline">{tok}</a>
      }
      return <span key={i}>{tok}</span>
    })
}

/* ──────────────────────────────── blocks ─────────────────────────────────── */

function BlockView({ block }: { block: Block }) {
  switch (block.t) {
    case 'p':
      return <p>{inline(block.text)}</p>

    case 'h':
      return <h3 className="text-sm font-bold text-brand-charcoal pt-2">{inline(block.text)}</h3>

    case 'ul':
      return (
        <ul className="list-disc pl-5 space-y-1.5">
          {block.items.map((it, i) => <li key={i}>{inline(it)}</li>)}
        </ul>
      )

    case 'ol':
      return (
        <ol className="list-decimal pl-5 space-y-1.5">
          {block.items.map((it, i) => <li key={i}>{inline(it)}</li>)}
        </ol>
      )

    case 'table':
      return (
        <div className="overflow-x-auto -mx-1 px-1">
          <table className="w-full min-w-[520px] text-[13px] border-collapse">
            <thead>
              <tr>
                {block.head.map((h, i) => (
                  <th
                    key={i}
                    className="text-left align-bottom font-semibold text-brand-charcoal bg-brand-off-white border-b-2 border-brand-gray px-3 py-2"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, r) => (
                <tr key={r} className="align-top">
                  {row.map((cell, c) => (
                    <td
                      key={c}
                      className={`border-b border-brand-gray px-3 py-2 leading-snug ${c === 0 ? 'font-medium text-brand-charcoal' : 'text-brand-dark-gray'}`}
                    >
                      {inline(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )

    case 'note':
      return (
        <div className="border-l-[3px] border-brand-royal-blue bg-brand-off-white rounded-r-lg px-4 py-3">
          {inline(block.text)}
        </div>
      )

    case 'formula':
      return (
        <div className="bg-brand-charcoal text-white rounded-lg px-4 py-3 font-mono text-[12.5px] leading-relaxed overflow-x-auto">
          {block.lines.map((l, i) => <div key={i} className="whitespace-nowrap">{l}</div>)}
        </div>
      )

    case 'check':
      return (
        <ul className="space-y-2">
          {block.items.map((it, i) => (
            <li key={i} className="flex gap-2.5">
              <span className="mt-[3px] w-4 h-4 rounded border-2 border-brand-slate-gray flex-shrink-0" aria-hidden />
              <span>{inline(it)}</span>
            </li>
          ))}
        </ul>
      )

    case 'sign':
      return (
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 pt-1">
          {block.fields.map((f, i) => (
            <div key={i}>
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-brand-slate-gray">{f}</dt>
              <dd className="border-b border-brand-slate-gray/50 h-7" />
            </div>
          ))}
        </dl>
      )
  }
}

/* ──────────────────────────────── search ─────────────────────────────────── */

function blockText(b: Block): string {
  switch (b.t) {
    case 'p':
    case 'h':
    case 'note':
      return b.text
    case 'ul':
    case 'ol':
    case 'check':
      return b.items.join(' ')
    case 'formula':
      return b.lines.join(' ')
    case 'sign':
      return b.fields.join(' ')
    case 'table':
      return [...b.head, ...b.rows.flat()].join(' ')
  }
}

/** Lowercased haystack per chapter, built once. */
const SEARCH_INDEX = new Map<string, string>(
  HANDBOOK.flatMap(part =>
    part.chapters.map(ch =>
      [ch.id, `${part.title} ${ch.num} ${ch.title} ${ch.blocks.map(blockText).join(' ')}`.toLowerCase()] as const,
    ),
  ),
)

const SCOPE_FILTERS: { key: Scope | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'global', label: SCOPE_LABELS.global },
  { key: 'us', label: SCOPE_LABELS.us },
  { key: 'india', label: SCOPE_LABELS.india },
  { key: 'appendix', label: SCOPE_LABELS.appendix },
]

/* ───────────────────────────────── page ──────────────────────────────────── */

export default function HandbookPage() {
  const role = useQueryParam('role')
  const workerId = useQueryParam('worker')
  const backHref = role === 'employee' ? `/dashboard?role=employee&worker=${workerId || ''}` : '/dashboard?role=admin'

  const [query, setQuery] = useState('')
  const [scope, setScope] = useState<Scope | 'all'>('all')

  const visible: Part[] = useMemo(() => {
    const q = query.trim().toLowerCase()
    return HANDBOOK.map(part => {
      if (scope !== 'all' && part.scope !== scope) return null
      const chapters = q
        ? part.chapters.filter(ch => (SEARCH_INDEX.get(ch.id) || '').includes(q))
        : part.chapters
      return chapters.length ? { ...part, chapters } : null
    }).filter((p): p is Part => p !== null)
  }, [query, scope])

  const matchCount = visible.reduce((n, p) => n + p.chapters.length, 0)
  const isFiltered = query.trim().length > 0 || scope !== 'all'

  return (
    <>
      <Sidebar />
      <div className="min-h-screen bg-brand-off-white with-sidebar">
        <header className="bg-white border-b border-brand-gray sticky top-0 z-10">
          <div className="px-8 py-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <Link href={backHref} className="text-brand-slate-gray hover:text-brand-royal-blue text-sm">← Dashboard</Link>
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mt-1">
                  <h1 className="text-2xl font-bold text-brand-charcoal">Global Employee Handbook</h1>
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-brand-royal-blue bg-brand-powder-blue rounded-full px-2.5 py-1">
                    {HANDBOOK_VERSION}
                  </span>
                </div>
                <p className="text-sm text-brand-slate-gray mt-0.5">
                  KATBOTZ LLC (United States) &amp; KATBOTZ India Private Limited · {HANDBOOK_ISSUED}
                </p>
              </div>

              <a href={HANDBOOK_PDF} download
                className="flex-shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-royal-blue text-white text-sm font-semibold shadow-sm hover:opacity-90 transition">
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Download PDF
              </a>
            </div>

            {/* controls */}
            <div className="flex flex-wrap items-center gap-2 mt-4">
              <input
                type="search"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search policies, leave types, states…"
                aria-label="Search the handbook"
                className="w-full sm:w-80 px-3.5 py-2 text-sm border border-brand-gray rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-royal-blue focus:border-transparent"
              />
              <div className="flex flex-wrap gap-1.5">
                {SCOPE_FILTERS.map(f => (
                  <button
                    key={f.key}
                    onClick={() => setScope(f.key)}
                    className={`px-3 py-1.5 rounded-lg text-[13px] font-medium border transition ${
                      scope === f.key
                        ? 'bg-brand-royal-blue text-white border-brand-royal-blue'
                        : 'bg-white text-brand-charcoal border-brand-gray hover:border-brand-royal-blue'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              {isFiltered && (
                <span className="text-xs text-brand-slate-gray">
                  {matchCount} section{matchCount === 1 ? '' : 's'}
                </span>
              )}
            </div>
          </div>
        </header>

        <main className="px-8 py-7">
          <div className="max-w-6xl grid grid-cols-1 lg:grid-cols-[250px_1fr] gap-8">
            {/* table of contents */}
            <nav className="hidden lg:block">
              <div className="sticky top-56 max-h-[calc(100vh-16rem)] overflow-y-auto bg-white rounded-2xl border border-brand-gray p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-slate-gray mb-2 px-1">Contents</p>
                {visible.map(part => (
                  <div key={part.id} className="mb-3 last:mb-0">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-brand-royal-blue px-2 py-1">
                      {part.label} — {part.title}
                    </p>
                    <ul className="space-y-0.5">
                      {part.chapters.map(ch => (
                        <li key={ch.id}>
                          <a
                            href={`#${ch.id}`}
                            className="block px-2 py-1 rounded-lg text-[13px] text-brand-charcoal hover:bg-brand-off-white hover:text-brand-royal-blue transition"
                          >
                            {ch.title}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
                {!visible.length && <p className="px-2 py-1 text-[13px] text-brand-slate-gray">No matches.</p>}
              </div>
            </nav>

            {/* content */}
            <div className="space-y-5">
              <div className="bg-white rounded-2xl border border-brand-gray p-5">
                <p className="text-[11px] font-bold uppercase tracking-wide text-brand-burgundy">
                  Confidential — for internal employee use only
                </p>
                <p className="text-sm text-brand-slate-gray mt-1.5 leading-relaxed">
                  This Handbook constitutes confidential information. Unauthorized distribution is prohibited. It supplements — and
                  does not replace — your signed offer letter and employment agreement; where the two differ, the signed agreement
                  and applicable law control.
                </p>
              </div>

              {visible.map(part => (
                <section key={part.id} className="space-y-5">
                  <div className="flex items-baseline gap-3 pt-2 px-1">
                    <span className="text-[11px] font-bold uppercase tracking-wide text-white bg-brand-royal-blue rounded-full px-2.5 py-1">
                      {part.label}
                    </span>
                    <h2 className="text-lg font-bold text-brand-charcoal">{part.title}</h2>
                  </div>

                  {part.chapters.map((ch: Chapter) => (
                    <article key={ch.id} id={ch.id} className="scroll-mt-56 bg-white rounded-2xl border border-brand-gray p-6">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-[11px] font-bold text-brand-royal-blue bg-brand-powder-blue rounded-md px-2 py-1 flex-shrink-0">
                          {ch.num}
                        </span>
                        <h3 className="text-base font-bold text-brand-charcoal">{ch.title}</h3>
                      </div>
                      <div className="text-sm text-brand-charcoal leading-relaxed space-y-2.5 [&_a]:text-brand-royal-blue [&_h3]:text-brand-charcoal">
                        {ch.blocks.map((b, i) => <BlockView key={i} block={b} />)}
                      </div>
                    </article>
                  ))}
                </section>
              ))}

              {!visible.length && (
                <div className="bg-white rounded-2xl border border-brand-gray p-10 text-center">
                  <p className="text-sm text-brand-charcoal font-medium">No sections match your search.</p>
                  <button
                    onClick={() => { setQuery(''); setScope('all') }}
                    className="mt-3 text-sm text-brand-royal-blue hover:underline"
                  >
                    Clear filters
                  </button>
                </div>
              )}

              <p className="text-xs text-brand-slate-gray px-1">
                {HANDBOOK_VERSION} · {HANDBOOK_ISSUED}. HR owns the controlled version and maintains revision history. Questions?
                Contact <a href="mailto:peopleops@katbotz.com" className="text-brand-royal-blue hover:underline">peopleops@katbotz.com</a>.
              </p>
            </div>
          </div>
        </main>
      </div>
    </>
  )
}
