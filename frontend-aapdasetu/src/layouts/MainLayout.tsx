import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
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
    label: 'Home',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
      </svg>
    ),
  },
  {
    to: '/report',
    label: 'Report',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    ),
  },
  {
    to: '/sos',
    label: '1-TAP SOS',
    isSos: true,
    icon: (
      <span className="text-base font-black">🚨</span>
    ),
  },
  {
    to: '/track',
    label: 'Track',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
      </svg>
    ),
  },
  {
    to: '/shelters',
    label: 'Shelters',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21m0 0h4.5V3.545M12.75 21h7.5V10.75M2.25 21h1.5m18 0h-18M2.25 9l4.5-1.636M18.75 3l-1.5.545m0 6.205 3 1" />
      </svg>
    ),
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
          <span>⚠️</span>
          <span>Offline Mode Active — Incident submissions will automatically queue and sync once reconnected.</span>
          <a href="tel:112" className="ml-2 underline font-extrabold text-amber-100 hover:text-white">
            Call 112 Offline
          </a>
        </div>
      )}

      {/* Top Emergency Hotlines Banner */}
      <div className="border-b border-slate-200 bg-white px-4 py-1.5 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="flex items-center gap-1.5 font-bold text-red-600 dark:text-red-400">
              <span className="h-2 w-2 rounded-full bg-red-600 animate-pulse" />
              National Emergency: <a href="tel:112" className="underline font-black text-sm">112</a>
            </span>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <span className="flex items-center gap-1">
              Ambulance: <a href="tel:108" className="hover:text-slate-900 dark:hover:text-slate-200 font-bold">108</a>
            </span>
            <span className="hidden sm:inline text-slate-300 dark:text-slate-700">|</span>
            <span className="hidden sm:inline">
              Disaster Helpline: <a href="tel:1078" className="hover:text-slate-900 dark:hover:text-slate-200 font-medium">1078</a>
            </span>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="hidden xs:inline">NDRF / SDRF Command Active</span>
          </div>
        </div>
      </div>

      {/* Main Navigation Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-950/95">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          {/* Logo / Brand */}
          <Link to="/" className="flex items-center gap-2.5 no-underline">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white font-black text-sm shadow-xs">
              आ
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">
                {t('app.name')}
              </span>
              <span className="hidden sm:inline-block ml-2 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                ICS Network
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden items-center gap-1 md:flex">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  item.isSos
                    ? `ml-1 rounded-lg px-3.5 py-1.5 text-xs font-black transition-all ${
                        isActive
                          ? 'bg-red-600 text-white shadow-sm'
                          : 'bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-950/50 dark:text-red-300 dark:hover:bg-red-900/60'
                      }`
                    : `rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                        isActive
                          ? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100 font-bold'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-200'
                      }`
                }
              >
                {t(item.labelKey)}
              </NavLink>
            ))}
          </nav>

          {/* Controls: Theme & Language */}
          <div className="flex items-center gap-2">
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value as typeof lang)}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 outline-none hover:border-slate-300 focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
              aria-label="Language selector"
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={toggleTheme}
              className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? (
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10 2a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0V3a1 1 0 0 1 1-1Zm4.96 2.04a1 1 0 0 1 0 1.414l-.707.707a1 1 0 1 1-1.414-1.414l.707-.707a1 1 0 0 1 1.414 0ZM10 6a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm7 4a1 1 0 1 1 0 2h-1a1 1 0 1 1 0-2h1Zm-3.243 4.243a1 1 0 0 1 1.414 0l.707.707a1 1 0 0 1-1.414 1.414l-.707-.707a1 1 0 0 1 0-1.414ZM10 16a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0v-1a1 1 0 0 1 1-1Zm-4.243-.243a1 1 0 0 1 0 1.414l-.707.707a1 1 0 0 1-1.414-1.414l.707-.707a1 1 0 0 1 1.414 0ZM4 10a1 1 0 0 1-1 1H2a1 1 0 1 1 0-2h1a1 1 0 0 1 1 1Zm1.05-3.95a1 1 0 0 1 0-1.414l.707-.707a1 1 0 1 1 1.414 1.414l-.707.707a1 1 0 0 1-1.414 0Z" />
                </svg>
              ) : (
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M17.293 13.293A8 8 0 0 1 6.707 2.707a8.001 8.001 0 1 0 10.586 10.586Z" />
                </svg>
              )}
            </button>

            {/* Mobile Hamburger Toggle for Secondary Links */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((o) => !o)}
              className="rounded-lg border border-slate-200 p-1.5 text-slate-700 md:hidden dark:border-slate-700 dark:text-slate-300"
              aria-label="Open mobile menu"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                {mobileMenuOpen ? <path d="M6 18L18 6M6 6l12 12" /> : <path d="M4 6h16M4 12h16M4 18h16" />}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Extended Drawer */}
        {mobileMenuOpen && (
          <nav className="border-t border-slate-100 bg-white px-4 py-3 md:hidden dark:border-slate-800 dark:bg-slate-950">
            <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
              <Link to="/safe-routes" className="rounded-lg border border-slate-100 bg-slate-50 p-2.5 dark:border-slate-800 dark:bg-slate-900">
                🛣️ Evacuation Routes
              </Link>
              <Link to="/missing-persons" className="rounded-lg border border-slate-100 bg-slate-50 p-2.5 dark:border-slate-800 dark:bg-slate-900">
                🔍 Missing Persons
              </Link>
              <Link to="/check-in" className="rounded-lg border border-slate-100 bg-slate-50 p-2.5 dark:border-slate-800 dark:bg-slate-900">
                💚 Safe Check-In
              </Link>
              <Link to="/alerts" className="rounded-lg border border-slate-100 bg-slate-50 p-2.5 dark:border-slate-800 dark:bg-slate-900">
                ⚠️ Public Warnings
              </Link>
              <Link to="/report-damage" className="col-span-2 rounded-lg border border-slate-100 bg-slate-50 p-2.5 dark:border-slate-800 dark:bg-slate-900">
                🏚️ SDRF Property Damage Assessment
              </Link>
              <Link to="/pfa-chat" className="col-span-2 rounded-lg border border-blue-100 bg-blue-50 p-2.5 text-blue-800 dark:border-blue-900 dark:bg-blue-950/50 dark:text-blue-300 font-bold">
                🤖 AapdaMitra AI Crisis Lifeline
              </Link>
            </div>
          </nav>
        )}
      </header>

      {/* Main Container — with bottom padding on mobile so fixed bottom bar doesn't obscure content */}
      <main className="mx-auto flex-1 w-full max-w-7xl px-4 py-6 pb-24 md:pb-8">
        <div key={location.pathname} className="animate-page-enter">
          <Outlet />
        </div>
      </main>

      {/* Minimal Clean Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 pb-24 md:pb-6 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
        <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800 dark:text-slate-200">AapdaSetu</span>
            <span>— National Incident Command & Disaster Response.</span>
          </div>

          <div className="flex items-center gap-4">
            <a href="tel:112" className="text-red-600 hover:underline dark:text-red-400 font-bold">
              Emergency: 112
            </a>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <span>© {year} AapdaSetu</span>
          </div>
        </div>
      </footer>

      {/* Fixed Mobile Bottom Action Bar (Thumb Reach Zone) */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-slate-200 bg-white/95 py-2 px-1 backdrop-blur-md md:hidden dark:border-slate-800 dark:bg-slate-950/95"
        aria-label="Mobile Navigation"
      >
        {mobileBottomTabs.map((tab) => (
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
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                  }`
            }
          >
            {tab.isSos ? (
              <div className="flex flex-col items-center">
                <span className="text-lg leading-none">🚨</span>
                <span className="mt-0.5 text-[9px] font-black tracking-wider">SOS</span>
              </div>
            ) : (
              <>
                <span className="mb-0.5">{tab.icon}</span>
                <span>{tab.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <ChatWidget />
    </div>
  )
}


