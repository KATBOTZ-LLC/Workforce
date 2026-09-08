'use client'

import Link from 'next/link'
import { useQueryParam } from '@/app/lib/useQueryParam'
import { useWorkforce } from '@/app/lib/workforceStore'

export default function Sidebar() {
  const userRole = useQueryParam('role') as 'admin' | 'employee' | null
  const workerId = useQueryParam('worker')
  const { workerById } = useWorkforce()
  const me = workerId ? workerById(workerId) : undefined
  const wq = workerId ? `&worker=${workerId}` : ''

  // Admin menu items
  const adminMenu = [
    { icon: '', label: 'Dashboard', href: '/dashboard?role=admin' },
    { icon: '', label: 'Employees', href: '/employees?role=admin' },
    { icon: '', label: 'Organization', href: '/organization?role=admin' },
    { icon: '', label: 'Onboarding & Docs', href: '/documents?role=admin' },
    { icon: '', label: 'Tasks', href: '/tasks?role=admin' },
    { icon: '', label: 'Attendance', href: '/attendance?role=admin' },
    { icon: '', label: 'Leave', href: '/leave?role=admin' },
    { icon: '', label: 'Approvals', href: '/approvals?role=admin' },
    { icon: '', label: 'Performance', href: '/performance?role=admin' },
    { icon: '', label: 'Handbook', href: '/handbook?role=admin' },
    { icon: '', label: 'Notifications', href: '/notifications?role=admin' },
    { icon: '', label: 'Settings', href: '/settings?role=admin' },
  ]

  // Employee menu items — carry the worker id so every page knows who's signed in
  const employeeMenu = [
    { icon: '', label: 'Dashboard', href: `/dashboard?role=employee${wq}` },
    { icon: '', label: 'My Onboarding', href: `/onboarding?role=employee${wq}` },
    { icon: '', label: 'My Documents', href: `/documents?role=employee${wq}` },
    { icon: '', label: 'My Tasks', href: `/tasks?role=employee${wq}` },
    { icon: '', label: 'My Notebook', href: `/notebook?role=employee${wq}` },
    { icon: '', label: 'My Attendance', href: `/attendance?role=employee${wq}` },
    { icon: '', label: 'My Leave', href: `/leave?role=employee${wq}` },
    { icon: '', label: 'My Performance', href: `/performance?role=employee${wq}` },
    { icon: '', label: 'Handbook', href: `/handbook?role=employee${wq}` },
    { icon: '', label: 'Notifications', href: `/notifications?role=employee${wq}` },
  ]

  const menuItems = userRole === 'admin' ? adminMenu : employeeMenu

  return (
    <aside className="w-64 bg-brand-royal-blue text-white h-screen fixed left-0 top-0 overflow-y-auto">
      {/* Logo */}
      <div className="p-4 border-b border-brand-primary border-opacity-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center flex-shrink-0 p-1">
            <img src="/w-logo.png" alt="Workforce" className="w-full h-full object-contain" />
          </div>
          <div>
            <h2 className="font-wordmark text-sm font-bold tracking-wide text-white">WORKFORCE</h2>
            <p className="text-xs text-gray-300">Built for Modern Teams</p>
          </div>
        </div>
      </div>

      {/* Menu */}
      <nav className="p-4 space-y-2">
        {menuItems.map((item, idx) => (
          <Link
            key={idx}
            href={item.href}
            className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white hover:bg-opacity-10 transition-colors text-sm"
          >
            <span className="text-lg">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* User Profile */}
      <div className="absolute bottom-0 left-0 right-0 border-t border-brand-primary border-opacity-20 p-4 bg-brand-royal-blue">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 bg-brand-primary rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-xs">
              {userRole === 'employee' && me ? me.name.split(' ').map(n => n[0]).slice(0, 2).join('') : 'HR'}
            </span>
          </div>
          <div className="text-sm min-w-0">
            <p className="font-medium truncate">{userRole === 'employee' && me ? me.name : 'HR Manager'}</p>
            <p className="text-gray-300 text-xs truncate">{userRole === 'employee' && me ? (me.accountCreated ? me.professionalEmail : me.personalEmail) : 'hr@company.com'}</p>
          </div>
        </div>
        <button
          onClick={() => (window.location.href = '/')}
          className="w-full mt-3 px-3 py-2 text-xs bg-brand-error rounded hover:bg-opacity-90 transition-colors"
        >
          Logout
        </button>
      </div>
    </aside>
  )
}
