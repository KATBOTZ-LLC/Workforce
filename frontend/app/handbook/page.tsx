'use client'

import Link from 'next/link'
import Sidebar from '@/app/layout/Sidebar'
import { useQueryParam } from '@/app/lib/useQueryParam'

export const dynamic = 'force-dynamic'

type Section = { id: string; title: string; body: React.ReactNode }

const SECTIONS: Section[] = [
  {
    id: 'welcome', title: 'Welcome to Katbotz',
    body: (
      <>
        <p>This handbook is the single reference for how we work at Katbotz — our policies, expectations, and the day-to-day essentials. It complements the Organization chart (who reports to whom) and the tools in this platform (Attendance, Leave, Documents, Performance).</p>
        <p>If anything here is unclear or out of date, reach out to your HR lead — see <a href="#contacts" className="text-brand-royal-blue hover:underline">Contacts</a>.</p>
      </>
    ),
  },
  {
    id: 'hours', title: 'Working Hours & Attendance',
    body: (
      <ul className="list-disc pl-5 space-y-1.5">
        <li>Standard working hours are <strong>9 hours/day</strong>, Monday–Friday. Compensation is hourly, so accurate clock-in/out matters.</li>
        <li>Clock in and out from the <strong>Attendance</strong> page. HR records the official daily status; raise anything that looks off with your HR lead.</li>
        <li>Company holidays are listed on the <strong>Leave</strong> page&apos;s holiday calendar.</li>
      </ul>
    ),
  },
  {
    id: 'leave', title: 'Leave Policy',
    body: (
      <ul className="list-disc pl-5 space-y-1.5">
        <li><strong>Paid Leave</strong> — 12 days per year, accrued and approved by your HR lead.</li>
        <li><strong>Unpaid Leave</strong> — available when paid balance is exhausted or for extended absences.</li>
        <li>Apply in advance from the <strong>My Leave</strong> page; requests route to <strong>Approvals</strong>. Approved leave is reflected automatically on your attendance.</li>
      </ul>
    ),
  },
  {
    id: 'conduct', title: 'Code of Conduct',
    body: (
      <ul className="list-disc pl-5 space-y-1.5">
        <li>Treat colleagues, contractors, and clients with respect. Harassment or discrimination of any kind is not tolerated.</li>
        <li>Protect confidential company and client information. Do not share access, credentials, or internal documents outside the company.</li>
        <li>Disclose conflicts of interest to your manager or HR lead.</li>
      </ul>
    ),
  },
  {
    id: 'onboarding', title: 'Onboarding & Documents',
    body: (
      <>
        <p>New joiners complete verification-first onboarding. Required documents depend on your <strong>role and location</strong> (India / US) and, for contractors, your engagement mode (Independent or Staffing Agency / C2C).</p>
        <ul className="list-disc pl-5 space-y-1.5 mt-2">
          <li>Upload each required document from your onboarding link. Mandatory items must be verified before your account is created; optional items can follow.</li>
          <li>Government forms (e.g. W-4, W-9 for US) include a download link on the document.</li>
          <li>Track status any time on <strong>My Documents</strong>.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'performance', title: 'Performance & Reviews',
    body: (
      <ul className="list-disc pl-5 space-y-1.5">
        <li>Your scorecard blends manager reviews, goal completion, attendance, and hours logged. Weights are configurable by HR in Settings.</li>
        <li>Managers hold regular 1:1s and periodic reviews (30 / 60 / 90-day and beyond). Notes and ratings live on the <strong>Performance</strong> page.</li>
        <li>Your lifecycle — onboarding, probation, active, milestones — is tracked on your profile.</li>
      </ul>
    ),
  },
  {
    id: 'it-security', title: 'IT & Security',
    body: (
      <ul className="list-disc pl-5 space-y-1.5">
        <li>Use your <strong>@katbotz.com</strong> account for all work systems. Enable two-factor authentication where available.</li>
        <li>Never share passwords or access tokens. Report lost devices or suspected breaches to HR immediately.</li>
        <li>Access to people, documents, and systems is derived from your position in the Organization chart — request changes through your manager.</li>
      </ul>
    ),
  },
  {
    id: 'contacts', title: 'Contacts',
    body: (
      <ul className="list-disc pl-5 space-y-1.5">
        <li><strong>HR / People</strong> — hr@katbotz.com</li>
        <li><strong>IT Support</strong> — it@katbotz.com</li>
        <li>For anything urgent, message your reporting manager or HR lead directly.</li>
      </ul>
    ),
  },
]

export default function HandbookPage() {
  const role = useQueryParam('role')
  const workerId = useQueryParam('worker')
  const backHref = role === 'employee' ? `/dashboard?role=employee&worker=${workerId || ''}` : '/dashboard?role=admin'

  return (
    <>
      <Sidebar />
      <div className="min-h-screen bg-brand-off-white with-sidebar">
        <header className="bg-white border-b border-brand-gray sticky top-0 z-10">
          <div className="px-8 py-5">
            <Link href={backHref} className="text-brand-slate-gray hover:text-brand-royal-blue text-sm">← Dashboard</Link>
            <h1 className="text-2xl font-bold text-brand-charcoal mt-1">Employee Handbook</h1>
            <p className="text-sm text-brand-slate-gray mt-0.5">Policies, expectations, and the essentials for working at Katbotz.</p>
          </div>
        </header>

        <main className="px-8 py-7">
          <div className="max-w-5xl grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-8">
            {/* table of contents */}
            <nav className="hidden lg:block">
              <div className="sticky top-28 bg-white rounded-2xl border border-brand-gray p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-slate-gray mb-2 px-1">Contents</p>
                <ul className="space-y-0.5">
                  {SECTIONS.map(s => (
                    <li key={s.id}>
                      <a href={`#${s.id}`} className="block px-2 py-1.5 rounded-lg text-sm text-brand-charcoal hover:bg-brand-off-white hover:text-brand-royal-blue transition">
                        {s.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </nav>

            {/* content */}
            <div className="space-y-5">
              {SECTIONS.map((s, i) => (
                <section key={s.id} id={s.id} className="scroll-mt-28 bg-white rounded-2xl border border-brand-gray p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="w-7 h-7 rounded-full bg-brand-royal-blue text-white text-xs font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                    <h2 className="text-lg font-bold text-brand-charcoal">{s.title}</h2>
                  </div>
                  <div className="text-sm text-brand-charcoal leading-relaxed space-y-2 [&_a]:text-brand-royal-blue">{s.body}</div>
                </section>
              ))}
              <p className="text-xs text-brand-slate-gray px-1">Last updated for the current organization. Questions? Contact your HR lead.</p>
            </div>
          </div>
        </main>
      </div>
    </>
  )
}
