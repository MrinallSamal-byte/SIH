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

  useEffect(() => {
    let active = true
    listAlerts().then((data) => {
      if (active) setAlerts(data)
    })
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
    <div className="space-y-8">
      {/* Top Emergency Incident Banner */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 dark:border-slate-800 dark:bg-slate-900 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Emergency Disaster Response
            </h1>
            <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Report incidents without login, find nearby shelters, search missing persons, and access safe evacuation routes.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
            <Link
              to="/sos"
              className="flex items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-3.5 text-sm font-bold text-white shadow-xs transition hover:bg-red-700"
            >
              <span>{t('sos.trigger')}</span>
            </Link>

            {/* Quick Status Lookup */}
            <form onSubmit={handleTrackSubmit} className="flex gap-1.5">
              <input
                type="text"
                value={quickTrackId}
                onChange={(e) => setQuickTrackId(e.target.value)}
                placeholder="Track ID (e.g. SOS-7890)"
                className="w-full sm:w-48 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-blue-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              />
              <button
                type="submit"
                className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900"
              >
                Track
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Public Warning Feed */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Official Warning Bulletins</h2>
            <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
              Live Feed
            </span>
          </div>
          <Link
            to="/alerts"
            className="text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400"
          >
            All Bulletins →
          </Link>
        </div>

        {alerts === null ? (
          <div className="rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-400 dark:border-slate-800 dark:bg-slate-900">
            {t('common.loading')}
          </div>
        ) : alerts.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900">
            No critical weather or flood alerts currently in your sector.
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
                  <span
                    className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      service.urgent
                        ? 'bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                  >
                    {service.tag}
                  </span>
                  <span className="text-slate-400 transition group-hover:translate-x-1 group-hover:text-slate-700 dark:group-hover:text-slate-200 text-xs">
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

