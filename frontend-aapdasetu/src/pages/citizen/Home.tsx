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
}

const emergencyServices: ServiceCard[] = [
  {
    to: '/sos',
    titleKey: 'nav.sos',
    desc: 'Instant GPS distress beacon dispatched immediately to NDRF & State Emergency Operations.',
    tag: 'Life Threatening',
    urgent: true,
  },
  {
    to: '/report',
    titleKey: 'nav.report',
    desc: 'Report trapped victims, medical emergencies, food shortages, or infrastructure collapse.',
    tag: 'Triage & Rescue',
  },
  {
    to: '/shelters',
    titleKey: 'nav.shelters',
    desc: 'Locate nearest operational relief camps with real-time bed capacity, food, and medical stations.',
    tag: 'Relief Camps',
  },
  {
    to: '/safe-routes',
    titleKey: 'nav.routes',
    desc: 'Evacuation corridors dynamically routed around flooded perimeters and blocked highways.',
    tag: 'Navigation',
  },
  {
    to: '/missing-persons',
    titleKey: 'nav.missing',
    desc: 'Search missing person bulletins or report a missing family member with photo verification.',
    tag: 'Registry',
  },
  {
    to: '/check-in',
    titleKey: 'nav.checkin',
    desc: 'Mark yourself and family safe to reassure loved ones and reduce search team overhead.',
    tag: 'Public Notice',
  },
  {
    to: '/report-damage',
    titleKey: 'nav.damage',
    desc: 'Submit geotagged structural damage claims for SDRF / NDMA disaster relief compensation.',
    tag: 'Relief Claims',
  },
  {
    to: '/pfa-chat',
    titleKey: 'nav.pfa',
    desc: '24/7 intelligent AI companion for real-time disaster survival tactics, medical triage, and trauma support.',
    tag: 'AI Companion',
  },
]

export default function Home() {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const [alerts, setAlerts] = useState<Alert[] | null>(null)
  const [quickTrackId, setQuickTrackId] = useState('')
  const [recentTracked, setRecentTracked] = useState<string[]>([])

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
      {/* Top Emergency Action Command Banner */}
      <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 sm:p-7 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="max-w-xl space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-800 dark:border-blue-900/50 dark:bg-blue-950/50 dark:text-blue-300">
              <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
              National Incident Response System
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
              Disaster Response & Triage Command
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Report trapped victims without login, trigger 1-tap satellite SOS, locate open relief camps, and access live safe evacuation corridors.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
            {/* 1-Tap SOS Primary Button */}
            <Link
              to="/sos"
              className="flex items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-3.5 text-sm font-black text-white shadow-md transition hover:bg-red-700 active:scale-95 ring-2 ring-red-200 dark:ring-red-950"
            >
              <span>1-TAP EMERGENCY SOS</span>
            </Link>

            {/* Quick Report Link */}
            <Link
              to="/report"
              className="flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-slate-50 px-5 py-2.5 text-xs font-bold text-slate-800 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <span>Submit Incident Report</span>
            </Link>

            {/* Quick Status Lookup */}
            <form onSubmit={handleTrackSubmit} className="flex gap-1.5 pt-1 border-t border-slate-100 dark:border-slate-800">
              <input
                type="text"
                value={quickTrackId}
                onChange={(e) => setQuickTrackId(e.target.value)}
                placeholder="Track ID (e.g. SOS-7890)"
                className="w-full sm:w-48 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-mono text-slate-800 placeholder-slate-400 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              />
              <button
                type="submit"
                className="shrink-0 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900"
              >
                Track
              </button>
            </form>

            {/* Recent Tracked Chips */}
            {recentTracked.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-slate-500">
                <span className="font-semibold">Recent:</span>
                {recentTracked.map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => navigate(`/track?id=${id}`)}
                    className="font-mono font-bold text-blue-600 hover:underline dark:text-blue-400"
                  >
                    {id}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Emergency Hotline Quick Dial Strip */}
      <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <a
          href="tel:112"
          className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50/80 p-3 text-red-900 transition hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300 shadow-xs"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-600 text-white font-black text-sm">
            112
          </div>
          <div className="min-w-0">
            <div className="text-xs font-black">National SOS</div>
            <div className="text-[10px] text-red-700 dark:text-red-400 truncate">All-India Emergency</div>
          </div>
        </a>

        <a
          href="tel:108"
          className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50/80 p-3 text-blue-900 transition hover:bg-blue-100 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-300 shadow-xs"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white font-black text-sm">
            108
          </div>
          <div className="min-w-0">
            <div className="text-xs font-black">Medical Ambulance</div>
            <div className="text-[10px] text-blue-700 dark:text-blue-400 truncate">Emergency Medical Triage</div>
          </div>
        </a>

        <a
          href="tel:1070"
          className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-amber-900 transition hover:bg-amber-100 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300 shadow-xs"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-600 text-white font-black text-sm">
            1070
          </div>
          <div className="min-w-0">
            <div className="text-xs font-black">Disaster Control</div>
            <div className="text-[10px] text-amber-700 dark:text-amber-400 truncate">State Control Room</div>
          </div>
        </a>

        <a
          href="tel:101"
          className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-slate-900 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 shadow-xs"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-white font-black text-sm dark:bg-slate-200 dark:text-slate-900">
            101
          </div>
          <div className="min-w-0">
            <div className="text-xs font-black">Fire & Rescue</div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">Fire Operations</div>
          </div>
        </a>
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
        <div className="mb-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Disaster Response & Citizen Services</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Direct incident actions for affected citizens and search & rescue teams.</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {emergencyServices.map((service) => (
            <Link
              key={service.to}
              to={service.to}
              className={`group flex flex-col justify-between rounded-xl border bg-white p-5 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-sm dark:bg-slate-900 ${
                service.urgent
                  ? 'border-red-200 hover:border-red-400 dark:border-red-900/50 dark:hover:border-red-700'
                  : 'border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
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
                  <span className="text-slate-400 transition group-hover:translate-x-1 group-hover:text-slate-700 dark:group-hover:text-slate-200 text-xs font-bold">
                    →
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


