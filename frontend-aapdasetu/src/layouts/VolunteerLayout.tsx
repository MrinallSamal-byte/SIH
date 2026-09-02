import { Link, NavLink, Navigate, Outlet, useNavigate } from 'react-router-dom'
import { User, LogOut, ArrowRight } from 'lucide-react'
import AapdaSetuLogo from '../components/common/AapdaSetuLogo'
import NotificationCenter from '../components/common/NotificationCenter'
import { useIsVolunteerAuthed, useVolunteerAuth } from '../hooks/useVolunteerAuth'
import { useLanguage } from '../lib/i18n'

const links = [
  { to: '/volunteer', labelKey: 'volNav.dashboard', end: true },
  { to: '/volunteer/tasks', labelKey: 'volNav.tasks' },
  { to: '/volunteer/check-in', labelKey: 'volNav.checkin' },
]

export default function VolunteerLayout() {
  const { t } = useLanguage()
  const authed = useIsVolunteerAuthed()
  const { logout, user } = useVolunteerAuth()
  const navigate = useNavigate()

  if (!authed) return <Navigate to="/volunteer/login" replace />

  const handleLogout = () => {
    logout()
    navigate('/volunteer/login')
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-zinc-800 dark:bg-slate-950 dark:text-slate-100">
      <header className="border-b border-zinc-200/80 bg-white dark:border-slate-800 dark:bg-zinc-800">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link to="/" className="shrink-0">
              <AapdaSetuLogo size={32} />
            </Link>
            <div>
              <div className="text-sm font-bold tracking-tight text-zinc-800 dark:text-slate-100">
                {t('volNav.title')}
              </div>
              <div className="text-[10px] text-slate-400">{t('volNav.subtitle')}</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <nav className="hidden sm:flex gap-1">
              {links.map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  end={l.end}
                  className={({ isActive }) =>
                    `rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                      isActive
                        ? 'bg-zinc-800 text-white dark:bg-slate-100 dark:text-zinc-800'
                        : 'text-zinc-500 hover:bg-zinc-100 dark:text-slate-400 dark:hover:bg-zinc-700'
                    }`
                  }
                >
                  {t(l.labelKey)}
                </NavLink>
              ))}
            </nav>

            {user?.name && (
              <span className="hidden md:flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium px-2">
                <User className="h-3.5 w-3.5" />
                {user.name}
              </span>
            )}

            <NotificationCenter role="citizen" align="right" />

            <Link
              to="/"
              className="flex items-center gap-1 rounded-lg border border-zinc-200/80 px-2.5 py-1 text-xs font-medium text-slate-500 hover:bg-zinc-100 dark:border-white/[0.1] dark:text-slate-400 dark:hover:bg-zinc-700"
            >
              <span>{t('volNav.publicApp')}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-100 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-900/60"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>{t('volNav.exit')}</span>
            </button>
          </div>
        </div>

        {/* Mobile secondary nav for volunteer */}
        <div className="flex sm:hidden border-t border-slate-100 px-4 py-2 gap-1 dark:border-slate-800">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                `flex-1 text-center rounded-md px-2 py-1 text-xs font-semibold ${
                  isActive
                    ? 'bg-zinc-800 text-white dark:bg-slate-100 dark:text-zinc-800'
                    : 'text-zinc-500 dark:text-slate-400'
                }`
              }
            >
              {t(l.labelKey)}
            </NavLink>
          ))}
        </div>
      </header>

      <main className="mx-auto flex-1 w-full max-w-6xl p-4 md:p-6">
        <Outlet />
      </main>
    </div>
  )
}
