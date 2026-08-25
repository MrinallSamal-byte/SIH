import { useEffect, useRef, useState } from 'react'
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
  Radio,
  Smartphone
} from 'lucide-react'
import AapdaSetuLogo from '../components/common/AapdaSetuLogo'
import ErrorBoundary from '../components/common/ErrorBoundary'
import ChatWidget from '../components/ChatWidget'
import { LANGUAGES, useLanguage, type Language } from '../lib/i18n'
import { useTheme } from '../lib/theme'
import { listAlerts } from '../api/endpoints'
import { initGlobalOutboxSync } from '../lib/outbox'
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
  { to: '/alerts', labelKey: 'nav.alerts' },
  { to: '/checkin', labelKey: 'nav.checkin' },
  { to: '/report-damage', labelKey: 'nav.damage' },
  { to: '/shelters', labelKey: 'nav.shelters' },
  { to: '/safe-routes', labelKey: 'nav.routes' },
  { to: '/missing-persons', labelKey: 'nav.missing' },
  { to: '/app', labelKey: 'appdl.navLabel' },
]

const featureIconMap: Record<string, typeof Siren> = {
  '/sos': Siren,
  '/report': FileText,
  '/track': Search,
  '/alerts': Radio,
  '/checkin': ShieldCheck,
  '/report-damage': FileWarning,
  '/shelters': Building,
  '/safe-routes': Compass,
  '/missing-persons': Users,
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
  const [tickerDismissedId, setTickerDismissedId] = useState<string | null>(null)

  // Global offline outbox sync — flushes queued reports/SOS when connectivity
  // returns. Module is idempotent (StrictMode double-invoke safe); cleanup on
  // unmount stops its timers/listeners.
  useEffect(() => {
    const cleanup = initGlobalOutboxSync()
    return () => {
      if (typeof cleanup === 'function') cleanup()
    }
  }, [])

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

  useEffect(() => {
    let active = true
    let cancelled = false
    const loadBulletins = () => {
      listAlerts().then((data) => {
        if (active && !cancelled) {
          // Defensive: a malformed feed payload must never poison render state
          const list = Array.isArray(data) ? data : []
          setBulletins(list)
          if (list.length > 0) setNotifRead(false)
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

  const criticalBulletin = bulletins.find((a) => a.severity === 'critical')

  return (
    <div className="min-h-screen flex flex-col bg-[#f4f4f5] text-zinc-800 dark:bg-[#111111] dark:text-slate-200">
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
          <Link to="/" className="flex items-center gap-2.5 font-bold tracking-tight group">
            <AapdaSetuLogo size={34} />
            <div className="flex flex-col">
              <span className="text-base font-extrabold leading-none text-zinc-800 dark:text-slate-200 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
                {t('app.name')}
              </span>
            </div>
          </Link>

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
                <div className="absolute right-0 top-full z-50 mt-1 w-56 rounded-xl border border-zinc-200/80 bg-white p-1.5 shadow-lg dark:border-white/[0.08] dark:bg-[#1a1a1a]">
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
                    {l.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Notifications */}
            <div className="relative" ref={notifRef}>
              <button
                type="button"
                onClick={() => {
                  setNotifOpen((o) => !o)
                  setNotifRead(true)
                }}
                className="relative rounded-lg border border-zinc-200/80 bg-white p-2.5 text-zinc-500 transition hover:bg-zinc-50 hover:text-zinc-800 dark:border-white/[0.08] dark:bg-[#1a1a1a] dark:text-slate-400 dark:hover:bg-[#252525] dark:hover:text-slate-200"
                aria-label={t('layout.notifications')}
              >
                <Bell className="h-5 w-5" />
                {bulletins.length > 0 && !notifRead && (
                  <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[8px] font-bold text-white">
                    {bulletins.length}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 w-80 max-h-96 overflow-y-auto rounded-xl border border-zinc-200/80 bg-white shadow-lg dark:border-white/[0.08] dark:bg-[#1a1a1a]">
                  <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-white/[0.08]">
                    <div className="flex items-center gap-2">
                      <Bell className="h-4 w-4 text-zinc-500 dark:text-slate-400" />
                      <span className="text-sm font-bold text-zinc-800 dark:text-slate-300">{t('layout.bulletins')}</span>
                    </div>
                    <Link
                      to="/alerts"
                      onClick={() => setNotifOpen(false)}
                      className="text-[11px] font-bold text-red-600 hover:underline dark:text-red-400"
                    >
                      {t('layout.viewAll')}
                    </Link>
                  </div>

                  {bulletins.length === 0 ? (
                    <div className="px-4 py-8 text-center text-xs text-slate-400 dark:text-slate-500">
                      {t('layout.noBulletins')}
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      {bulletins.map((a) => (
                        <div key={a.id} className="px-4 py-3 hover:bg-zinc-50 dark:hover:bg-[#252525]/50 transition-colors">
                          <div className="flex items-start gap-2.5">
                            <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                              a.severity === 'critical' ? 'bg-red-500' : a.severity === 'warning' ? 'bg-amber-500' : 'bg-blue-500'
                            }`} />
                            <div className="min-w-0 flex-1">
                              <h4 className="text-xs font-bold text-zinc-800 dark:text-slate-300 line-clamp-1">{a.title}</h4>
                              <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">{a.message}</p>
                              {a.targetArea && (
                                <span className="mt-1 inline-block text-[10px] text-slate-400 dark:text-slate-500 mono">{a.targetArea}</span>
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
          <nav className="border-t border-zinc-200/80 bg-white px-4 py-3 shadow-lg lg:hidden dark:border-white/[0.08] dark:bg-[#151515] animate-dropdown">
            <div className="grid grid-cols-2 gap-1.5">
              {topNavItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
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
                  className="rounded-lg px-3 py-2 text-xs text-slate-500 hover:bg-zinc-50 dark:text-slate-400 dark:hover:bg-zinc-800 font-medium"
                >
                  {t('nav.admin')}
                </Link>
                <Link
                  to="/volunteer"
                  className="rounded-lg px-3 py-2 text-xs text-slate-500 hover:bg-zinc-50 dark:text-slate-400 dark:hover:bg-zinc-800 font-medium"
                >
                  {t('nav.volunteer')}
                </Link>
              </div>
            </div>
          </nav>
        )}
      </header>

      {/* Critical Alert Ticker — only while an unresolved critical bulletin exists.
          Dismissal is keyed to the alert id so a NEW critical bulletin re-shows it. */}
      {criticalBulletin && criticalBulletin.id !== tickerDismissedId && (
        <div className="bg-red-600 px-4 py-2 text-white shadow-sm" role="alert">
          <div className="mx-auto flex max-w-screen-2xl items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2 text-xs">
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-white" />
              </span>
              <span className="shrink-0 font-black uppercase tracking-wider">{t('ticker.criticalAlert')}</span>
              <span className="truncate font-semibold opacity-90">{criticalBulletin.title}</span>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <Link
                to="/alerts"
                className="text-xs font-extrabold underline underline-offset-2 hover:text-red-100"
              >
                {t('ticker.viewAlerts')}
              </Link>
              <button
                type="button"
                onClick={() => setTickerDismissedId(criticalBulletin.id)}
                aria-label={t('ticker.dismiss')}
                className="rounded-md p-1 transition hover:bg-red-500/70"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="mx-auto flex-1 w-full max-w-7xl px-4 py-6 pb-24 md:pb-8">
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
                  <Icon className="h-4.5 w-4.5 mb-1" />
                  <span>{t(tab.labelKey)}</span>
                </>
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* Hide the floating widget on the dedicated PFA chat page to avoid two chat UIs at once */}
      {location.pathname !== '/pfa-chat' && <ChatWidget />}
    </div>
  )
}
