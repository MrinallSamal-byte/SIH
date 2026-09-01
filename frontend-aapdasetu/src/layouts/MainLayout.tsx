import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  Siren,
  FileText,
  FileWarning,
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
  Smartphone,
  Bot,
  Phone
} from 'lucide-react'
import AapdaSetuLogo from '../components/common/AapdaSetuLogo'
import ErrorBoundary from '../components/common/ErrorBoundary'
import ChatWidget from '../components/ChatWidget'
import { LANGUAGES, useLanguage, type Language } from '../lib/i18n'
import { useTheme } from '../lib/theme'
import { listAlerts } from '../api/endpoints'
import { initGlobalOutboxSync } from '../lib/outbox'
import { initSupabaseRealtime } from '../lib/supabase'
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
  { to: '/report-damage', labelKey: 'nav.damage' },
  { to: '/shelters', labelKey: 'nav.shelters' },
  { to: '/safe-routes', labelKey: 'nav.routes' },
  { to: '/missing-persons', labelKey: 'nav.missing' },
  { to: '/pfa-chat', labelKey: 'nav.pfa' },
  { to: '/app', labelKey: 'appdl.navLabel' },
]

const featureIconMap: Record<string, typeof Siren> = {
  '/sos': Siren,
  '/report': FileText,
  '/track': Search,
  '/checkin': ShieldCheck,
  '/report-damage': FileWarning,
  '/shelters': Building,
  '/safe-routes': Compass,
  '/missing-persons': Users,
  '/pfa-chat': Bot,
  '/app': Smartphone,
}

// Bottom navigation items for mobile thumb reach
const mobileBottomTabs = [
  {
    to: '/',
    labelKey: 'nav.home',
    end: true,
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
  const [notifRead, setNotifRead] = useState(true)
  const notifRef = useRef<HTMLDivElement>(null)

  // Global offline outbox sync — flushes queued reports/SOS when connectivity
  // returns. Module is idempotent (StrictMode double-invoke safe); cleanup on
  // unmount stops its timers/listeners.
  useEffect(() => {
    const cleanupOutbox = initGlobalOutboxSync()
    const cleanupSupabase = initSupabaseRealtime()
    return () => {
      if (typeof cleanupOutbox === 'function') cleanupOutbox()
      if (typeof cleanupSupabase === 'function') cleanupSupabase()
    }
  }, [])

  useEffect(() => {
    setMobileMenuOpen(false)
    setFeaturesOpen(false)
    setNotifOpen(false)
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
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setFeaturesOpen(false)
        setNotifOpen(false)
        setMobileMenuOpen(false)
      }
    }
    if (featuresOpen || notifOpen) document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKey)
    }
  }, [featuresOpen, notifOpen])

  useEffect(() => {
    let active = true
    let cancelled = false
    // Track the newest alert id so the unread badge only fires for GENUINELY
    // new alerts — the old `length > 0` check re-flagged the bell 45 s after
    // every read, forever.
    const seenIdsRef = { current: new Set<string>() }
    let firstLoad = true
    const loadBulletins = () => {
      listAlerts().then((data) => {
        if (active && !cancelled) {
          // Defensive: a malformed feed payload must never poison render state
          const list = Array.isArray(data) ? data : []
          setBulletins(list)
          if (firstLoad) {
            // Seed seen-ids on first load — reopening the app must not spam
            // the badge with alerts published before this session.
            seenIdsRef.current = new Set(list.map((a) => a.id))
            firstLoad = false
          } else {
            const hasNew = list.some((a) => !seenIdsRef.current.has(a.id))
            if (hasNew) setNotifRead(false)
            list.forEach((a) => seenIdsRef.current.add(a.id))
          }
        }
      }).catch(() => {})
    }
    loadBulletins()
    // Keep the ticker + notification bell fresh without hammering the API.
    const id = window.setInterval(loadBulletins, 45_000)
    return () => {
      cancelled = true
      active = false
      window.clearInterval(id)
    }
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

  const displayedBulletins = useMemo(() => {
    const rank: Record<string, number> = { critical: 0, warning: 1, info: 2 }
    return [...bulletins]
      .sort((a, b) => {
        const bySeverity = (rank[a.severity] ?? 3) - (rank[b.severity] ?? 3)
        if (bySeverity !== 0) return bySeverity
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      })
      .slice(0, 10)
  }, [bulletins])

  return (
    <div className="min-h-screen flex flex-col bg-[#f4f4f5] text-zinc-800 dark:bg-[#111111] dark:text-slate-200">
      <button
        type="button"
        onClick={() => document.getElementById('main-content')?.focus()}
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-zinc-900 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        {t('layout.skipToContent')}
      </button>
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

      {/* Main Navigation Header */}
      <header className="sticky top-0 z-40 border-b border-zinc-200/60 bg-white/90 backdrop-blur-md dark:border-white/[0.06] dark:bg-[#181818]/90">
        <div className="mx-auto flex max-w-screen-2xl items-center justify-between px-6 py-4">
          {/* Logo / Brand */}
          <div className="flex items-center gap-2.5">
            <Link to="/" className="flex items-center gap-2.5 font-bold tracking-tight group">
              <AapdaSetuLogo size={34} />
              <div className="flex flex-col">
                <span className="text-base font-extrabold leading-none text-zinc-800 dark:text-slate-200 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
                  {t('app.name')}
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-3" aria-label={t('layout.navDesktop')}>
            {topNavItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `rounded-lg px-2.5 py-1.5 text-sm font-medium transition ${
                    isActive
                      ? 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300 font-bold'
                      : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:text-slate-400 dark:hover:bg-white/[0.06] dark:hover:text-slate-200'
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
                aria-expanded={featuresOpen}
                aria-haspopup="menu"
                className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm font-medium transition ${
                  featuresOpen || featureNavItems.some((f) => location.pathname === f.to)
                    ? 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300 font-bold'
                    : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:text-slate-400 dark:hover:bg-white/[0.06] dark:hover:text-slate-200'
                }`}
              >
                <span>{t('nav.features')}</span>
                <ChevronDown className={`h-3 w-3 transition-transform ${featuresOpen ? 'rotate-180' : ''}`} />
              </button>

              {featuresOpen && (
                <div className="absolute right-0 top-full z-50 mt-1 w-56 max-h-[70vh] overflow-y-auto rounded-xl border border-zinc-200/80 bg-white p-1.5 shadow-lg dark:border-white/[0.08] dark:bg-[#1a1a1a]">
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
                                ? 'bg-zinc-100 text-zinc-800 dark:bg-white/[0.08] dark:text-slate-200 font-bold'
                                : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:text-slate-400 dark:hover:bg-white/[0.06] dark:hover:text-slate-200'
                          }`
                        }
                      >
                        {Icon && <Icon className={`h-3.5 w-3.5 ${item.isSos ? 'animate-pulse' : ''}`} />}
                        <span>{t(item.labelKey)}</span>
                      </NavLink>
                    )
                  })}
                </div>
              )}
            </div>
          </nav>

          {/* Controls: Language Selector, Theme Toggle, Mobile Menu Button */}
          <div className="flex items-center gap-2">
            {/* Language Selector */}
            <div className="relative">
              <select
                aria-label={t('layout.langSelector')}
                value={lang}
                onChange={(e) => setLang(e.target.value as Language)}
                className="rounded-lg border border-zinc-200/80 bg-[#f4f4f5] px-2.5 py-1.5 text-xs font-bold text-zinc-700 outline-none transition hover:bg-zinc-100 focus:border-zinc-500 dark:border-white/[0.08] dark:bg-[#1a1a1a] dark:text-slate-200 dark:hover:bg-[#252525] cursor-pointer"
              >
                  {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.native}
                  </option>
                ))}
              </select>
            </div>

            {/* Notifications Center */}
            <div className="relative" ref={notifRef}>
              <button
                type="button"
                onClick={() => {
                  setNotifOpen((o) => !o)
                  setNotifRead(true)
                }}
                className="relative rounded-lg border border-zinc-200/80 bg-white p-2.5 text-zinc-500 transition hover:bg-zinc-50 hover:text-zinc-800 dark:border-white/[0.08] dark:bg-[#1a1a1a] dark:text-slate-400 dark:hover:bg-[#252525] dark:hover:text-slate-200 cursor-pointer"
                aria-label={t('layout.notifications')}
              >
                <Bell className="h-5 w-5" />
                {bulletins.length > 0 && !notifRead && (
                  <span className="absolute right-1.5 top-1.5 flex h-2.5 w-2.5">
                    {bulletins.some((b) => b.severity === 'critical') && (
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                    )}
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-600" />
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 w-80 sm:w-96 max-h-[30rem] overflow-y-auto rounded-2xl border border-zinc-200/80 bg-white shadow-2xl dark:border-white/[0.08] dark:bg-[#1a1a1a]">
                  <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3 dark:border-white/[0.08]">
                    <div className="flex items-center gap-2">
                      <Bell className="h-4 w-4 text-zinc-600 dark:text-slate-300" />
                      <span className="text-sm font-bold text-zinc-800 dark:text-slate-200">
                        {t('layout.notifications', 'Emergency Alerts')}
                      </span>
                      {bulletins.length > 0 && (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-extrabold text-red-700 dark:bg-red-950/80 dark:text-red-300">
                          {bulletins.length}
                        </span>
                      )}
                    </div>
                    {bulletins.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setNotifRead(true)
                          setBulletins([])
                        }}
                        className="text-[11px] font-semibold text-zinc-400 hover:text-zinc-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  {displayedBulletins.length === 0 ? (
                    <div className="px-6 py-10 text-center">
                      <ShieldCheck className="mx-auto mb-2.5 h-9 w-9 text-emerald-500" />
                      <p className="text-xs font-bold text-zinc-700 dark:text-slate-200">No active alerts</p>
                      <p className="text-[11px] mt-0.5 text-zinc-400 dark:text-slate-500">All emergency sectors are currently clear.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-zinc-100 dark:divide-white/[0.06]">
                      {displayedBulletins.map((a) => (
                        <div
                          key={a.id}
                          className="px-4 py-3.5 hover:bg-zinc-50/80 dark:hover:bg-[#222222] transition-colors"
                        >
                          <div className="flex items-start gap-3">
                            <span
                              className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                                a.severity === 'critical'
                                  ? 'bg-red-500 ring-4 ring-red-500/20'
                                  : a.severity === 'warning'
                                  ? 'bg-amber-500 ring-4 ring-amber-500/20'
                                  : 'bg-blue-500 ring-4 ring-blue-500/20'
                              }`}
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <span
                                  className={`inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider ${
                                    a.severity === 'critical'
                                      ? 'bg-red-100 text-red-700 dark:bg-red-950/80 dark:text-red-300'
                                      : a.severity === 'warning'
                                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'
                                      : 'bg-blue-100 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300'
                                  }`}
                                >
                                  {a.severity}
                                </span>
                                <span className="text-[10px] text-zinc-400 dark:text-slate-500">
                                  {new Date(a.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <h4 className="text-xs font-bold text-zinc-800 dark:text-slate-200 leading-snug">{a.title}</h4>
                              <p className="mt-1 text-xs text-zinc-600 dark:text-slate-400 leading-relaxed">{a.message}</p>
                              {a.targetArea && (
                                <div className="mt-2 flex items-center gap-1 text-[10px] font-medium text-zinc-500 dark:text-slate-400">
                                  <span className="font-semibold text-zinc-400 dark:text-slate-500">Sector:</span>
                                  <span className="rounded bg-zinc-100 px-1.5 py-0.5 dark:bg-zinc-800 mono">{a.targetArea}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Theme Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className="rounded-lg border border-zinc-200/80 bg-white p-2.5 text-zinc-500 transition hover:bg-zinc-50 hover:text-zinc-800 dark:border-white/[0.08] dark:bg-[#1a1a1a] dark:text-slate-400 dark:hover:bg-[#252525] dark:hover:text-slate-200"
              aria-label={t('layout.toggleTheme')}
            >
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>

            {/* Mobile Hamburger Toggle */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((o) => !o)}
              className="rounded-lg border border-zinc-200/80 bg-white p-2.5 text-zinc-500 transition hover:bg-zinc-50 hover:text-zinc-800 lg:hidden dark:border-white/[0.08] dark:bg-[#1a1a1a] dark:text-slate-400 dark:hover:bg-[#252525]"
              aria-label={t('layout.toggleMenu')}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu Drawer */}
        {mobileMenuOpen && (
          <nav className="border-t border-zinc-200/80 bg-white px-4 py-3 shadow-lg lg:hidden dark:border-white/[0.08] dark:bg-[#151515]">
            <div className="grid grid-cols-2 gap-1.5">
              {topNavItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition ${
                      isActive
                        ? 'bg-slate-100 text-zinc-800 dark:bg-[#222222] dark:text-slate-300 font-bold'
                        : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800 dark:text-slate-400 dark:hover:bg-zinc-800 dark:hover:text-slate-200'
                    }`
                  }
                >
                  <span>{t(item.labelKey)}</span>
                </NavLink>
              ))}

              <div className="col-span-2 mt-1">
                <span className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  {t('nav.features')}
                </span>
              </div>

              {featureNavItems.map((item) => {
                const Icon = featureIconMap[item.to]
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      item.isSos
                        ? `col-span-2 flex items-center justify-center gap-2 rounded-xl bg-red-600 p-2.5 text-xs font-bold text-white shadow-sm`
                        : `flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition ${
                            isActive
                              ? 'bg-slate-100 text-zinc-800 dark:bg-[#222222] dark:text-slate-300 font-bold'
                              : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800 dark:text-slate-400 dark:hover:bg-zinc-800 dark:hover:text-slate-200'
                          }`
                    }
                  >
                    {Icon && <Icon className={`h-4 w-4 ${item.isSos ? '' : ''}`} />}
                    <span>{t(item.labelKey)}</span>
                  </NavLink>
                )
              })}

              <div className="col-span-2 border-t border-slate-100 my-1 pt-1 dark:border-white/[0.08] grid grid-cols-2 gap-1">
                <Link
                  to="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-lg px-3 py-2 text-xs text-slate-500 hover:bg-zinc-50 dark:text-slate-400 dark:hover:bg-zinc-800 font-medium"
                >
                  {t('nav.admin')}
                </Link>
                <Link
                  to="/volunteer"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-lg px-3 py-2 text-xs text-slate-500 hover:bg-zinc-50 dark:text-slate-400 dark:hover:bg-zinc-800 font-medium"
                >
                  {t('nav.volunteer')}
                </Link>
              </div>
            </div>
          </nav>
        )}
      </header>


      {/* Main Container */}
      <main id="main-content" className="mx-auto flex-1 w-full max-w-7xl px-4 py-6 pb-24 md:pb-8" tabIndex={-1}>
        <div key={location.pathname} className="animate-page-enter">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </div>
      </main>

      {/* Fixed Mobile Bottom Action Bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-zinc-200/80 bg-white/95 py-2 px-1 backdrop-blur-md md:hidden dark:border-white/[0.06] dark:bg-[#181818]/95"
        aria-label={t('layout.navMobile')}
      >
        {mobileBottomTabs.map((tab) => {
          const Icon = tab.icon
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={'end' in tab ? Boolean((tab as { end?: boolean }).end) : undefined}
              className={({ isActive }) =>
                tab.isSos
                  ? `relative -top-3 flex flex-col items-center justify-center rounded-full bg-red-600 p-3.5 text-white shadow-lg ring-4 ring-white transition active:scale-95 dark:ring-slate-950 ${
                      isActive ? 'animate-sos-pulse' : ''
                    }`
                  : `flex flex-1 flex-col items-center justify-center py-1 text-[10px] font-bold transition ${
                      isActive
                        ? 'text-zinc-800 dark:text-slate-300'
                        : 'text-slate-400 hover:text-zinc-600 dark:text-slate-500 dark:hover:text-slate-300'
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
                  <Icon className="mb-1 h-[18px] w-[18px]" />
                  <span>{t(tab.labelKey)}</span>
                </>
              )}
            </NavLink>
          )
        })}
      </nav>

      <footer className="mt-auto hidden border-t border-zinc-200/60 bg-white px-6 py-4 md:block dark:border-white/[0.06] dark:bg-[#181818]">
        <div className="mx-auto flex max-w-screen-2xl flex-wrap items-center justify-between gap-3 text-xs text-zinc-500 dark:text-slate-400">
          <a href="tel:112" className="inline-flex items-center gap-1.5 font-semibold text-red-600 hover:text-red-700 dark:text-red-400">
            <Phone className="h-3.5 w-3.5" />
            112
          </a>
          <div className="flex items-center gap-4">
            <Link to="/admin" className="hover:text-zinc-800 dark:hover:text-slate-200">{t('nav.admin')}</Link>
            <Link to="/volunteer" className="hover:text-zinc-800 dark:hover:text-slate-200">{t('nav.volunteer')}</Link>
          </div>
        </div>
      </footer>

      {/* Hide the floating widget on SOS and the dedicated assistant page */}
      {location.pathname !== '/pfa-chat' && location.pathname !== '/sos' && <ChatWidget />}
    </div>
  )
}
