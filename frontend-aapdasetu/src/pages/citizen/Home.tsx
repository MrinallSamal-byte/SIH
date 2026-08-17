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
  descKey: string
  tagKey: string
  urgent?: boolean
  icon: 'sos' | 'report' | 'shelter' | 'route' | 'missing' | 'checkin' | 'damage' | 'chat'
}

const emergencyServices: ServiceCard[] = [
  {
    to: '/sos',
    titleKey: 'nav.sos',
    descKey: 'service.sos.desc',
    tagKey: 'service.sos.tag',
    urgent: true,
    icon: 'sos',
  },
  {
    to: '/report',
    titleKey: 'nav.report',
    descKey: 'service.report.desc',
    tagKey: 'service.report.tag',
    icon: 'report',
  },
  {
    to: '/shelters',
    titleKey: 'nav.shelters',
    descKey: 'service.shelters.desc',
    tagKey: 'service.shelters.tag',
    icon: 'shelter',
  },
  {
    to: '/safe-routes',
    titleKey: 'nav.routes',
    descKey: 'service.routes.desc',
    tagKey: 'service.routes.tag',
    icon: 'route',
  },
  {
    to: '/missing-persons',
    titleKey: 'nav.missing',
    descKey: 'service.missing.desc',
    tagKey: 'service.missing.tag',
    icon: 'missing',
  },
  {
    to: '/check-in',
    titleKey: 'nav.checkin',
    descKey: 'service.checkin.desc',
    tagKey: 'service.checkin.tag',
    icon: 'checkin',
  },
  {
    to: '/report-damage',
    titleKey: 'nav.damage',
    descKey: 'service.damage.desc',
    tagKey: 'service.damage.tag',
    icon: 'damage',
  },
  {
    to: '/pfa-chat',
    titleKey: 'nav.pfa',
    descKey: 'service.pfa.desc',
    tagKey: 'service.pfa.tag',
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
    } catch (err) {
      void err
    }

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
        <div className="relative grid gap-4 p-6 sm:p-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-3xl border border-slate-200/80 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-950 sm:p-8">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/60 dark:text-blue-300">
              <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
              {t('home.hero.badge')}
            </span>
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
              {activeAlertCount === null
                ? t('home.hero.syncingBulletins')
                : t('home.hero.activeBulletins', { count: activeAlertCount })}
            </span>
          </div>

          <div className="mt-5 space-y-4">
            <div className="space-y-2">
              <h1 className="max-w-2xl text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl lg:text-5xl">
                {t('home.hero.title')}
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400 sm:text-base">
                {t('home.hero.subtitle')}
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                to="/sos"
                className="inline-flex items-center justify-center rounded-2xl bg-red-600 px-5 py-3 text-sm font-black text-white shadow-md transition hover:bg-red-700 active:scale-[0.99]"
              >
                {t('home.hero.btnSos')}
              </Link>
              <Link
                to="/report"
                className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-800 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                {t('home.hero.btnReport')}
              </Link>
              <Link
                to="/pfa-chat"
                className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-800 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                {t('home.hero.btnAapdaMitra')}
              </Link>
            </div>
          </div>

          <dl className="mt-6 grid gap-3 sm:grid-cols-3">
            {[
              {
                label: t('home.stats.noLogin'),
                value: t('home.stats.noLoginSub'),
              },
              {
                label: t('home.stats.bulletinFeed'),
                value: activeAlertCount === null ? t('common.loading') : `${activeAlertCount} ${t('home.stats.active')}`,
              },
              {
                label: t('home.stats.routing'),
                value: t('home.stats.routingSub'),
              },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{item.label}</dt>
                <dd className="mt-1 text-sm font-bold text-slate-900 dark:text-slate-100">{item.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="rounded-3xl border border-slate-200/80 bg-slate-50 p-6 shadow-xs dark:border-slate-800 dark:bg-slate-950 sm:p-7">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {t('home.quick.badge')}
              </div>
              <div className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">
                {t('home.quick.title')}
              </div>
              <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500 dark:text-slate-400">
                {t('home.quick.subtitle')}
              </p>
            </div>
            <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
              {t('home.quick.live')}
            </span>
          </div>

          <form onSubmit={handleTrackSubmit} className="mt-5 flex gap-2">
            <input
              type="text"
              value={quickTrackId}
              onChange={(e) => setQuickTrackId(e.target.value)}
              placeholder={t('home.quick.placeholder')}
              className="min-w-0 flex-1 rounded-2xl border border-slate-300 bg-white px-3 py-3 text-sm font-mono text-slate-800 placeholder-slate-400 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
            />
            <button
              type="submit"
              className="shrink-0 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 cursor-pointer"
            >
              {t('home.quick.btnTrack')}
            </button>
          </form>

          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            {[
              { label: t('home.quick.emergency'), number: '112', tone: 'red' },
              { label: t('home.quick.ambulance'), number: '108', tone: 'blue' },
              { label: t('home.quick.disaster'), number: '1070', tone: 'amber' },
              { label: t('home.quick.fire'), number: '101', tone: 'slate' },
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
                {t('home.quick.recent')}
              </div>
              <div className="flex flex-wrap gap-2">
                {recentTracked.map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => navigate(`/track?id=${id}`)}
                    className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 font-mono text-[11px] font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 cursor-pointer"
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
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">{t('home.bulletins.title')}</h2>
            <span className="rounded-md bg-red-100 px-2 py-0.5 text-[10px] font-black text-red-700 dark:bg-red-950/80 dark:text-red-300 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
              {t('home.bulletins.live')}
            </span>
          </div>
          <Link
            to="/alerts"
            className="text-xs font-bold text-blue-600 hover:underline dark:text-blue-400"
          >
            {t('home.bulletins.all')}
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
            {t('home.bulletins.empty')}
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
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">{t('home.services.title')}</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">{t('home.services.subtitle')}</p>
          </div>
          <span className="hidden rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400 sm:inline-flex">
            {t('home.services.structured')}
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
                    {t(service.tagKey)}
                  </span>
                </div>
                <h3 className="mt-3 text-sm font-bold text-slate-900 dark:text-slate-100">
                  {t(service.titleKey)}
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                  {t(service.descKey)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
