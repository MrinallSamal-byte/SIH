import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { listAlerts } from '../../api/endpoints'
import Badge from '../../components/common/Badge'
import { useLanguage } from '../../lib/i18n'
import { timeAgo } from '../../lib/helpers'
import type { Alert } from '../../types'

interface ServiceCard {
  to: string
  titleKey: string
  desc: string
  tag?: string
  urgent?: boolean
  icon: 'sos' | 'report' | 'shelter' | 'route' | 'missing' | 'checkin' | 'damage' | 'chat'
}

const emergencyServices: ServiceCard[] = [
  {
    to: '/sos',
    titleKey: 'nav.sos',
    desc: 'Instant GPS distress beacon dispatched immediately to NDRF & State Emergency Operations.',
    tag: 'Life Threatening',
    urgent: true,
    icon: 'sos',
  },
  {
    to: '/report',
    titleKey: 'nav.report',
    desc: 'Report trapped victims, medical emergencies, food shortages, or infrastructure collapse.',
    tag: 'Triage & Rescue',
    icon: 'report',
  },
  {
    to: '/shelters',
    titleKey: 'nav.shelters',
    desc: 'Locate nearest operational relief camps with real-time bed capacity, food, and medical stations.',
    tag: 'Relief Camps',
    icon: 'shelter',
  },
  {
    to: '/safe-routes',
    titleKey: 'nav.routes',
    desc: 'Evacuation corridors dynamically routed around flooded perimeters and blocked highways.',
    tag: 'Navigation',
    icon: 'route',
  },
  {
    to: '/missing-persons',
    titleKey: 'nav.missing',
    desc: 'Search missing person bulletins or report a missing family member with photo verification.',
    tag: 'Registry',
    icon: 'missing',
  },
  {
    to: '/check-in',
    titleKey: 'nav.checkin',
    desc: 'Mark yourself and family safe to reassure loved ones and reduce search team overhead.',
    tag: 'Public Notice',
    icon: 'checkin',
  },
  {
    to: '/report-damage',
    titleKey: 'nav.damage',
    desc: 'Submit geotagged structural damage claims for SDRF / NDMA disaster relief compensation.',
    tag: 'Relief Claims',
    icon: 'damage',
  },
  {
    to: '/pfa-chat',
    titleKey: 'nav.pfa',
    desc: '24/7 intelligent AI companion for real-time disaster survival tactics, medical triage, and trauma support.',
    tag: 'AI Companion',
    icon: 'chat',
  },
]

function ServiceIcon({ icon }: { icon: ServiceCard['icon'] }) {
  const base = 'h-5 w-5'

  if (icon === 'sos') {
    return (
      <svg className={base} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M6.75 17.25h10.5a2.25 2.25 0 0 0 2.06-3.15L13.56 4.98a1.75 1.75 0 0 0-3.12 0L5.19 14.1a2.25 2.25 0 0 0 2.06 3.15Z" />
      </svg>
    )
  }

  if (icon === 'report') {
    return (
      <svg className={base} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 4H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h5.172a2 2 0 0 1 1.414.586l4.828 4.828A2 2 0 0 1 19 10.828V18a2 2 0 0 1-2 2Z" />
      </svg>
    )
  }

  if (icon === 'shelter') {
    return (
      <svg className={base} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 11.5 12 4l9 7.5M5.25 10.75V20h13.5v-9.25" />
      </svg>
    )
  }

  if (icon === 'route') {
    return (
      <svg className={base} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 6h.01M17 18h.01M7 6c0 2.5 3 4 5 6s5 3.5 5 6M7 6c0 2.5 3 4 5 6M17 18c0-2.5-3-4-5-6" />
      </svg>
    )
  }

  if (icon === 'missing') {
    return (
      <svg className={base} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.5 12 16.5l-3 3M12 3a5 5 0 0 0-5 5c0 2.5 1.5 4.1 3 5.5.5.5 1 1.2 1 2v.5h2v-.5c0-.8.5-1.5 1-2 1.5-1.4 3-3 3-5.5a5 5 0 0 0-5-5Z" />
      </svg>
    )
  }

  if (icon === 'checkin') {
    return (
      <svg className={base} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="m9 12 2 2 4-5m-9.5 6.5a8 8 0 1 1 11 0L12 22l-2.5-1.5Z" />
      </svg>
    )
  }

  if (icon === 'damage') {
    return (
      <svg className={base} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 20.5h15M6.5 20.5V9.75L12 4l5.5 5.75V20.5M9 20.5v-4h6v4" />
      </svg>
    )
  }

  return (
    <svg className={base} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v8m-4-4h8" />
    </svg>
  )
}

function ServicePalette({ urgent }: { urgent?: boolean }) {
  return urgent ? 'border-red-200 bg-red-50/90 dark:border-red-900/50 dark:bg-red-950/35' : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
}

export default function Home() {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const [alerts, setAlerts] = useState<Alert[] | null>(null)
  const [quickTrackId, setQuickTrackId] = useState('')
  const [recentTracked, setRecentTracked] = useState<string[]>([])
  const activeAlertCount = alerts?.length ?? null

  useEffect(() => {
    let active = true
    listAlerts().then((data) => {
      if (active) setAlerts(data)
    })
    try {
      const stored = JSON.parse(localStorage.getItem('aapdasetu_tracked_reports') || '[]') as string[]
      setRecentTracked(stored.slice(0, 4))
    } catch {}

    return () => {
      active = false
    }
  }, [])

  const handleTrackSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (quickTrackId.trim()) {
      navigate(`/track?id=${encodeURIComponent(quickTrackId.trim())}`)
    }
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <section className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -right-24 top-0 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />
          <div className="absolute -left-24 bottom-0 h-64 w-64 rounded-full bg-red-500/10 blur-3xl" />
        </div>

        <div className="relative grid gap-4 p-6 sm:p-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-3xl border border-slate-200/70 bg-slate-50/70 p-6 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-950/30 sm:p-8">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-800 dark:border-blue-900/50 dark:bg-blue-950/50 dark:text-blue-300">
              <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
              National Incident Response System
            </span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
              {activeAlertCount === null ? 'Syncing live alerts' : `${activeAlertCount} active bulletins`}
            </span>
          </div>

          <div className="mt-5 space-y-4">
            <div className="space-y-2">
              <h1 className="max-w-2xl text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl lg:text-5xl">
                Disaster Response & Triage Command
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400 sm:text-base">
                Report trapped victims without login, trigger 1-tap SOS, locate open relief camps, and follow live evacuation corridors from one clean public entry point.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                to="/sos"
                className="inline-flex items-center justify-center rounded-2xl bg-red-600 px-5 py-3 text-sm font-black text-white shadow-md transition hover:bg-red-700 active:scale-[0.99]"
              >
                1-TAP EMERGENCY SOS
              </Link>
              <Link
                to="/report"
                className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-slate-50 px-5 py-3 text-sm font-bold text-slate-800 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                Submit Incident Report
              </Link>
              <Link
                to="/pfa-chat"
                className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-800 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                AapdaMitra AI
              </Link>
            </div>
          </div>

          <dl className="mt-6 grid gap-3 sm:grid-cols-3">
            {[
              {
                label: 'No login required',
                value: 'Fast public access',
              },
              {
                label: 'Live bulletin feed',
                value: activeAlertCount === null ? 'Loading' : `${activeAlertCount} active`,
              },
              {
                label: 'Immediate routing',
                value: 'Shelters and safe routes',
              },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/50">
                <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{item.label}</dt>
                <dd className="mt-1 text-sm font-bold text-slate-900 dark:text-slate-100">{item.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="rounded-3xl border border-slate-200/70 bg-white/80 p-6 shadow-xs backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/80 sm:p-7">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Quick Access
              </div>
              <div className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">
                Track and escalate fast
              </div>
              <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500 dark:text-slate-400">
                Use a tracking ID to check status, recover recent reports, or jump straight into the command flow.
              </p>
            </div>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
              Live
            </span>
          </div>

          <form onSubmit={handleTrackSubmit} className="mt-5 flex gap-2">
            <input
              type="text"
              value={quickTrackId}
              onChange={(e) => setQuickTrackId(e.target.value)}
              placeholder="Enter tracking ID"
              className="min-w-0 flex-1 rounded-2xl border border-slate-300 bg-white px-3 py-3 text-sm font-mono text-slate-800 placeholder-slate-400 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
            />
            <button
              type="submit"
              className="shrink-0 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900"
            >
              Track
            </button>
          </form>

          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            {[
              { label: 'Emergency', number: '112', tone: 'red' },
              { label: 'Ambulance', number: '108', tone: 'blue' },
              { label: 'Disaster', number: '1070', tone: 'amber' },
              { label: 'Fire', number: '101', tone: 'slate' },
            ].map((contact) => (
              <a
                key={contact.number}
                href={`tel:${contact.number}`}
                className={`rounded-2xl border p-3 transition hover:-translate-y-0.5 ${
                  contact.tone === 'red'
                    ? 'border-red-200 bg-red-50 text-red-900 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300'
                    : contact.tone === 'blue'
                      ? 'border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-300'
                      : contact.tone === 'amber'
                        ? 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300'
                        : 'border-slate-200 bg-white text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200'
                }`}
              >
                <div className="text-[11px] font-bold uppercase tracking-wider opacity-80">{contact.label}</div>
                <div className="mt-1 text-xl font-black leading-none">{contact.number}</div>
              </a>
            ))}
          </div>

          {recentTracked.length > 0 && (
            <div className="mt-5 border-t border-slate-100 pt-4 text-[11px] text-slate-500 dark:border-slate-800">
              <div className="mb-2 font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Recent Tracking IDs
              </div>
              <div className="flex flex-wrap gap-2">
                {recentTracked.map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => navigate(`/track?id=${id}`)}
                    className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 font-mono text-[11px] font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
                  >
                    {id}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        </div>
      </section>

      {/* Public Warning Feed with Skeletons */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Official Warning Bulletins</h2>
            <span className="rounded-md bg-red-100 px-2 py-0.5 text-[10px] font-black text-red-700 dark:bg-red-950/80 dark:text-red-300 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
              Live Feed
            </span>
          </div>
          <Link
            to="/alerts"
            className="text-xs font-bold text-blue-600 hover:underline dark:text-blue-400"
          >
            All Bulletins →
          </Link>
        </div>

        {alerts === null ? (
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton-shimmer h-24 rounded-xl border border-slate-200 dark:border-slate-800" />
            ))}
          </div>
        ) : alerts.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900">
            No active critical weather or flood alerts currently in your sector.
          </div>
        ) : (
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {alerts.slice(0, 3).map((a) => (
              <div
                key={a.id}
                className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <Badge value={a.severity} />
                    <span className="text-[11px] text-slate-400">{timeAgo(a.createdAt)}</span>
                  </div>
                  <h3 className="mt-2 text-xs font-bold text-slate-900 dark:text-slate-100 line-clamp-1">{a.title}</h3>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 line-clamp-2">{a.message}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Core Emergency Services Grid */}
      <section>
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Disaster Response & Citizen Services</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Direct incident actions for affected citizens and search & rescue teams.</p>
          </div>
          <span className="hidden rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400 sm:inline-flex">
            Structured access
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {emergencyServices.map((service, index) => (
            <Link
              key={service.to}
              to={service.to}
              className={`group flex flex-col justify-between rounded-2xl border p-5 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-sm ${ServicePalette({ urgent: service.urgent })}`}
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${service.urgent ? 'bg-red-600 text-white' : 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'}`}>
                    <ServiceIcon icon={service.icon} />
                  </div>
                  <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-500">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                </div>
                <div className="mt-4 flex items-center gap-1.5">
                  <span
                    className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      service.urgent
                        ? 'bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                  >
                    {service.tag}
                  </span>
                </div>
                <h3 className="mt-3 text-sm font-bold text-slate-900 dark:text-slate-100">
                  {t(service.titleKey)}
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                  {service.desc}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}


