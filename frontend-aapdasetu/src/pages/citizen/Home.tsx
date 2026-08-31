import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Siren,
  ArrowRight,
  ArrowUpRight,
  ShieldCheck,
  Building,
  Compass,
  Users,
  FileSpreadsheet,
  Bot,
  Search,
  Radio,
  Smartphone
} from 'lucide-react'
import { useLanguage } from '../../lib/i18n'
import { listAlerts, listShelters } from '../../api/endpoints'
import type { Alert } from '../../types'

interface ServiceCard {
  to: string
  titleKey: string
  descKey: string
  icon: typeof ShieldCheck
}

const emergencyServices: ServiceCard[] = [
  {
    to: '/checkin',
    titleKey: 'nav.checkin',
    descKey: 'checkin.subtitle',
    icon: ShieldCheck,
  },
  {
    to: '/alerts',
    titleKey: 'nav.alerts',
    descKey: 'alerts.pageDesc',
    icon: Radio,
  },
  {
    to: '/shelters',
    titleKey: 'nav.shelters',
    descKey: 'service.sheltersDesc',
    icon: Building,
  },
  {
    to: '/safe-routes',
    titleKey: 'nav.routes',
    descKey: 'service.routesDesc',
    icon: Compass,
  },
  {
    to: '/missing-persons',
    titleKey: 'nav.missing',
    descKey: 'service.missingDesc',
    icon: Users,
  },
  {
    to: '/report-damage',
    titleKey: 'nav.damage',
    descKey: 'service.damageDesc',
    icon: FileSpreadsheet,
  },
  {
    to: '/pfa-chat',
    titleKey: 'nav.pfa',
    descKey: 'service.pfaDesc',
    icon: Bot,
  },
  {
    to: '/app',
    titleKey: 'appdl.navLabel',
    descKey: 'appdl.cardDesc',
    icon: Smartphone,
  },
]

export default function Home() {
  const { t } = useLanguage()
  const [activeAlertCount, setActiveAlertCount] = useState<number | null>(null)
  const [openShelterCount, setOpenShelterCount] = useState<number | null>(null)

  // Snapshot live status for the crisis-first strip. Degrades silently to
  // nothing when either feed is unavailable.
  useEffect(() => {
    let active = true
    listAlerts()
      .then((data: Alert[]) => {
        if (!active) return
        if (!Array.isArray(data)) {
          setActiveAlertCount(null)
          return
        }
        setActiveAlertCount(data.filter((a) => a.severity === 'critical' || a.severity === 'warning').length)
      })
      .catch(() => {})
    listShelters('open')
      .then((data) => { if (active) setOpenShelterCount(Array.isArray(data) ? data.length : null) })
      .catch(() => {})
    return () => { active = false }
  }, [])

  return (
    <div className="space-y-12 sm:space-y-16 pb-12">
      {/* Hero Section */}
      <section className="pt-6 sm:pt-12 text-center max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold tracking-tight sm:text-4xl md:text-6xl text-zinc-800 dark:text-slate-300 mb-3 sm:mb-5">
          {t('hero.title')}
        </h1>
        <p className="text-sm sm:text-lg text-zinc-500 dark:text-slate-400 max-w-2xl mx-auto mb-5 sm:mb-8 leading-relaxed">
          {t('hero.subtitle')}
        </p>

        {/* Live Status Strip — hidden entirely when no data could be fetched */}
        {(activeAlertCount !== null || openShelterCount !== null) && (
          <div className="mb-6 flex flex-wrap items-center justify-center gap-2 text-xs">
            {activeAlertCount !== null && (
              <Link
                to="/alerts"
                className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 font-bold text-red-700 transition hover:bg-red-100 active:scale-[0.98] dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-900/60 cursor-pointer"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-red-600 animate-pulse" />
                <span>{activeAlertCount}</span>
                <span>{t('home.activeAlerts')}</span>
              </Link>
            )}
            <span aria-hidden="true" className="hidden text-slate-300 sm:inline dark:text-zinc-600">·</span>
            {openShelterCount !== null && (
              <Link
                to="/shelters"
                className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 font-bold text-emerald-700 transition hover:bg-emerald-100 active:scale-[0.98] dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/60 cursor-pointer"
              >
                <Building className="h-3.5 w-3.5" />
                <span>{openShelterCount}</span>
                <span>{t('home.sheltersOpen')}</span>
              </Link>
            )}
          </div>
        )}

        {/* Hero CTAs — SOS is the primary, largest action */}
        <div className="mt-6 flex flex-col items-center justify-center gap-3 md:flex-row">
          <Link
            to="/sos"
            className="group inline-flex w-full items-center justify-center gap-2.5 rounded-xl bg-red-600 px-8 py-4 text-base font-extrabold uppercase tracking-tight text-white shadow-md shadow-red-600/20 ring-2 ring-red-600/30 transition hover:bg-red-700 active:scale-[0.98] md:w-auto sm:text-lg"
          >
            <Siren className="h-6 w-6" />
            <span>{t('hero.tapSos')}</span>
          </Link>
          <Link
            to="/track"
            className="group hidden w-full items-center justify-center gap-2.5 rounded-xl border border-zinc-200 bg-white px-6 py-3 text-sm font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50 active:scale-[0.98] md:inline-flex md:w-auto sm:text-base dark:border-white/[0.1] dark:bg-[#1a1a1a] dark:text-slate-200 dark:hover:bg-[#252525]"
          >
            <Search className="size-[18px]" />
            <span>{t('nav.track')}</span>
          </Link>
          <Link
            to="/report"
            className="group hidden w-full items-center justify-center gap-2.5 rounded-xl bg-zinc-800 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-700 active:scale-[0.98] md:inline-flex md:w-auto sm:text-base dark:bg-slate-100 dark:text-zinc-800 dark:hover:bg-white"
          >
            <span>{t('hero.submitReport')}</span>
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </section>

      <section>
        <div className="mb-4 px-1">
          <h2 className="text-[11px] font-semibold tracking-widest text-slate-500 dark:text-slate-400 uppercase mono">
            {t('hero.quickAccess')}
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {emergencyServices.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.to}
                to={item.to}
                className="group relative flex flex-col rounded-2xl border border-zinc-200/80 bg-white p-4 sm:p-5 text-left transition hover:border-zinc-400 active:scale-[0.99] dark:border-white/[0.08] dark:bg-[#1a1a1a] dark:hover:border-slate-600/80"
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-800 text-white dark:bg-slate-100 dark:text-zinc-800">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-bold tracking-tight text-zinc-800 sm:text-base dark:text-slate-300">
                  {t(item.titleKey)}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                  {t(item.descKey)}
                </p>
              </Link>
            )
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200/80 bg-white p-6 sm:p-8 dark:border-white/[0.08] dark:bg-[#181818]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-100 pb-6 dark:border-white/[0.06]">
          <div>
            <span className="text-[11px] font-semibold tracking-widest text-red-600 dark:text-red-400 uppercase mono">
              {t('home.helplinesKicker')}
            </span>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-slate-100 mt-1">
              {t('home.helplinesTitle')}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              {t('home.helplinesDesc')}
            </p>
          </div>
          <Link
            to="/contacts"
            className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-zinc-800 dark:bg-slate-100 dark:text-zinc-900 dark:hover:bg-white self-start sm:self-center"
          >
            <span>{t('home.viewAllContacts')}</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-6 sm:grid-cols-4">
          <a
            href="tel:112"
            aria-label={`${t('home.helpline112')} 112`}
            className="group rounded-2xl border border-red-100 bg-red-50/50 p-4 transition hover:bg-red-50 dark:border-red-950/40 dark:bg-red-950/20 dark:hover:bg-red-950/40"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-red-600 dark:text-red-400 mono">{t('home.helpline112')}</span>
              <ArrowUpRight className="h-3.5 w-3.5 text-red-400" />
            </div>
            <div className="mt-2 text-2xl font-bold tracking-tight text-red-700 dark:text-red-400 mono">112</div>
            <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">{t('home.helpline112Desc')}</div>
          </a>

          <a
            href="tel:1078"
            aria-label={`${t('home.helpline1078')} 1078`}
            className="group rounded-2xl border border-zinc-200/80 bg-zinc-50/60 p-4 transition hover:bg-zinc-50 dark:border-white/[0.08] dark:bg-[#1a1a1a] dark:hover:bg-[#222]"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600 dark:text-slate-400 mono">{t('home.helpline1078')}</span>
              <ArrowUpRight className="h-3.5 w-3.5 text-zinc-400" />
            </div>
            <div className="mt-2 text-2xl font-bold tracking-tight text-zinc-800 dark:text-slate-200 mono">1078</div>
            <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">{t('home.helpline1078Desc')}</div>
          </a>

          <a
            href="tel:1077"
            aria-label={`${t('home.helpline1077')} 1077`}
            className="group rounded-2xl border border-zinc-200/80 bg-zinc-50/60 p-4 transition hover:bg-zinc-50 dark:border-white/[0.08] dark:bg-[#1a1a1a] dark:hover:bg-[#222]"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600 dark:text-slate-400 mono">{t('home.helpline1077')}</span>
              <ArrowUpRight className="h-3.5 w-3.5 text-zinc-400" />
            </div>
            <div className="mt-2 text-2xl font-bold tracking-tight text-zinc-800 dark:text-slate-200 mono">1077</div>
            <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">{t('home.helpline1077Desc')}</div>
          </a>

          <a
            href="tel:01124363260"
            aria-label={`${t('home.helplineNdrf')} 011-24363260`}
            className="group rounded-2xl border border-zinc-200/80 bg-zinc-50/60 p-4 transition hover:bg-zinc-50 dark:border-white/[0.08] dark:bg-[#1a1a1a] dark:hover:bg-[#222]"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600 dark:text-slate-400 mono">{t('home.helplineNdrf')}</span>
              <ArrowUpRight className="h-3.5 w-3.5 text-zinc-400" />
            </div>
            <div className="mt-2 text-lg font-bold tracking-tight text-zinc-800 dark:text-slate-200 mono">011-24363260</div>
            <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">{t('home.helplineNdrfDesc')}</div>
          </a>
        </div>
      </section>
    </div>
  )
}
