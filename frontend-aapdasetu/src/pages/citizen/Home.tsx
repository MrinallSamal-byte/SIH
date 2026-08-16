import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { listAlerts } from '../../api/endpoints'
import Badge from '../../components/common/Badge'
import { useLanguage } from '../../lib/i18n'
import { timeAgo } from '../../lib/helpers'
import type { Alert } from '../../types'

const features = [
  { to: '/sos', icon: 'SOS', titleKey: 'nav.sos', desc: 'One-tap distress alert with live GPS + instant RED dispatch' },
  { to: '/report', icon: 'FORM', titleKey: 'nav.report', desc: '7-type incident form with media upload and AI triage' },
  { to: '/track', icon: 'TRACK', titleKey: 'nav.track', desc: 'Look up your incident status with a tracking ID' },
  { to: '/check-in', icon: 'SAFE', titleKey: 'nav.checkin', desc: 'Tell family and responders you are safe' },
  { to: '/shelters', icon: 'HOME', titleKey: 'nav.shelters', desc: 'Nearest open shelters with capacity and amenities' },
  { to: '/alerts', icon: 'ALERT', titleKey: 'nav.alerts', desc: 'Live public warnings from the Command Center' },
  { to: '/pfa-chat', icon: 'PFA', titleKey: 'nav.pfa', desc: 'Calm breathing and grounding while you wait' },
  { to: '/report-damage', icon: 'DAMAGE', titleKey: 'nav.damage', desc: 'Anti-fraud photo damage assessment & SDRF payout' },
  { to: '/missing-persons', icon: 'MISSING', titleKey: 'nav.missing', desc: 'Report or search for missing loved ones' },
  { to: '/safe-routes', icon: 'ROUTE', titleKey: 'nav.routes', desc: 'Evacuation routes that avoid flooded zones' },
]

export default function Home() {
  const { t } = useLanguage()
  const [alerts, setAlerts] = useState<Alert[] | null>(null)
  const toolsRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    let active = true
    listAlerts().then((data) => {
      if (active) setAlerts(data)
    })
    return () => {
      active = false
    }
  }, [])

  const scrollTools = (direction: 'next' | 'prev') => {
    const container = toolsRef.current
    if (!container) return

    const firstCard = container.querySelector<HTMLElement>('[data-tool-card]')
    const gap = 16
    const cardWidth = firstCard ? firstCard.offsetWidth + gap : 320

    container.scrollBy({
      left: direction === 'next' ? cardWidth : -cardWidth,
      behavior: 'smooth',
    })
  }

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-800">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
          {t('app.name')} <span className="text-base font-normal text-slate-500 dark:text-slate-400">— {t('app.tagline')}</span>
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-400">
          Zero-login emergency tools for victims, real-time AI triage, shelter finder, PFA chatbot, and safe
          evacuation routes. Built for high-density, low-infrastructure disaster zones.
        </p>
        <Link
          to="/sos"
          className="mt-4 inline-block rounded-lg bg-red-600 px-6 py-3 text-lg font-bold text-white hover:bg-red-700"
        >
          {t('sos.trigger')}
        </Link>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold dark:text-slate-100">Latest public warnings</h2>
          <Link
            to="/alerts"
            className="rounded-md border border-blue-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 transition hover:border-blue-400 hover:bg-blue-50 hover:text-blue-800 dark:border-slate-700 dark:bg-slate-800 dark:text-blue-300 dark:hover:bg-slate-800"
          >
            View all alerts
          </Link>
        </div>
        {alerts === null ? (
          <div className="text-sm text-slate-400">{t('common.loading')}</div>
        ) : alerts.length === 0 ? (
          <div className="text-sm text-slate-400">No active alerts</div>
        ) : (
          <div className="space-y-2">
            {alerts.slice(0, 3).map((a) => (
              <div key={a.id} className="flex items-start justify-between rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge value={a.severity} />
                    <span className="text-sm font-semibold dark:text-slate-100">{a.title}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{a.message}</p>
                </div>
                <span className="ml-3 shrink-0 text-xs text-slate-400">{timeAgo(a.createdAt)}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold dark:text-slate-100">Emergency tools</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => scrollTools('prev')}
              className="rounded-md border border-slate-300 bg-white p-2 text-slate-700 transition hover:border-blue-400 hover:text-blue-800 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-slate-500"
              aria-label="Previous emergency tools"
            >
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path
                  fillRule="evenodd"
                  d="M12.79 5.23a.75.75 0 0 1-.02 1.06L8.83 10l3.94 3.71a.75.75 0 1 1-1.04 1.08l-4.5-4.25a.75.75 0 0 1 0-1.08l4.5-4.25a.75.75 0 0 1 1.06.02Z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => scrollTools('next')}
              className="rounded-md border border-slate-300 bg-white p-2 text-slate-700 transition hover:border-blue-400 hover:text-blue-800 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-slate-500"
              aria-label="Next emergency tools"
            >
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path
                  fillRule="evenodd"
                  d="M7.21 5.23a.75.75 0 0 1 1.02-.02l4.25 4.5a.75.75 0 0 1 0 1.08l-4.25 4.25a.75.75 0 1 1-1.04-1.08L11.17 10l-3.94-3.71a.75.75 0 0 1-.02-1.06Z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        </div>

        <div
          ref={toolsRef}
          className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        >
          {features.map((f) => (
            <Link
              key={f.to}
              to={f.to}
              data-tool-card
              className="group min-h-[200px] w-[260px] shrink-0 snap-start rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-blue-400 hover:shadow-md sm:w-[290px] dark:border-slate-800 dark:bg-slate-950 dark:hover:border-blue-500"
            >
              <div className="flex h-full flex-col">
                <div className="inline-flex w-fit rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-blue-800 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300">
                  {f.icon}
                </div>
                <div className="mt-3 text-sm font-semibold text-slate-900 dark:text-slate-100">{t(f.titleKey)}</div>
                <div className="mt-2 flex-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">{f.desc}</div>
                <div className="mt-4 flex justify-end">
                  <svg
                    className="h-4 w-4 text-blue-600 transition group-hover:translate-x-0.5 dark:text-blue-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
