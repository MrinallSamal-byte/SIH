import { useEffect, useState } from 'react'
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
  Phone,
  AlertTriangle
} from 'lucide-react'
import AapdaSetuLogo from '../components/common/AapdaSetuLogo'
import ErrorBoundary from '../components/common/ErrorBoundary'
import ChatWidget from '../components/ChatWidget'
import { LANGUAGES, useLanguage } from '../lib/i18n'
import { useTheme } from '../lib/theme'

interface NavLinkItem {
  to: string
  labelKey: string
  end?: boolean
  isSos?: boolean
}

const navItems: NavLinkItem[] = [
  { to: '/', labelKey: 'nav.home', end: true },
  { to: '/sos', labelKey: 'nav.sos', isSos: true },
  { to: '/report', labelKey: 'nav.report' },
  { to: '/track', labelKey: 'nav.track' },
  { to: '/shelters', labelKey: 'nav.shelters' },
  { to: '/safe-routes', labelKey: 'nav.routes' },
  { to: '/missing-persons', labelKey: 'nav.missing' },
  { to: '/check-in', labelKey: 'nav.checkin' },
]

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
  const year = new Date().getFullYear()
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isOffline, setIsOffline] = useState(!navigator.onLine)

  useEffect(() => {
    setMobileMenuOpen(false)
  }, [location.pathname])

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
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
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

      {/* Top Emergency Hotlines Banner */}
      <div className="border-b border-slate-200 bg-white px-4 py-1.5 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="flex items-center gap-1.5 font-bold text-red-600 dark:text-red-400">
              <span className="h-2 w-2 rounded-full bg-red-600 animate-pulse" />
              {t('header.nationalEmergency')}: <a href="tel:112" className="underline font-black text-sm mono">112</a>
            </span>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <span className="flex items-center gap-1">
              {t('header.ambulance')}: <a href="tel:108" className="hover:text-slate-900 dark:hover:text-slate-200 font-bold mono">108</a>
            </span>
            <span className="hidden sm:inline text-slate-300 dark:text-slate-700">|</span>
            <span className="hidden sm:inline">
              {t('header.disasterHelpline')}: <a href="tel:1070" className="hover:text-slate-900 dark:hover:text-slate-200 font-medium mono">1070</a>
            </span>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="hidden xs:inline font-medium">NDRF / SDRF Command Active</span>
          </div>
        </div>
      </div>

      {/* Main Navigation Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-950/90">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          {/* Logo / Brand */}
          <Link to="/" className="flex items-center gap-2.5 font-bold tracking-tight group">
            <AapdaSetuLogo size={34} />
            <div className="flex flex-col">
              <span className="text-base font-extrabold leading-none text-slate-900 dark:text-slate-100 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
                {t('app.name')}
              </span>
              <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 tracking-wider mono uppercase mt-0.5">
                ICS NETWORK
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1" aria-label="Desktop Navigation">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  item.isSos
                    ? `ml-1.5 inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition hover:bg-red-700 active:scale-95 ${
                        isActive ? 'ring-2 ring-red-400 ring-offset-2 dark:ring-offset-slate-950' : ''
                      }`
                    : `rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                        isActive
                          ? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100 font-bold'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-200'
                      }`
                }
              >
                {item.isSos && <Siren className="h-3.5 w-3.5 animate-pulse" />}
                <span>{t(item.labelKey)}</span>
              </NavLink>
            ))}
          </nav>

          {/* Controls: Language Selector, Theme Toggle, Mobile Menu Button */}
          <div className="flex items-center gap-2">
            {/* Language Selector */}
            <div className="relative">
              <select
                aria-label="Language selector"
                value={lang}
                onChange={(e) => setLang(e.target.value as any)}
                className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-bold text-slate-800 outline-none transition hover:bg-slate-100 focus:border-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 cursor-pointer"
              >
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Theme Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            </button>

            {/* Mobile Hamburger Toggle */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((o) => !o)}
              className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 lg:hidden dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800"
              aria-label="Toggle mobile menu"
            >
              {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu Drawer */}
        {mobileMenuOpen && (
          <nav className="border-t border-slate-200 bg-white px-4 py-3 shadow-lg lg:hidden dark:border-slate-800 dark:bg-slate-950 animate-dropdown">
            <div className="grid grid-cols-2 gap-1.5">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    item.isSos
                      ? `col-span-2 flex items-center justify-center gap-2 rounded-xl bg-red-600 p-2.5 text-xs font-bold text-white shadow-sm`
                      : `flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition ${
                          isActive
                            ? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100 font-bold'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-200'
                        }`
                  }
                >
                  {item.isSos && <Siren className="h-4 w-4" />}
                  <span>{t(item.labelKey)}</span>
                </NavLink>
              ))}

              <div className="col-span-2 border-t border-slate-100 my-1 pt-1 dark:border-slate-800 grid grid-cols-2 gap-1">
                <Link
                  to="/admin"
                  className="rounded-lg px-3 py-2 text-xs text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-900 font-medium"
                >
                  {t('nav.admin')}
                </Link>
                <Link
                  to="/volunteer"
                  className="rounded-lg px-3 py-2 text-xs text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-900 font-medium"
                >
                  {t('nav.volunteer')}
                </Link>
              </div>
            </div>
          </nav>
        )}
      </header>

      {/* Main Container */}
      <main className="mx-auto flex-1 w-full max-w-7xl px-4 py-6 pb-24 md:pb-8">
        <div key={location.pathname} className="animate-page-enter">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </div>
      </main>

      {/* Minimal Clean Footer */}
      <footer className="border-t border-slate-200 bg-white py-8 pb-24 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400 md:pb-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 sm:flex-row">
          <div className="flex items-center gap-2">
            <AapdaSetuLogo size={20} />
            <span className="font-bold text-slate-900 dark:text-slate-100">{t('app.name')}</span>
            <span>—</span>
            <span>{t('app.tagline')}</span>
          </div>

          <div className="flex items-center gap-4">
            <a href="tel:112" className="flex items-center gap-1 font-bold text-red-600 hover:underline dark:text-red-400">
              <Phone className="h-3.5 w-3.5" />
              {t('header.nationalEmergency')}: 112
            </a>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <span className="mono">© {year} AapdaSetu</span>
          </div>
        </div>
      </footer>

      {/* Fixed Mobile Bottom Action Bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-slate-200 bg-white/95 py-2 px-1 backdrop-blur-md md:hidden dark:border-slate-800 dark:bg-slate-950/95"
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
                        ? 'text-slate-900 dark:text-slate-100'
                        : 'text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-300'
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
