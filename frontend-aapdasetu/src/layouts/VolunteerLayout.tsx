import { NavLink, Outlet } from 'react-router-dom'

const links = [
  { to: '/volunteer', label: 'My Dashboard', end: true },
  { to: '/volunteer/tasks', label: 'Assigned Tasks' },
  { to: '/volunteer/check-in', label: 'Check-in' },
]

export default function VolunteerLayout() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <header className="bg-emerald-700 text-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="text-sm font-bold">AapdaSetu — Volunteer Portal</div>
          <nav className="flex gap-2">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                className={({ isActive }) =>
                  `rounded px-3 py-1 text-xs font-medium ${isActive ? 'bg-white/20' : 'text-emerald-100 hover:bg-white/10'}`
                }
              >
                {l.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
