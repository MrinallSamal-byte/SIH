import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Siren,
  ArrowRight,
  ArrowUpRight,
  ShieldCheck,
  Building,
  FileText,
  Compass,
  Users,
  FileSpreadsheet,
  Bot,
  AlertTriangle,
  MapPin,
  Phone,
  ShieldAlert,
  Info,
  Search,
  CheckCircle2
} from 'lucide-react'
import { listAlerts } from '../../api/endpoints'
import Badge from '../../components/common/Badge'
import { useLanguage } from '../../lib/i18n'
import { timeAgo } from '../../lib/helpers'
import { openChatWidget } from '../../components/ChatWidget'
import type { Alert } from '../../types'

interface ServiceCard {
  to: string
  num: string
  tagKey: string
  titleKey: string
  descKey: string
  icon: typeof ShieldCheck
}

const emergencyServices: ServiceCard[] = [
  {
    to: '/check-in',
    num: '01',
    tagKey: 'service.noticeTag',
    titleKey: 'nav.checkin',
    descKey: 'service.checkinDesc',
    icon: ShieldCheck,
  },
  {
    to: '/shelters',
    num: '02',
    tagKey: 'service.sheltersTag',
    titleKey: 'nav.shelters',
    descKey: 'service.sheltersDesc',
    icon: Building,
  },
  {
    to: '/track',
    num: '03',
    tagKey: 'service.statusTag',
    titleKey: 'nav.track',
    descKey: 'service.trackDesc',
    icon: FileText,
  },
  {
    to: '/safe-routes',
    num: '04',
    tagKey: 'service.navTag',
    titleKey: 'nav.routes',
    descKey: 'service.routesDesc',
    icon: Compass,
  },
  {
    to: '/missing-persons',
    num: '05',
    tagKey: 'service.registryTag',
    titleKey: 'nav.missing',
    descKey: 'service.missingDesc',
    icon: Users,
  },
  {
    to: '/report-damage',
    num: '06',
    tagKey: 'service.claimsTag',
    titleKey: 'nav.damage',
    descKey: 'service.damageDesc',
    icon: FileSpreadsheet,
  },
  {
    to: '/pfa-chat',
    num: '07',
    tagKey: 'service.aiTag',
    titleKey: 'nav.pfa',
    descKey: 'service.pfaDesc',
    icon: Bot,
  },
]

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
    } catch {
      // Storage unavailable or corrupted
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
    <div className="space-y-12 sm:space-y-16 pb-12">
      {/* Hero Section */}
      <section className="pt-6 sm:pt-12 text-center max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-1 text-xs font-semibold text-slate-700 shadow-xs dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 mb-6">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-bold">{t('hero.badgeSystem')}</span>
          <span className="text-slate-300 dark:text-slate-700">|</span>
          <span className="text-slate-500 dark:text-slate-400 mono text-[11px]">
            {activeAlertCount === null ? t('hero.syncing') : `${activeAlertCount} ${t('hero.activeBulletins')}`}
          </span>
        </div>

        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl text-slate-900 dark:text-slate-100 mb-5">
          {t('hero.title')}
        </h1>
        <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto mb-8 leading-relaxed">
          {t('hero.subtitle')}
        </p>

        {/* Hero CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/report"
            className="w-full sm:w-auto group inline-flex items-center justify-center gap-2.5 rounded-xl bg-slate-900 px-8 py-3.5 text-base font-semibold text-white transition-all hover:bg-slate-800 active:scale-[0.98] dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white shadow-sm cursor-pointer"
          >
            <span>{t('hero.submitReport')}</span>
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <Link
            to="/sos"
            className="w-full sm:w-auto group inline-flex items-center justify-center gap-2.5 rounded-xl bg-red-600 px-7 py-3.5 text-base font-bold text-white transition-all hover:bg-red-700 active:scale-[0.98] shadow-sm cursor-pointer"
          >
            <Siren className="h-5 w-5" />
            <span>{t('hero.tapSos')}</span>
          </Link>
          <button
            type="button"
            onClick={openChatWidget}
            className="w-full sm:w-auto group inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-3.5 text-base font-semibold text-slate-800 transition hover:bg-slate-50 active:scale-[0.98] shadow-xs dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 cursor-pointer"
          >
            <Bot className="h-4.5 w-4.5" />
            <span>{t('hero.aiCompanion')}</span>
          </button>
        </div>
      </section>

      {/* Quick Action Widget Grid */}
      <section>
        <div className="flex items-center justify-between mb-4 px-1">
          <span className="text-[11px] font-bold tracking-widest text-slate-500 dark:text-slate-400 uppercase mono flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-red-600 inline-block animate-pulse" />
            {t('hero.quickAccess')}
          </span>
          <span className="text-[11px] text-slate-400 mono hidden sm:inline-block">
            {t('hero.structuredFlows')}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {emergencyServices.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.to}
                to={item.to}
                className="group relative flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 text-left transition-all duration-200 hover:border-slate-400 hover:shadow-sm hover:-translate-y-0.5 active:scale-[0.98] dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-600 cursor-pointer"
              >
                <div>
                  <div className="flex items-start justify-between w-full mb-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white transition-transform duration-200 group-hover:scale-105 dark:bg-slate-100 dark:text-slate-900">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[11px] font-bold tracking-wider text-slate-400 mono">
                        {item.num}
                      </span>
                      <ArrowUpRight className="h-4 w-4 text-slate-300 transition-colors group-hover:text-slate-900 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 dark:text-slate-600 dark:group-hover:text-slate-100" />
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] font-bold tracking-widest text-slate-400 uppercase mono mb-1">
                      {t(item.tagKey)}
                    </div>
                    <h2 className="text-base font-bold tracking-tight text-slate-900 dark:text-slate-100">
                      {t(item.titleKey)}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      {t(item.descKey)}
                    </p>
                  </div>
                </div>
              </Link>
            )
          })}

          {/* Widget Card 08: Public Safety Registry */}
          <Link
            to="/check-in"
            className="group relative flex flex-col justify-between rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 p-5 text-left transition-all duration-200 hover:border-slate-400 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/40 dark:hover:border-slate-600 cursor-pointer"
          >
            <div>
              <div className="flex items-start justify-between w-full mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white transition-transform duration-200 group-hover:scale-105">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[11px] font-bold tracking-wider text-slate-400 mono">
                    08
                  </span>
                  <ArrowUpRight className="h-4 w-4 text-slate-300 transition-colors group-hover:text-slate-900 dark:text-slate-600 dark:group-hover:text-slate-100" />
                </div>
              </div>

              <div>
                <div className="text-[10px] font-bold tracking-widest text-emerald-600 dark:text-emerald-400 uppercase mono mb-1">
                  {t('service.verificationTag')}
                </div>
                <h2 className="text-base font-bold tracking-tight text-slate-900 dark:text-slate-100">
                  {t('service.publicSafetyTitle')}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                  {t('service.publicSafetyDesc')}
                </p>
              </div>
            </div>
          </Link>
        </div>
      </section>

      {/* 3-Step Triage & Action Process */}
      <section>
        <div className="grid grid-cols-1 gap-px sm:grid-cols-3 bg-slate-200 dark:bg-slate-800 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
          {[
            {
              num: '01',
              icon: AlertTriangle,
              titleKey: 'triage.step1Title',
              descKey: 'triage.step1Desc',
            },
            {
              num: '02',
              icon: MapPin,
              titleKey: 'triage.step2Title',
              descKey: 'triage.step2Desc',
            },
            {
              num: '03',
              icon: Phone,
              titleKey: 'triage.step3Title',
              descKey: 'triage.step3Desc',
            },
          ].map((step) => {
            const Icon = step.icon
            return (
              <div key={step.num} className="bg-white dark:bg-slate-900 p-6 sm:p-8 text-left">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold tracking-widest text-slate-400 mono">{step.num}</span>
                  <Icon className="h-5 w-5 text-slate-400" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">{t(step.titleKey)}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{t(step.descKey)}</p>
              </div>
            )
          })}
        </div>
      </section>

      {/* Public Warning Feed */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">{t('bulletin.title')}</h2>
            <span className="rounded-md bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700 dark:bg-red-950/80 dark:text-red-300 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
              {t('bulletin.liveFeed')}
            </span>
          </div>
          <Link
            to="/alerts"
            className="text-xs font-bold text-slate-900 hover:underline dark:text-slate-100 flex items-center gap-1"
          >
            <span>{t('bulletin.viewAll')}</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {alerts === null ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton-shimmer h-28 rounded-2xl border border-slate-200 dark:border-slate-800" />
            ))}
          </div>
        ) : alerts.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900">
            {t('bulletin.noAlerts')}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {alerts.slice(0, 3).map((a) => {
              const borderClass =
                a.severity === 'critical'
                  ? 'border-l-4 border-l-red-600'
                  : a.severity === 'warning'
                  ? 'border-l-4 border-l-amber-500'
                  : 'border-l-4 border-l-blue-500'

              const Icon = a.severity === 'critical' ? ShieldAlert : a.severity === 'warning' ? AlertTriangle : Info

              return (
                <div
                  key={a.id}
                  className={`flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 ${borderClass}`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-1.5">
                        <Icon className="h-4 w-4 text-slate-500" />
                        <Badge value={a.severity} />
                      </div>
                      <span className="text-[11px] text-slate-400 mono">{timeAgo(a.createdAt)}</span>
                    </div>
                    <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 line-clamp-1">{a.title}</h3>
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">{a.message}</p>
                  </div>
                  {a.region && (
                    <div className="mt-3 flex items-center gap-1 text-[10px] text-slate-400 mono border-t border-slate-100 pt-2 dark:border-slate-800">
                      <MapPin className="h-3 w-3" />
                      <span>{a.region}</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Quick Access & Helpline Section */}
      <section className="grid gap-4 lg:grid-cols-2">
        {/* Quick Tracking Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mono">
                {t('track.quickTag')}
              </div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                {t('track.quickTitle')}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {t('track.quickDesc')}
              </p>
            </div>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400 mono">
              {t('common.live')}
            </span>
          </div>

          <form onSubmit={handleTrackSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={quickTrackId}
                onChange={(e) => setQuickTrackId(e.target.value)}
                placeholder={t('track.quickPlaceholder')}
                className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3.5 py-2.5 text-sm font-mono text-slate-800 placeholder-slate-400 outline-none focus:border-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-300"
              />
            </div>
            <button
              type="submit"
              className="shrink-0 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white cursor-pointer"
            >
              {t('track.quickButton')}
            </button>
          </form>

          {recentTracked.length > 0 && (
            <div className="mt-4 border-t border-slate-100 pt-3 text-[11px] text-slate-500 dark:border-slate-800">
              <div className="mb-1.5 font-bold uppercase tracking-wider text-slate-400 mono text-[10px]">
                {t('track.recentTitle')}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {recentTracked.map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => navigate(`/track?id=${id}`)}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 font-mono text-[11px] font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 cursor-pointer"
                  >
                    {id}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Emergency Numbers Grid */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mono mb-1">
              {t('helpline.tag')}
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {t('helpline.title')}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-4">
              {t('helpline.desc')}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
            {[
              { nameKey: 'helpline.nationalSos', num: '112', highlight: true },
              { nameKey: 'helpline.ambulance', num: '108' },
              { nameKey: 'helpline.police', num: '100' },
              { nameKey: 'helpline.disaster', num: '1070' },
            ].map((item) => (
              <a
                key={item.num}
                href={`tel:${item.num}`}
                className={`flex flex-col items-center justify-center rounded-lg p-3 text-center transition ${
                  item.highlight
                    ? 'bg-red-600 text-white shadow-xs hover:bg-red-700'
                    : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <span className="text-xl font-bold tracking-tight mono">{item.num}</span>
                <span className={`text-[10px] font-semibold mt-0.5 ${item.highlight ? 'text-red-100' : 'text-slate-400'}`}>
                  {t(item.nameKey)}
                </span>
              </a>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
