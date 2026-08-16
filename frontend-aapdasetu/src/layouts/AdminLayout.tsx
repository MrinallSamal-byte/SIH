import { NavLink, Outlet, Navigate, useNavigate } from 'react-router-dom'
import { useDemoMode } from '../hooks/useDemoMode'
import { useAuth, useIsAdminAuthed } from '../hooks/useAuth'

const adminViews = [
  { to: '/admin', label: 'Overview & KPI', end: true },
  { to: '/admin/live-sos', label: 'Live SOS Stream' },
  { to: '/admin/reports', label: 'Incident Reports' },
  { to: '/admin/missing-persons', label: 'Missing Persons' },
  { to: '/admin/volunteers', label: 'Volunteers' },
  { to: '/admin/shelters', label: 'Shelters' },
  { to: '/admin/agencies', label: 'Agencies' },
  { to: '/admin/communications', label: 'Alert Broadcaster' },
  { to: '/admin/analytics', label: 'Analytics' },
  { to: '/admin/audit', label: 'Audit Logs' },
  { to: '/admin/settings', label: 'Settings' },
]

export default function AdminLayout() {
  const authed = useIsAdminAuthed()
  const { logout } = useAuth()
  const navigate = useNavigate()
  const demo = useDemoMode()

  if (!authed) return <Navigate to="/admin/login" replace />

  const handleLogout = () => {
    logout()
    navigate('/admin/login')
  }

  return (
    <div className="flex min-h-screen dark:bg-slate-900">
      <aside className="flex w-60 flex-col bg-slate-900 text-white dark:bg-slate-900">
        <div className="border-b border-slate-700 px-4 py-4">
          <div className="text-sm font-bold">AapdaSetu Command Center</div>
          <div className="text-xs text-slate-400">Multi-Agency ICS Dashboard</div>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
          {adminViews.map((v) => (
            <NavLink
              key={v.to}
              to={v.to}
              end={v.end}
              className={({ isActive }) =>
                `block rounded px-3 py-2 text-sm ${
                  isActive ? 'bg-blue-600 font-semibold' : 'text-slate-300 hover:bg-slate-800'
                }`
              }
            >
              {v.label}
            </NavLink>
          ))}
        </nav>
        <div className="space-y-2 border-t border-slate-700 p-3">
          <button
            onClick={handleLogout}
            className="w-full rounded bg-slate-800 px-3 py-2 text-left text-sm text-slate-300 hover:bg-slate-700"
          >
            ← Sign out
          </button>
        </div>
      </aside>
      <div className="flex-1 overflow-y-auto">
        {demo && (
          <div className="bg-amber-400 px-4 py-1 text-center text-xs font-semibold text-slate-900">
            Demo data (backend not connected) - see src/api/endpoints.ts & src/api/ai.ts
          </div>
        )}
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
