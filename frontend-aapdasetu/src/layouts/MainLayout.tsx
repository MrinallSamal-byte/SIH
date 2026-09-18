import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  Siren,
  FileText,
  Search,
  Home as HomeIcon,
  Building,
  Sun,
  Moon,
  Menu,
  X,
  AlertTriangle,
  ChevronDown,
  Compass,
  Users,
  Bell,
  ShieldCheck,
  FileSpreadsheet,
  Bot,
  HeartHandshake,
  Smartphone,
  CheckCheck
} from 'lucide-react'
import AapdaSetuLogo from '../components/common/AapdaSetuLogo'
import ErrorBoundary from '../components/common/ErrorBoundary'
import ChatWidget from '../components/ChatWidget'
import { useToast } from '../components/common/Toast'
import { LANGUAGES, useLanguage, type Language } from '../lib/i18n'
import { useTheme } from '../lib/theme'
import { listAlerts } from '../api/endpoints'
import type { Alert } from '../types'

interface NavLinkItem {
  to: string
  labelKey: string
  end?: boolean
  isSos?: boolean
}

const topNavItems: NavLinkItem[] = [
  { to: '/', labelKey: 'nav.home', end: true },
  { to: '/about', labelKey: 'nav.about' },
  { to: '/contacts', labelKey: 'nav.contacts' },
]

const featureNavItems: NavLinkItem[] = [
  { to: '/sos', labelKey: 'nav.sos', isSos: true },
  { to: '/report', labelKey: 'nav.report' },
  { to: '/track', labelKey: 'nav.track' },
  { to: '/checkin', labelKey: 'nav.checkin' },
  { to: '/missing-persons', labelKey: 'nav.missing' },
  { to: '/report-damage', labelKey: 'nav.damage' },
  { to: '/shelters', labelKey: 'nav.shelters' },
  { to: '/safe-routes', labelKey: 'nav.routes' },
  { to: '/pfa-chat', labelKey: 'nav.pfa' },
  { to: '/donate', labelKey: 'nav.donate' },
  { to: '/app', labelKey: 'service.appTitle' },
]

const featureIconMap: Record<string, typeof Siren> = {
  '/sos': Siren,
  '/report': FileText,
  '/track': Search,
  '/checkin': ShieldCheck,
  '/missing-persons': Users,
  '/report-damage': FileSpreadsheet,
  '/shelters': Building,
  '/safe-routes': Compass,
  '/pfa-chat': Bot,
  '/donate': HeartHandshake,
  '/app': Smartphone,
}

// Bottom navigation items for mobile thumb reach
const mobileBottomTabs = [
  {
    to: '/',
    labelKey: 'nav.home',
    icon: HomeIcon,
  },
  {
    to: '/report',
    labelKey: 'nav.report',
    icon: FileText,
  },
  {
    to: '/sos',
    labelKey: 'nav.sos',
    isSos: true,
    icon: Siren,
  },
  {
    to: '/track',
    labelKey: 'nav.track',
    icon: Search,
  },
  {
    to: '/shelters',
    labelKey: 'nav.shelters',
    icon: Building,
  },
]

export default function MainLayout() {
  const { t, lang, setLang } = useLanguage()
  const { theme, toggleTheme } = useTheme()
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [featuresOpen, setFeaturesOpen] = useState(false)
  const featuresRef = useRef<HTMLDivElement>(null)
  const [isOffline, setIsOffline] = useState(!navigator.onLine)
  const [bulletins, setBulletins] = useState<Alert[]>([])
  const [notifOpen, setNotifOpen] = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  // Per-bulletin read state, persisted so refreshes don't resurrect the badge.
  const [readIds, setReadIds] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem('aapdasetu_read_bulletins')
      return new Set(raw ? (JSON.parse(raw) as string[]) : [])
    } catch {
      return new Set()
    }
  })
  const unreadCount = bulletins.filter((b) => !readIds.has(b.id)).length

  const persistReadIds = (ids: Set<string>) => {
    setReadIds(ids)
    try {
      localStorage.setItem('aapdasetu_read_bulletins', JSON.stringify([...ids]))
    } catch {
      // Storage blocked — read state stays in-memory only
    }
  }

  const markRead = (id: string) => {
    if (readIds.has(id)) return
    const next = new Set(readIds)
    next.add(id)
    persistReadIds(next)
    toast(t('notif.markedRead', 'Notification marked as read'), 'success')
  }

  const markAllRead = () => {
    if (unreadCount === 0) return
    persistReadIds(new Set(bulletins.map((b) => b.id)))
    toast(t('notif.allMarkedRead', 'All notifications marked as read'), 'success')
  }

  useEffect(() => {
    setMobileMenuOpen(false)
    setFeaturesOpen(false)
    setNotifOpen(false)
  }, [location.pathname])

  useEffect(() => {
    setFeaturesOpen(false)
  }, [location.pathname])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (featuresRef.current && !featuresRef.current.contains(e.target as Node)) {
        setFeaturesOpen(false)
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false)
      }
    }
    if (featuresOpen || notifOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [featuresOpen, notifOpen])

  // Lock background scroll while the mobile side panel is open
  useEffect(() => {
    if (!mobileMenuOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [mobileMenuOpen])

  useEffect(() => {
    let active = true
    listAlerts().then((data) => {
      if (active) {
        setBulletins(data)
      }
    }).catch(() => {})
    return () => { active = false }
  }, [])

  // Track online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return (
    <div className="min-h-screen flex flex-col bg-[#f4f4f5] text-zinc-800 dark:bg-[#111111] dark:text-white">
      {/* Offline Ambient Banner */}
      {isOffline && (
        <div className="bg-amber-600 px-4 py-2 text-center text-xs font-bold text-white shadow-sm flex items-center justify-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          <span>{t('header.offlineNotice')}</span>
          <a href="tel:112" className="ml-2 underline font-extrabold text-amber-100 hover:text-white">
            {t('header.callOffline')}
          </a>
        </div>
      )}

      {/* Main Navigation Header - same red, borders/hover: light → light/white, dark → black (vice versa) */}
        <header className="sticky top-0 z-40 border-b border-red-700 bg-red-600 dark:border-black dark:bg-red-600 text-white shadow-sm">
        <div className="mx-auto flex max-w-screen-2xl items-center justify-between gap-2 px-3 py-3 sm:gap-10 sm:px-6">
          {/* Logo / Brand */}
          <Link to="/" className="flex min-w-0 items-center gap-2.5 font-bold tracking-tight group sm:gap-4">
            <AapdaSetuLogo size={30} />
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-extrabold leading-none text-white group-hover:text-red-100 transition-colors sm:text-base">
                {t('app.name')}
              </span>
              <span className="hidden text-[9px] font-bold text-red-100/80 tracking-wider mono uppercase mt-0.5 min-[400px]:block">
                ICS NETWORK
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-8" aria-label="Desktop Navigation">
            {topNavItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `rounded-lg px-2.5 py-1.5 text-sm font-medium transition ${
                    isActive
                      ? 'bg-white text-red-600 font-bold shadow-sm'
                      : 'text-red-100 hover:bg-white/15 hover:text-white'
                  }`
                }
              >
                <span>{t(item.labelKey)}</span>
              </NavLink>
            ))}

            {/* Features Dropdown */}
            <div className="relative" ref={featuresRef}>
              <button
                type="button"
                onClick={() => setFeaturesOpen((o) => !o)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition ${
                  featuresOpen || featureNavItems.some((f) => location.pathname === f.to)
                    ? 'bg-white text-red-600 font-bold shadow-sm'
                    : 'text-red-100 hover:bg-white/15 hover:text-white'
                }`}
              >
                <span>{t('nav.features')}</span>
                <ChevronDown className={`h-3 w-3 transition-transform ${featuresOpen ? 'rotate-180' : ''}`} />
              </button>

              {featuresOpen && (
                <div className="absolute right-0 top-full z-50 mt-1 max-h-96 w-56 overflow-y-auto rounded-xl border border-zinc-200/80 bg-white p-1.5 shadow-lg dark:border-black dark:bg-[#1a1a1a]">
                  {featureNavItems.map((item) => {
                    const Icon = featureIconMap[item.to]
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        className={({ isActive }) =>
                          `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
                            item.isSos
                              ? isActive
                                ? 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300 font-bold'
                                : 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950'
                              : isActive
                                ? 'bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300 font-bold'
                                : 'text-zinc-500 hover:bg-orange-50 hover:text-orange-700 dark:text-white dark:hover:bg-orange-950 dark:hover:text-orange-300'
                          }`
                        }
                      >
                        {Icon && <Icon className={`h-3.5 w-3.5 ${item.isSos ? 'animate-pulse text-red-600 dark:text-red-400' : ''}`} />}
                        <span>{t(item.labelKey)}</span>
                      </NavLink>
                    )
                  })}
                </div>
              )}
            </div>
          </nav>

          {/* Controls: Language Selector, Theme Toggle, Mobile Menu Button */}
          <div className="flex shrink-0 items-center gap-2 sm:gap-5">
            {/* Language Selector */}
            <div className="relative">
              <select
                aria-label="Language selector"
                value={lang}
                onChange={(e) => setLang(e.target.value as Language)}
                className="rounded-lg bg-white/15 px-2 py-1 text-xs font-bold text-white outline-none transition hover:bg-white/20 dark:bg-black/20 dark:hover:bg-black/30 cursor-pointer"
              >
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code} className="text-zinc-800 bg-white">
                    {l.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Notifications */}
            <div className="relative" ref={notifRef}>
              <button
                type="button"
                onClick={() => setNotifOpen((o) => !o)}
                className="relative rounded-lg bg-white/10 p-2 text-white transition hover:bg-white/20 hover:text-white dark:bg-black/20 dark:hover:bg-black/30"
                aria-label="Notifications"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[8px] font-bold text-white">
                    {unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 w-80 max-h-96 overflow-y-auto rounded-xl border border-zinc-200/80 bg-white shadow-lg dark:border-black dark:bg-[#1a1a1a]">
                  <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-black">
                    <div className="flex items-center gap-2">
                      <Bell className="h-4 w-4 text-zinc-500 dark:text-white" />
                      <span className="text-sm font-bold text-zinc-800 dark:text-white">{t('notif.bulletins', 'Bulletins')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link
                        to="/alerts"
                        onClick={() => setNotifOpen(false)}
                        className="text-[11px] font-bold text-orange-600 hover:underline dark:text-orange-400"
                      >
                        {t('notif.viewAll', 'View all')}
                      </Link>
                      {unreadCount > 0 && (
                        <button
                          type="button"
                          onClick={markAllRead}
                          className="inline-flex items-center gap-1 rounded-md border border-zinc-200 px-2 py-1 text-[11px] font-bold text-zinc-600 transition hover:bg-zinc-100 dark:border-white/10 dark:text-white dark:hover:bg-white/10"
                        >
                          <CheckCheck className="h-3.5 w-3.5" />
                          {t('notif.markAllRead', 'Mark all read')}
                        </button>
                      )}
                    </div>
                  </div>

                  {bulletins.length === 0 ? (
                    <div className="px-4 py-8 text-center text-xs text-slate-400 dark:text-white">
                      {t('notif.empty', 'No active bulletins')}
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      {bulletins.map((a) => {
                        const isRead = readIds.has(a.id)
                        return (
                        <div key={a.id} className={`px-4 py-3 transition-colors hover:bg-zinc-50 dark:hover:bg-[#252525]/50 ${isRead ? 'opacity-60' : ''}`}>
                          <div className="flex items-start gap-2.5">
                            <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                              a.severity === 'critical' ? 'bg-red-500' : a.severity === 'warning' ? 'bg-amber-500' : 'bg-blue-500'
                            }`} />
                            <div className="min-w-0 flex-1">
                              <h4 className="text-xs font-bold text-zinc-800 dark:text-white line-clamp-1">{a.title}</h4>
                              <p className="mt-0.5 text-[11px] text-slate-500 dark:text-white line-clamp-2">{a.message}</p>
                              {a.region && (
                                <span className="mt-1 inline-block text-[10px] text-slate-400 dark:text-white mono">{a.region}</span>
                              )}
                              {!isRead && (
                                <button
                                  type="button"
                                  onClick={() => markRead(a.id)}
                                  className="mt-1.5 inline-flex items-center gap-1 rounded-md text-[11px] font-bold text-emerald-600 hover:underline dark:text-emerald-400"
                                >
                                  <CheckCheck className="h-3.5 w-3.5" />
                                  {t('notif.markRead', 'Mark read')}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Theme Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className="rounded-lg bg-white/10 p-2 text-white transition hover:bg-white/20 hover:text-white dark:bg-black/20 dark:hover:bg-black/30"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>

            {/* Mobile Hamburger Toggle */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((o) => !o)}
              className="rounded-lg bg-white/10 p-2 text-white transition hover:bg-white/20 hover:text-white dark:bg-black/20 dark:hover:bg-black/30 lg:hidden"
              aria-label="Toggle mobile menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu Drawer */}
        {mobileMenuOpen && (
          <>
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 z-50 cursor-default bg-black/50 lg:hidden animate-backdrop"
            />
            <aside
              className="fixed right-0 top-0 z-50 flex h-dvh w-80 max-w-[85vw] flex-col bg-white shadow-2xl lg:hidden dark:bg-[#151515] animate-side-panel"
              aria-label="Mobile menu"
            >
              <div className="flex items-center justify-between border-b border-zinc-200/80 px-4 py-3 dark:border-white/10">
                <div className="flex items-center gap-2.5">
                  <AapdaSetuLogo size={28} />
                  <div>
                    <p className="text-sm font-extrabold leading-none text-zinc-800 dark:text-white">{t('app.name')}</p>
                    <p className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-zinc-400">ICS Network</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-lg border border-zinc-200 p-2 text-zinc-500 dark:border-white/10 dark:text-white"
                  aria-label="Close menu"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
                <div>
                  <p className="px-2 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-white/60">
                    {t('nav.home')}
                  </p>
                  <div className="space-y-1">
                    {topNavItems.map((item) => (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.end}
                        className={({ isActive }) =>
                          `flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                            isActive
                              ? 'bg-zinc-800 text-white dark:bg-white dark:text-zinc-900 font-bold'
                              : 'text-zinc-600 hover:bg-zinc-100 dark:text-white dark:hover:bg-white/10'
                          }`
                        }
                      >
                        <span>{t(item.labelKey)}</span>
                      </NavLink>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="px-2 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-white/60">
                    {t('nav.features')}
                  </p>
                  <div className="space-y-1">
                    {featureNavItems.map((item) => {
                      const Icon = featureIconMap[item.to]
                      return (
                        <NavLink
                          key={item.to}
                          to={item.to}
                          end={item.end}
                          className={({ isActive }) =>
                            item.isSos
                              ? `flex items-center justify-center gap-2 rounded-xl bg-red-600 p-3 text-sm font-bold text-white shadow-sm`
                              : `flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                                  isActive
                                    ? 'bg-zinc-800 text-white dark:bg-white dark:text-zinc-900 font-bold'
                                    : 'text-zinc-600 hover:bg-zinc-100 dark:text-white dark:hover:bg-white/10'
                                }`
                          }
                        >
                          {Icon && <Icon className={`h-4 w-4 shrink-0 ${item.isSos ? 'animate-pulse text-red-600 dark:text-red-400' : ''}`} />}
                          <span>{t(item.labelKey)}</span>
                        </NavLink>
                      )
                    })}
                  </div>
                </div>

                <div>
                  <p className="px-2 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-white/60">
                    {t('nav.portals', 'Portals')}
                  </p>
                  <div className="space-y-1">
                    <Link
                      to="/admin"
                      className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-white dark:hover:bg-white/10"
                    >
                      {t('nav.admin')}
                    </Link>
                    <Link
                      to="/volunteer"
                      className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-white dark:hover:bg-white/10"
                    >
                      {t('nav.volunteer')}
                    </Link>
                  </div>
                </div>
              </div>
            </aside>
          </>
        )}
      </header>

      {/* Main Container — Home renders its own full-bleed bands */}
      <main className={location.pathname === '/' ? 'w-full flex-1 pb-24 md:pb-8' : 'mx-auto flex-1 w-full max-w-7xl px-4 py-6 pb-24 md:pb-8'}>
        <div key={location.pathname} className="animate-page-enter">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </div>
      </main>

      {/* Fixed Mobile Bottom Action Bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-zinc-200/80 bg-white/95 py-2 px-1 backdrop-blur-md md:hidden dark:border-white/[0.06] dark:bg-[#181818]/95"
        aria-label="Mobile Navigation"
      >
        {mobileBottomTabs.map((tab) => {
          const Icon = tab.icon
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={({ isActive }) =>
                tab.isSos
                  ? `relative -top-3 flex flex-col items-center justify-center rounded-full bg-red-600 p-3.5 text-white shadow-lg ring-4 ring-white transition active:scale-95 dark:ring-slate-950 ${
                      isActive ? 'animate-sos-pulse' : ''
                    }`
                  : `flex flex-1 flex-col items-center justify-center py-1 text-[10px] font-bold transition ${
                      isActive
                        ? 'text-zinc-800 dark:text-white'
                        : 'text-slate-400 hover:text-zinc-600 dark:text-white dark:hover:text-white'
                    }`
              }
            >
              {tab.isSos ? (
                <div className="flex flex-col items-center">
                  <Icon className="h-5 w-5" />
                  <span className="mt-0.5 text-[9px] font-black tracking-wider">SOS</span>
                </div>
              ) : (
                <>
                  <Icon className="h-4.5 w-4.5 mb-1" />
                  <span>{t(tab.labelKey)}</span>
                </>
              )}
            </NavLink>
          )
        })}
      </nav>

      <ChatWidget />
    </div>
  )
}
