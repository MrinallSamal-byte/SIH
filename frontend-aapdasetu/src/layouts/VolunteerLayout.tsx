import { Link, NavLink, Outlet } from 'react-router-dom'

const links = [
  { to: '/volunteer', label: 'Operational Dashboard', end: true },
  { to: '/volunteer/tasks', label: 'Assigned Rescue Tasks' },
  { to: '/volunteer/check-in', label: 'Safety Check-in' },
]

export default function VolunteerLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-600 font-bold text-white text-xs">
              V
            </Link>
            <div>
              <div className="text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100">
                AapdaSetu Volunteer Force
              </div>
              <div className="text-[10px] text-slate-400">Field Responders & Medical Volunteers</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <nav className="flex gap-1">
              {links.map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  end={l.end}
                  className={({ isActive }) =>
                    `rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                      isActive
                        ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                        : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                    }`
                  }
                >
                  {l.label}
                </NavLink>
              ))}
            </nav>

            <Link
              to="/"
              className="ml-3 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              Public App →
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto flex-1 w-full max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}

