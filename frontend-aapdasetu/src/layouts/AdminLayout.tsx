import { useState } from 'react'
import { Link, NavLink, Outlet, Navigate, useNavigate, useLocation } from 'react-router-dom'
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
  ArrowLeft,
  Sun,
  Moon,
  Menu,
  X,
  ExternalLink
} from 'lucide-react'
import AapdaSetuLogo from '../components/common/AapdaSetuLogo'
import { useDemoMode } from '../hooks/useDemoMode'
import { useAuth, useIsAdminAuthed } from '../hooks/useAuth'
import { useTheme } from '../lib/theme'

interface AdminView {
  to: string
  label: string
  icon: typeof LayoutDashboard
  end?: boolean
  badge?: string
}

const adminViews: AdminView[] = [
  { to: '/admin', label: 'Overview & KPIs', icon: LayoutDashboard, end: true },
  { to: '/admin/live-sos', label: 'Live SOS Distress', icon: Siren, badge: 'LIVE' },
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
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  const demo = useDemoMode()
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)

  if (!isAuthed) {
    return <Navigate to="/admin/login" replace />
  }

  const handleLogout = () => {
    logout()
    navigate('/admin/login')
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {/* Desktop Admin Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-sm shrink-0">
        {/* Brand Header */}
        <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 px-5 py-4">
          <AapdaSetuLogo size={32} />
          <div>
            <div className="text-sm font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>AapdaSetu</span>
              <span className="rounded bg-red-100 px-1 py-0.2 text-[9px] font-black text-red-700 dark:bg-red-950/80 dark:text-red-300 mono">
                HQ
              </span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">Incident Command Hub</div>
          </div>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-3" aria-label="Admin Sidebar">
          {adminViews.map((v) => {
            const Icon = v.icon
            return (
              <NavLink
                key={v.to}
                to={v.to}
                end={v.end}
                className={({ isActive }) =>
                  `flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-xs dark:bg-slate-100 dark:text-slate-900 font-bold'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'
                  }`
                }
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{v.label}</span>
                </div>
                {v.badge && (
                  <span className="rounded-full bg-red-600 px-1.5 py-0.5 text-[9px] font-bold text-white uppercase tracking-wider animate-pulse mono">
                    {v.badge}
                  </span>
                )}
              </NavLink>
            )
          })}
        </nav>

        {/* User & Exit Controls */}
        <div className="border-t border-slate-200 dark:border-slate-800 p-3 space-y-2">
          {user?.email && (
            <div className="flex items-center gap-2 px-3 py-1.5 text-[11px] text-slate-500 dark:text-slate-400 truncate font-mono">
              <User className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              <span className="truncate">{user.email}</span>
            </div>
          )}
          <div className="flex items-center justify-between gap-2">
            <Link
              to="/"
              className="flex items-center justify-center gap-1.5 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-center text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Public App</span>
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-1 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-100 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-900/60 cursor-pointer transition"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Exit</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content & Top Bar Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-2.5 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/90 shadow-2xs">
          <div className="flex items-center gap-3">
            {/* Mobile Hamburger Toggle */}
            <button
              type="button"
              onClick={() => setMobileDrawerOpen((o) => !o)}
              className="rounded-lg border border-slate-200 p-1.5 text-slate-600 md:hidden hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              aria-label="Toggle navigation menu"
            >
              {mobileDrawerOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

            {/* ICS Network Active Status */}
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
              <span className="hidden sm:inline font-bold">ICS NATIONAL DISASTER COMMAND ACTIVE</span>
              <span className="sm:hidden font-bold">COMMAND ACTIVE</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Quick Public App View */}
            <Link
              to="/"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <span>Public View</span>
              <ExternalLink className="h-3 w-3" />
            </Link>

            {/* Theme Switcher Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className="rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 cursor-pointer"
              title="Toggle light/dark theme"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            {/* Admin Logout */}
            <button
              type="button"
              onClick={handleLogout}
              className="hidden sm:inline-flex items-center gap-1 rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-300"
            >
              <LogOut className="h-3 w-3" />
              <span>Logout</span>
            </button>
          </div>
        </header>

        {/* Mobile Navigation Drawer Dropdown */}
        {mobileDrawerOpen && (
          <nav className="border-b border-slate-200 bg-white p-3 shadow-lg md:hidden dark:border-slate-800 dark:bg-slate-900 animate-dropdown">
            <div className="grid grid-cols-2 gap-1">
              {adminViews.map((v) => {
                const Icon = v.icon
                return (
                  <NavLink
                    key={v.to}
                    to={v.to}
                    end={v.end}
                    onClick={() => setMobileDrawerOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-2 rounded-xl p-2.5 text-xs font-semibold transition ${
                        isActive
                          ? 'bg-slate-900 text-white font-bold dark:bg-slate-100 dark:text-slate-900'
                          : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                      }`
                    }
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{v.label}</span>
                  </NavLink>
                )
              })}
            </div>
          </nav>
        )}

        {/* Simulation Notice */}
        {demo && (
          <div className="bg-amber-500 px-4 py-1 text-center text-xs font-bold text-slate-950 shadow-xs">
            Field Simulation Active (Mock Fallback Auto-Enabled)
          </div>
        )}

        {/* Sub-view Content */}
        <main className="flex-1 p-4 sm:p-6 md:p-8">
          <div key={location.pathname} className="animate-page-enter">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
