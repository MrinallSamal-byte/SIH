import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import ChatWidget from '../components/ChatWidget'
import { LANGUAGES, useLanguage } from '../lib/i18n'
import { useTheme } from '../lib/theme'

interface NavItem {
  to: string
  labelKey: string
  end?: boolean
  danger?: boolean
}

const primaryNav: NavItem[] = [
  { to: '/', labelKey: 'nav.home', end: true },
  { to: '/sos', labelKey: 'nav.sos', danger: true },
  { to: '/report', labelKey: 'nav.report' },
  { to: '/track', labelKey: 'nav.track' },
  { to: '/shelters', labelKey: 'nav.shelters' },
]

const moreNav: NavItem[] = [
  { to: '/check-in', labelKey: 'nav.checkin' },
  { to: '/alerts', labelKey: 'nav.alerts' },
  { to: '/report-damage', labelKey: 'nav.damage' },
  { to: '/missing-persons', labelKey: 'nav.missing' },
  { to: '/safe-routes', labelKey: 'nav.routes' },
]

const allNav: NavItem[] = [...primaryNav, ...moreNav]

const emergencyContacts = [
  { name: 'National Emergency', number: '112' },
  { name: 'Ambulance', number: '108' },
  { name: 'NDMA Helpline', number: '1078' },
]

export default function MainLayout() {
  const { t, lang, setLang } = useLanguage()
  const { theme, toggleTheme } = useTheme()
  const year = new Date().getFullYear()
  const location = useLocation()
  const isHome = location.pathname === '/'
  const [menuOpen, setMenuOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const moreRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMenuOpen(false)
    setMoreOpen(false)
  }, [location.pathname])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const moreActive = moreNav.some((item) =>
    item.to === '/'
      ? location.pathname === '/'
      : location.pathname.startsWith(item.to),
  )

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="sticky top-0 z-40 border-b border-blue-200/80 bg-white/95 text-blue-900 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 dark:text-blue-100">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <NavLink to="/" end className="shrink-0 no-underline">
            <span className="text-xl font-extrabold tracking-tight text-blue-900 dark:text-blue-300">
              {t('app.name')}
            </span>
          </NavLink>

          <nav className="hidden flex-1 items-center justify-center gap-1 lg:flex">
            {primaryNav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `rounded-full px-3 py-1.5 text-sm font-semibold no-underline transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : item.danger
                        ? 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950'
                        : 'text-slate-600 hover:bg-blue-50 hover:text-blue-800 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-blue-300'
                  }`
                }
              >
                {t(item.labelKey)}
              </NavLink>
            ))}

            <div className="relative" ref={moreRef}>
              <button
                type="button"
                onClick={() => setMoreOpen((o) => !o)}
                className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-semibold no-underline transition-colors ${
                  moreActive
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 hover:bg-blue-50 hover:text-blue-800 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-blue-300'
                }`}
                aria-expanded={moreOpen}
                aria-haspopup="menu"
              >
                {t('nav.more')}
                <svg
                  className={`h-3.5 w-3.5 transition-transform ${moreOpen ? 'rotate-180' : ''}`}
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
              {moreOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg dark:border-slate-700 dark:bg-slate-900">
                  {moreNav.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={({ isActive }) =>
                        `block rounded-lg px-3 py-2 text-sm font-medium no-underline transition-colors ${
                          isActive
                            ? 'bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-blue-800 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-blue-300'
                        }`
                      }
                    >
                      {t(item.labelKey)}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              className="rounded-md border border-blue-300 bg-white p-2 text-blue-900 outline-none transition hover:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-slate-500"
              aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
              title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
            >
              {theme === 'dark' ? (
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path d="M10 2a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0V3a1 1 0 0 1 1-1Zm4.96 2.04a1 1 0 0 1 0 1.414l-.707.707a1 1 0 1 1-1.414-1.414l.707-.707a1 1 0 0 1 1.414 0ZM10 6a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm7 4a1 1 0 1 1 0 2h-1a1 1 0 1 1 0-2h1Zm-3.243 4.243a1 1 0 0 1 1.414 0l.707.707a1 1 0 0 1-1.414 1.414l-.707-.707a1 1 0 0 1 0-1.414ZM10 16a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0v-1a1 1 0 0 1 1-1Zm-4.243-.243a1 1 0 0 1 0 1.414l-.707.707a1 1 0 0 1-1.414-1.414l.707-.707a1 1 0 0 1 1.414 0ZM4 10a1 1 0 0 1-1 1H2a1 1 0 1 1 0-2h1a1 1 0 0 1 1 1Zm1.05-3.95a1 1 0 0 1 0-1.414l.707-.707a1 1 0 1 1 1.414 1.414l-.707.707a1 1 0 0 1-1.414 0Z" />
                </svg>
              ) : (
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path d="M17.293 13.293A8 8 0 0 1 6.707 2.707a8.001 8.001 0 1 0 10.586 10.586Z" />
                </svg>
              )}
            </button>

            <select
              value={lang}
              onChange={(e) => setLang(e.target.value as typeof lang)}
              className="rounded-md border border-blue-300 bg-white px-2 py-1.5 text-xs text-blue-900 outline-none transition focus:border-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
              aria-label="Language"
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              className="rounded-md border border-slate-200 p-2 text-slate-600 hover:bg-slate-100 lg:hidden dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              aria-expanded={menuOpen}
              aria-label="Menu"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                {menuOpen ? (
                  <path d="M6 6l12 12M6 18L18 6" />
                ) : (
                  <path d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {menuOpen && (
          <nav className="border-t border-slate-100 bg-white px-4 py-2 lg:hidden dark:border-slate-800 dark:bg-slate-800">
            <div className="mx-auto flex max-w-7xl flex-col gap-1">
              {allNav.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `rounded-lg px-3 py-2 text-sm font-medium no-underline transition-colors ${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : item.danger
                          ? 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950'
                          : 'text-slate-600 hover:bg-blue-50 hover:text-blue-800 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-blue-300'
                    }`
                  }
                >
                  {t(item.labelKey)}
                </NavLink>
              ))}
            </div>
          </nav>
        )}
      </header>

      <main className={`mx-auto px-4 py-6 ${isHome ? 'max-w-7xl' : 'max-w-screen-2xl'}`}>
        <div key={location.pathname} className="animate-slide-in">
          <Outlet />
        </div>
      </main>

      {isHome && (
        <footer className="mt-8 border-t border-blue-200 bg-white dark:border-slate-800 dark:bg-slate-950">
          <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 text-sm text-slate-600 dark:text-slate-300 md:grid-cols-3">
            <section>
              <h2 className="text-sm font-bold uppercase tracking-wide text-blue-900 dark:text-blue-300">AapdaSetu</h2>
              <p className="mt-2 leading-relaxed">
                Smart India Hackathon disaster management initiative focused on rapid reporting, coordinated rescue,
                and verified community updates.
              </p>
            </section>

            <section>
              <h2 className="text-sm font-bold uppercase tracking-wide text-blue-900 dark:text-blue-300">Emergency Contacts</h2>
              <ul className="mt-2 space-y-1.5 text-xs sm:text-sm">
                {emergencyContacts.map((c) => (
                  <li key={c.name}>
                    <a
                      href={`tel:${c.number}`}
                      className="flex items-center justify-between gap-2 text-slate-700 transition hover:text-red-700 dark:text-slate-300"
                    >
                      <span>{c.name}</span>
                      <span className="font-bold text-red-700">{c.number}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="text-sm font-bold uppercase tracking-wide text-blue-900 dark:text-blue-300">Platform Notes</h2>
              <ul className="mt-2 space-y-1 text-xs sm:text-sm">
                <li>Zero user-side authentication</li>
                <li>Open source under MIT License</li>
                <li>Built for mobile-first emergency operations</li>
              </ul>
            </section>
          </div>

          <div className="border-t border-blue-200 px-4 py-3 text-center text-xs text-blue-700/80 dark:border-slate-800 dark:text-blue-300/70">
            <p>
              Copyright {year} AapdaSetu. Built for resilient communities.
            </p>
          </div>
        </footer>
      )}

      <ChatWidget />
    </div>
  )
}
