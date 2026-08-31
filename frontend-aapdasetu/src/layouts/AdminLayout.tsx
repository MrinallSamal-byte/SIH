import { useEffect, useState } from 'react'
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
  PanelLeftOpen,
  Keyboard,
  Sun,
  Moon,
  X
} from 'lucide-react'
import AapdaSetuLogo from '../components/common/AapdaSetuLogo'
import { apiHealth } from '../api/client'
import { useAuth, useIsAdminAuthed } from '../hooks/useAuth'
import { useLanguage } from '../lib/i18n'
import { useTheme } from '../lib/theme'

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

type TranslateFn = (key: string, fallback?: string) => string

function relativeSyncTime(ts: number | null, t: TranslateFn): string {
  if (!ts || ts <= 0) return '—'
  const seconds = Math.max(0, Math.floor((Date.now() - ts) / 1000))
  if (seconds < 60) return t('adminOps.agoSeconds', '{n}s ago').replace('{n}', String(seconds))
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return t('adminOps.agoMinutes', '{n}m ago').replace('{n}', String(minutes))
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return t('adminOps.agoHours', '{n}h ago').replace('{n}', String(hours))
  return t('adminOps.agoDays', '{n}d ago').replace('{n}', String(Math.floor(hours / 24)))
}

const SHORTCUT_ROUTES: Record<string, string> = {
  r: '/admin/reports',
  s: '/admin',
  v: '/admin/volunteers',
  a: '/admin/analytics',
  l: '/admin/live-sos',
}

export default function AdminLayout() {
  const { t } = useLanguage()
  const isAuthed = useIsAdminAuthed()
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)
  const { theme, toggleTheme } = useTheme()
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [, setStatusTick] = useState(0)
  const [online, setOnline] = useState<boolean>(() => (typeof navigator !== 'undefined' ? navigator.onLine : true))

  useEffect(() => {
    const id = window.setInterval(() => setStatusTick((n) => n + 1), 10_000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    const goOnline = () => setOnline(true)
    const goOffline = () => setOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  useEffect(() => {
    let pendingG = false
    let gTimer: number | undefined

    const cancelPendingG = () => {
      pendingG = false
      if (gTimer !== undefined) window.clearTimeout(gTimer)
      gTimer = undefined
    }

    const isTypingTarget = (target: EventTarget | null): boolean => {
      if (!(target instanceof HTMLElement)) return false
      const tag = target.tagName
      return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return

      if (e.key === 'Escape') {
        setShowShortcuts(false)
        cancelPendingG()
        return
      }
      if (isTypingTarget(e.target)) return

      if (pendingG) {
        const dest = SHORTCUT_ROUTES[e.key.toLowerCase()]
        cancelPendingG()
        if (dest) {
          e.preventDefault()
          navigate(dest)
        }
        return
      }

      if (e.key === '/') {
        e.preventDefault()
        setShowShortcuts(false)
        const input = document.querySelector<HTMLInputElement>('input[data-shortcut="search"]')
        if (input) {
          input.focus()
          input.select()
        }
        return
      }

      if (e.key === '?') {
        e.preventDefault()
        setShowShortcuts((open) => !open)
        return
      }

      if (e.key.toLowerCase() === 'g') {
        pendingG = true
        gTimer = window.setTimeout(cancelPendingG, 1500)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      cancelPendingG()
    }
  }, [navigate])

  if (!isAuthed) {
    return <Navigate to="/admin/login" replace />
  }

  const handleLogout = () => {
    logout()
    navigate('/admin/login')
  }

  const lastSuccessAt = apiHealth?.lastSuccessAt ?? null
  const mode = 'OPERATIONAL'
  const pillClasses = 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
  const pillDotClasses = 'bg-emerald-500 animate-pulse'

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
      <div className="flex flex-1 flex-col min-w-0">
        {/* Ops Status Bar */}
        <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-6 py-1.5 text-[11px] dark:border-slate-800 dark:bg-slate-900">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-bold tracking-wide mono ${pillClasses}`}
            title={t('adminOps.liveHint', 'National Incident Response System Active')}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${pillDotClasses}`} />
            <span>{mode}</span>
          </span>

          <span className="flex items-center gap-1.5 font-semibold text-slate-500 dark:text-slate-400">
            <span className={`h-2 w-2 rounded-full ${online ? 'bg-emerald-500' : 'bg-red-500'}`} />
            <span>{online ? t('adminOps.online', 'Online') : t('adminOps.offline', 'Offline')}</span>
          </span>

          <span className="text-slate-400 dark:text-slate-500 mono">
            {t('adminOps.lastSync', 'Sync')} {relativeSyncTime(lastSuccessAt, t)}
          </span>

          <div className="ml-auto flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setShowShortcuts(true)}
              title={t('adminOps.shortcutsTitle', 'Keyboard shortcuts (?)')}
              aria-label={t('adminOps.shortcutsTitle', 'Keyboard shortcuts (?)')}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2 py-1 font-semibold text-slate-500 transition hover:bg-slate-50 hover:text-slate-800 cursor-pointer dark:border-white/[0.08] dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              <Keyboard className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">?</span>
            </button>
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={t('layout.toggleTheme', 'Toggle theme')}
              title={t('layout.toggleTheme', 'Toggle theme')}
              className="rounded-lg border border-slate-200 p-1.5 text-slate-500 transition hover:bg-slate-50 hover:text-slate-800 cursor-pointer dark:border-white/[0.08] dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              {theme === 'dark' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>

        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <Outlet />
        </main>
      </div>

      {/* Keyboard Shortcuts Cheat Sheet */}
      {showShortcuts && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowShortcuts(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-800 dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mono dark:text-slate-400">
                {t('adminOps.shortcutsHeading', 'Keyboard Shortcuts')}
              </h2>
              <button
                type="button"
                onClick={() => setShowShortcuts(false)}
                aria-label={t('adminOps.closeShortcuts', 'Close shortcuts')}
                className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 cursor-pointer dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <ul className="mt-3 space-y-2 text-xs text-slate-700 dark:text-slate-300">
              {[
                { keys: ['?'], label: t('adminOps.scHelp', 'Toggle this cheat sheet') },
                { keys: ['/'], label: t('adminOps.scSearch', 'Focus search') },
                { keys: ['Esc'], label: t('adminOps.scEscape', 'Close dialogs') },
                { keys: ['g', 'r'], label: t('adminNav.reports') },
                { keys: ['g', 's'], label: t('adminNav.dashboard') },
                { keys: ['g', 'v'], label: t('adminNav.volunteers') },
                { keys: ['g', 'a'], label: t('adminNav.analytics') },
                { keys: ['g', 'l'], label: t('adminNav.liveSos') },
              ].map(({ keys, label }) => (
                <li key={keys.join('+')} className="flex items-center justify-between gap-4">
                  <span>{label}</span>
                  <span className="flex items-center gap-1">
                    {keys.map((k) => (
                      <kbd
                        key={k}
                        className="rounded-md border border-slate-300 bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-700 dark:border-white/[0.15] dark:bg-slate-800 dark:text-slate-200"
                      >
                        {k}
                      </kbd>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
