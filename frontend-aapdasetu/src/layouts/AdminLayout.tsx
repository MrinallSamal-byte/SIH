import { Link, NavLink, Outlet, Navigate, useNavigate } from 'react-router-dom'
import { useDemoMode } from '../hooks/useDemoMode'
import { useAuth, useIsAdminAuthed } from '../hooks/useAuth'

const adminViews = [
  { to: '/admin', label: 'Overview & Analytics', end: true, icon: '📊' },
  { to: '/admin/live-sos', label: 'Live SOS Stream', icon: '🚨' },
  { to: '/admin/reports', label: 'Incident Reports', icon: '📋' },
  { to: '/admin/volunteers', label: 'Field Volunteers', icon: '🧑‍🚒' },
  { to: '/admin/shelters', label: 'Shelter Network', icon: '🏕️' },
  { to: '/admin/missing-persons', label: 'Missing Persons', icon: '🔍' },
  { to: '/admin/agencies', label: 'Disaster Agencies', icon: '🏢' },
  { to: '/admin/communications', label: 'Broadcast Alerts', icon: '📢' },
  { to: '/admin/analytics', label: 'Crisis Charts', icon: '📈' },
  { to: '/admin/audit', label: 'Audit Trail', icon: '🛡️' },
  { to: '/admin/settings', label: 'System Settings', icon: '⚙️' },
]

export default function AdminLayout() {
  const authed = useIsAdminAuthed()
  const { logout, user } = useAuth()
  const navigate = useNavigate()
  const demo = useDemoMode()

  if (!authed) return <Navigate to="/admin/login" replace />

  const handleLogout = () => {
    logout()
    navigate('/admin/login')
  }

  return (
    <div className="flex min-h-screen bg-slate-100 dark:bg-slate-950">
      {/* Admin Sidebar */}
      <aside className="flex w-64 flex-col border-r border-slate-800 bg-slate-900 text-slate-100">
        {/* Brand Header */}
        <div className="flex items-center gap-3 border-b border-slate-800 px-5 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 font-bold text-white text-xs">
            ICS
          </div>
          <div>
            <div className="text-sm font-bold tracking-tight text-white">AapdaSetu Command</div>
            <div className="text-[11px] text-slate-400">Emergency Ops Center</div>
          </div>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {adminViews.map((v) => (
            <NavLink
              key={v.to}
              to={v.to}
              end={v.end}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white font-bold'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`
              }
            >
              <span className="text-sm">{v.icon}</span>
              <span>{v.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User & Exit */}
        <div className="border-t border-slate-800 p-3 space-y-2">
          {user?.email && (
            <div className="px-3 py-1.5 text-[11px] text-slate-400 truncate">
              👤 {user.email}
            </div>
          )}
          <div className="flex items-center justify-between gap-2">
            <Link
              to="/"
              className="flex-1 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-2 text-center text-xs font-medium text-slate-300 hover:bg-slate-700"
            >
              ← Public App
            </Link>
            <button
              onClick={handleLogout}
              className="rounded-lg border border-red-900/40 bg-red-950/40 px-3 py-2 text-xs font-semibold text-red-300 hover:bg-red-900/60"
            >
              Exit
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {demo && (
          <div className="bg-amber-400 px-4 py-1 text-center text-xs font-semibold text-slate-950">
            Field Simulation Active (Mock Fallback Enabled)
          </div>
        )}
        <main className="flex-1 p-6 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

