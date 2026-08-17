import type { Metadata } from 'next'
import './globals.css'
import { WorkforceProvider } from './lib/workforceStore'
import { OrgProvider } from './lib/orgStore'

export const metadata: Metadata = {
  title: 'WOP - Workforce Operations Platform',
  description: 'HR Management System with verification-first onboarding',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-brand-light-gray text-brand-navy">
        <WorkforceProvider><OrgProvider>{children}</OrgProvider></WorkforceProvider>
      </body>
    </html>
  )
}
