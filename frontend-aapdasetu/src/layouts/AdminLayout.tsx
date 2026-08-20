import { Link, NavLink, Outlet, Navigate, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Siren,
  FileText,
  Users,
  Tent,
  Search,
  Building2,
  Megaphone,
  TrendingUp,
  ShieldCheck,
  Settings,
  User,
  LogOut,
  ArrowLeft
} from 'lucide-react'
import AapdaSetuLogo from '../components/common/AapdaSetuLogo'
import { useDemoMode } from '../hooks/useDemoMode'
import { useAuth, useIsAdminAuthed } from '../hooks/useAuth'

interface AdminView {
  to: string
  label: string
  icon: typeof LayoutDashboard
  end?: boolean
}

const adminViews: AdminView[] = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/live-sos', label: 'Live SOS Distress', icon: Siren },
  { to: '/admin/damage', label: 'Damage Assessment', icon: FileText },
  { to: '/admin/reports', label: 'Incident Triage', icon: FileText },
  { to: '/admin/shelters', label: 'Shelter Network', icon: Tent },
  { to: '/admin/volunteers', label: 'Volunteer Force', icon: Users },
  { to: '/admin/agencies', label: 'Agency Dispatch', icon: Building2 },
  { to: '/admin/missing-persons', label: 'Missing Persons', icon: Search },
  { to: '/admin/alerts', label: 'Broadcast Alerts', icon: Megaphone },
  { to: '/admin/analytics', label: 'Predictive & Intel', icon: TrendingUp },
  { to: '/admin/safety-checkins', label: 'Safety Registry', icon: ShieldCheck },
  { to: '/admin/audit', label: 'Security Audit Log', icon: FileText },
  { to: '/admin/settings', label: 'System Settings', icon: Settings },
]

export default function AdminLayout() {
  const isAuthed = useIsAdminAuthed()
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const demo = useDemoMode()

  if (!isAuthed) {
    return <Navigate to="/admin/login" replace />
  }

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
          <AapdaSetuLogo size={32} />
          <div>
            <div className="text-sm font-bold tracking-tight text-white">AapdaSetu Command</div>
            <div className="text-[11px] text-slate-400">Emergency Ops Center</div>
          </div>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {adminViews.map((v) => {
            const Icon = v.icon
            return (
              <NavLink
                key={v.to}
                to={v.to}
                end={v.end}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                    isActive
                      ? 'bg-slate-100 text-slate-950 font-bold'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{v.label}</span>
              </NavLink>
            )
          })}
        </nav>

        {/* User & Exit */}
        <div className="border-t border-slate-800 p-3 space-y-2">
          {user?.email && (
            <div className="flex items-center gap-2 px-3 py-1.5 text-[11px] text-slate-400 truncate">
              <User className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{user.email}</span>
            </div>
          )}
          <div className="flex items-center justify-between gap-2">
            <Link
              to="/"
              className="flex items-center justify-center gap-1.5 flex-1 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-2 text-center text-xs font-medium text-slate-300 hover:bg-slate-700"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Public App</span>
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 rounded-lg border border-red-900/40 bg-red-950/40 px-3 py-2 text-xs font-semibold text-red-300 hover:bg-red-900/60 cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Exit</span>
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
