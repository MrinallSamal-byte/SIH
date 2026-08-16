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

export default function MainLayout() {
  const { t, lang, setLang } = useLanguage()
  const { theme, toggleTheme } = useTheme()
  const year = new Date().getFullYear()
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    setMobileMenuOpen(false)
  }, [location.pathname])

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {/* Top Emergency Hotlines Banner */}
      <div className="border-b border-slate-200 bg-white px-4 py-1 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 font-semibold text-red-600 dark:text-red-400">
              <span className="h-1.5 w-1.5 rounded-full bg-red-600" />
              National Emergency: <a href="tel:112" className="underline font-bold">112</a>
            </span>
            <span className="hidden sm:inline text-slate-300 dark:text-slate-700">|</span>
            <span className="hidden sm:inline">
              Ambulance: <a href="tel:108" className="hover:text-slate-900 dark:hover:text-slate-200 font-medium">108</a>
            </span>
            <span className="hidden sm:inline text-slate-300 dark:text-slate-700">|</span>
            <span className="hidden md:inline">
              NDMA Helpline: <a href="tel:1078" className="hover:text-slate-900 dark:hover:text-slate-200 font-medium">1078</a>
            </span>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>24x7 Emergency Services Active</span>
          </div>
        </div>
      </div>

      {/* Main Navigation Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-950/95">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          {/* Logo / Brand */}
          <Link to="/" className="flex items-center gap-2.5 no-underline">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white font-bold text-sm dark:bg-slate-100 dark:text-slate-900">
              आ
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">
                {t('app.name')}
              </span>
              <span className="hidden sm:inline-block ml-2 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
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
                    ? `ml-1 rounded-md px-3 py-1.5 text-xs font-bold transition-all ${
                        isActive
                          ? 'bg-red-600 text-white shadow-sm'
                          : 'bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-900/50'
                      }`
                    : `rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
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
              className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 outline-none hover:border-slate-300 focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
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
              className="rounded-md border border-slate-200 bg-white p-1.5 text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
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

            {/* Mobile Hamburger Toggle */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((o) => !o)}
              className="rounded-md border border-slate-200 p-1.5 text-slate-700 md:hidden dark:border-slate-700 dark:text-slate-300"
              aria-label="Open mobile menu"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                {mobileMenuOpen ? <path d="M6 18L18 6M6 6l12 12" /> : <path d="M4 6h16M4 12h16M4 18h16" />}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <nav className="border-t border-slate-100 bg-white px-4 py-3 md:hidden dark:border-slate-800 dark:bg-slate-950">
            <div className="flex flex-col gap-1.5">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    item.isSos
                      ? `rounded-lg px-3.5 py-2.5 text-sm font-bold ${
                          isActive ? 'bg-red-600 text-white' : 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'
                        }`
                      : `rounded-lg px-3.5 py-2 text-sm font-medium ${
                          isActive
                            ? 'bg-slate-100 font-bold text-slate-900 dark:bg-slate-800 dark:text-white'
                            : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-900'
                        }`
                  }
                >
                  {t(item.labelKey)}
                </NavLink>
              ))}

              <div className="mt-2 border-t border-slate-100 pt-2 flex flex-col gap-1 text-xs dark:border-slate-800">
                <Link to="/alerts" className="px-3.5 py-1.5 text-slate-600 dark:text-slate-400">
                  ⚠️ Public Warnings & Alerts
                </Link>
                <Link to="/report-damage" className="px-3.5 py-1.5 text-slate-600 dark:text-slate-400">
                  🏚️ SDRF Property Damage Assessment
                </Link>
                <Link to="/pfa-chat" className="px-3.5 py-1.5 text-slate-600 dark:text-slate-400">
                  🤖 AapdaMitra AI Crisis Companion
                </Link>
              </div>
            </div>
          </nav>
        )}
      </header>

      {/* Main Container */}
      <main className="mx-auto flex-1 w-full max-w-7xl px-4 py-6">
        <div key={location.pathname} className="animate-page-enter">
          <Outlet />
        </div>
      </main>

      {/* Minimal Clean Footer */}
      <footer className="border-t border-slate-200 bg-white py-8 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
        <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800 dark:text-slate-200">AapdaSetu</span>
            <span>— Zero-login disaster incident response system.</span>
          </div>

          <div className="flex items-center gap-4">
            <a href="tel:112" className="text-red-600 hover:underline dark:text-red-400 font-medium">
              Dial 112 Emergency
            </a>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <span>© {year} AapdaSetu Emergency Operations</span>
          </div>
        </div>
      </footer>

      <ChatWidget />
    </div>
  )
}

