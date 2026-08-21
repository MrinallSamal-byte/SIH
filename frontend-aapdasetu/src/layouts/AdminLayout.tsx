import { useState } from 'react'
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
  ArrowLeft,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react'
import AapdaSetuLogo from '../components/common/AapdaSetuLogo'
import { useAuth, useIsAdminAuthed } from '../hooks/useAuth'
import { useLanguage } from '../lib/i18n'

interface AdminView {
  to: string
  labelKey: string
  icon: typeof LayoutDashboard
  end?: boolean
}

const adminViews: AdminView[] = [
  { to: '/admin', labelKey: 'adminNav.dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/live-sos', labelKey: 'adminNav.liveSos', icon: Siren },
  { to: '/admin/damage', labelKey: 'adminNav.damage', icon: FileText },
  { to: '/admin/reports', labelKey: 'adminNav.reports', icon: FileText },
  { to: '/admin/shelters', labelKey: 'adminNav.shelters', icon: Tent },
  { to: '/admin/volunteers', labelKey: 'adminNav.volunteers', icon: Users },
  { to: '/admin/agencies', labelKey: 'adminNav.agencies', icon: Building2 },
  { to: '/admin/missing-persons', labelKey: 'adminNav.missingPersons', icon: Search },
  { to: '/admin/alerts', labelKey: 'adminNav.alerts', icon: Megaphone },
  { to: '/admin/analytics', labelKey: 'adminNav.analytics', icon: TrendingUp },
  { to: '/admin/safety-checkins', labelKey: 'adminNav.safetyCheckins', icon: ShieldCheck },
  { to: '/admin/audit', labelKey: 'adminNav.audit', icon: FileText },
  { to: '/admin/settings', labelKey: 'adminNav.settings', icon: Settings },
]

export default function AdminLayout() {
  const { t } = useLanguage()
  const isAuthed = useIsAdminAuthed()
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)

  if (!isAuthed) {
    return <Navigate to="/admin/login" replace />
  }

  const handleLogout = () => {
    logout()
    navigate('/admin/login')
  }

  return (
    // h-screen + overflow-hidden keeps the sidebar fixed; only the main column scrolls
    <div className="flex h-screen overflow-hidden bg-slate-100 dark:bg-slate-950">
      {/* Admin Sidebar */}
      <aside className={`flex flex-col border-r border-slate-800 bg-zinc-800 text-slate-100 transition-[width] duration-200 ${collapsed ? 'w-16' : 'w-64'}`}>
        {/* Brand Header */}
        <div className={`flex items-center gap-3 border-b border-slate-800 px-3 py-4 ${collapsed ? 'justify-center' : 'px-5'}`}>
          <AapdaSetuLogo size={32} />
          {!collapsed && (
            <div className="min-w-0">
              <div className="text-sm font-bold tracking-tight text-white truncate">{t('adminNav.title')}</div>
              <div className="text-[11px] text-slate-400 truncate">{t('adminNav.subtitle')}</div>
            </div>
          )}
        </div>

        {/* Collapse toggle */}
        <div className={`border-b border-slate-800 p-2 ${collapsed ? 'flex justify-center' : 'flex justify-end'}`}>
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? t('adminNav.expandSidebar') : t('adminNav.collapseSidebar')}
            title={collapsed ? t('adminNav.expandSidebar') : t('adminNav.collapseSidebar')}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-zinc-700 hover:text-slate-100 cursor-pointer"
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 space-y-1 overflow-y-auto overflow-x-hidden p-2">
          {adminViews.map((v) => {
            const Icon = v.icon
            const labelText = t(v.labelKey)
            return (
              <NavLink
                key={v.to}
                to={v.to}
                end={v.end}
                title={labelText}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                    collapsed ? 'justify-center px-0' : ''
                  } ${
                    isActive
                      ? 'bg-slate-100 text-slate-950 font-bold'
                      : 'text-slate-400 hover:bg-zinc-700 hover:text-slate-200'
                  }`
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span className="truncate">{labelText}</span>}
              </NavLink>
            )
          })}
        </nav>

        {/* User & Exit */}
        <div className="border-t border-slate-800 p-2 space-y-2">
          {!collapsed && user?.email && (
            <div className="flex items-center gap-2 px-3 py-1.5 text-[11px] text-slate-400 truncate">
              <User className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{user.email}</span>
            </div>
          )}
          {collapsed ? (
            <button
              onClick={handleLogout}
              aria-label={t('adminNav.exit')}
              title={t('adminNav.exit')}
              className="flex w-full items-center justify-center rounded-lg border border-red-900/40 bg-red-950/40 px-3 py-2 text-xs font-semibold text-red-300 hover:bg-red-900/60 cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <Link
                to="/"
                className="flex items-center justify-center gap-1.5 flex-1 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-2 text-center text-xs font-medium text-slate-300 hover:bg-slate-700"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>{t('adminNav.publicApp')}</span>
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1 rounded-lg border border-red-900/40 bg-red-950/40 px-3 py-2 text-xs font-semibold text-red-300 hover:bg-red-900/60 cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>{t('adminNav.exit')}</span>
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <main className="flex-1 p-6 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
