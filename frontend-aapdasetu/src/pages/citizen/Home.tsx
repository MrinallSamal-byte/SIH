import { useEffect, useRef, useState } from 'react'
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
  ChevronLeft,
  ChevronRight,
  Radio,
  Smartphone
} from 'lucide-react'
import { useLanguage } from '../../lib/i18n'
import { openChatWidget } from '../../components/ChatWidget'
import { listAlerts, listShelters } from '../../api/endpoints'
import type { Alert } from '../../types'

interface ServiceCard {
  to: string
  num: string
  tagKey: string
  titleKey: string
  descKey: string
  icon: typeof ShieldCheck
  action?: 'chat'
}

const emergencyServices: ServiceCard[] = [
  {
    to: '/checkin',
    num: '01',
    tagKey: 'service.checkinTag',
    titleKey: 'nav.checkin',
    descKey: 'checkin.subtitle',
    icon: ShieldCheck,
  },
  {
    to: '/alerts',
    num: '02',
    tagKey: 'service.alertsTag',
    titleKey: 'nav.alerts',
    descKey: 'alerts.pageDesc',
    icon: Radio,
  },
  {
    to: '/shelters',
    num: '03',
    tagKey: 'service.sheltersTag',
    titleKey: 'nav.shelters',
    descKey: 'service.sheltersDesc',
    icon: Building,
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
    action: 'chat',
  },
  {
    to: '/app',
    num: '08',
    tagKey: 'appdl.cardTag',
    titleKey: 'appdl.navLabel',
    descKey: 'appdl.cardDesc',
    icon: Smartphone,
  },
]

export default function Home() {
  const { t } = useLanguage()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [activeAlertCount, setActiveAlertCount] = useState<number | null>(null)
  const [openShelterCount, setOpenShelterCount] = useState<number | null>(null)

  // Snapshot live status for the crisis-first strip. Degrades silently to
  // nothing when either feed is unavailable.
  useEffect(() => {
    let active = true
    listAlerts()
      .then((data: Alert[]) => { if (active) setActiveAlertCount(Array.isArray(data) ? data.length : null) })
      .catch(() => {})
    listShelters('open')
      .then((data) => { if (active) setOpenShelterCount(Array.isArray(data) ? data.length : null) })
      .catch(() => {})
    return () => { active = false }
  }, [])

  const scrollCards = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return
    const amount = 280
    scrollRef.current.scrollBy({ left: dir === 'left' ? -amount : amount, behavior: 'smooth' })
  }

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
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-6">
          <Link
            to="/sos"
            className="w-full sm:w-auto group inline-flex items-center justify-center gap-2.5 rounded-xl bg-red-600 px-8 py-4 text-base sm:text-lg font-extrabold uppercase tracking-tight text-white transition-all hover:bg-red-700 active:scale-[0.98] shadow-md shadow-red-600/20 ring-2 ring-red-600/30 cursor-pointer"
          >
            <Siren className="h-6 w-6 animate-pulse" />
            <span>{t('hero.tapSos')}</span>
          </Link>
          <Link
            to="/track"
            className="w-full sm:w-auto group inline-flex items-center justify-center gap-2.5 rounded-xl border border-zinc-200 bg-white px-6 py-3 text-sm sm:text-base font-semibold text-zinc-700 transition-all hover:bg-zinc-50 active:scale-[0.98] shadow-sm dark:border-white/[0.1] dark:bg-[#1a1a1a] dark:text-slate-200 dark:hover:bg-[#252525] cursor-pointer"
          >
            <Search className="size-[18px]" />
            <span>{t('nav.track')}</span>
          </Link>
          <Link
            to="/report"
            className="w-full sm:w-auto group inline-flex items-center justify-center gap-2.5 rounded-xl bg-zinc-800 px-6 py-3 text-sm sm:text-base font-semibold text-white transition-all hover:bg-zinc-700 active:scale-[0.98] dark:bg-slate-100 dark:text-zinc-800 dark:hover:bg-white shadow-sm cursor-pointer"
          >
            <span>{t('hero.submitReport')}</span>
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </section>

      {/* Quick Action Widget Grid */}
      <section>
        <div className="flex items-center justify-between mb-4 px-1">
          <span className="text-[11px] font-bold tracking-widest text-slate-500 dark:text-slate-400 uppercase mono flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-red-600 inline-block animate-pulse" />
            {t('hero.quickAccess')}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => scrollCards('left')}
              className="rounded-lg border border-zinc-200/80 bg-white p-1.5 text-slate-500 transition hover:bg-zinc-50 hover:text-zinc-800 dark:border-white/[0.08] dark:bg-[#1a1a1a] dark:text-slate-400 dark:hover:bg-[#252525] dark:hover:text-slate-200"
              aria-label={t('common.scrollLeft')}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => scrollCards('right')}
              className="rounded-lg border border-zinc-200/80 bg-white p-1.5 text-slate-500 transition hover:bg-zinc-50 hover:text-zinc-800 dark:border-white/[0.08] dark:bg-[#1a1a1a] dark:text-slate-400 dark:hover:bg-[#252525] dark:hover:text-slate-200"
              aria-label={t('common.scrollRight')}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div ref={scrollRef} className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide -mx-1 px-1">
          {emergencyServices.map((item) => {
            const Icon = item.icon
            const inner = (
              <>
                <div>
                  <div className="flex items-start justify-between w-full mb-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-800 text-white transition-transform duration-200 group-hover:scale-105 dark:bg-slate-100 dark:text-zinc-800">
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[11px] font-bold tracking-wider text-slate-400 mono">
                        {item.num}
                      </span>
                      <ArrowUpRight className="h-4 w-4 text-slate-300 transition-colors group-hover:text-zinc-800 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 dark:text-zinc-500 dark:group-hover:text-slate-100" />
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] font-bold tracking-widest text-slate-400 uppercase mono mb-1">
                      {t(item.tagKey)}
                    </div>
                    <h2 className="text-sm sm:text-lg font-bold tracking-tight text-zinc-800 dark:text-slate-300">
                      {t(item.titleKey)}
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      {t(item.descKey)}
                    </p>
                  </div>
                </div>
              </>
            )
            // The AI card opens the floating chat widget instead of navigating away
            return item.action === 'chat' ? (
              <button
                key={item.to}
                type="button"
                onClick={openChatWidget}
                className="group relative flex min-w-[260px] max-w-[300px] flex-1 flex-col justify-between rounded-2xl border border-zinc-200/80 bg-white p-4 sm:p-6 text-left transition-all duration-200 hover:border-slate-400 active:scale-[0.98] snap-start dark:border-white/[0.08] dark:bg-[#1a1a1a] dark:hover:border-slate-600/80 cursor-pointer"
              >
                {inner}
              </button>
            ) : (
              <Link
                key={item.to}
                to={item.to}
                className="group relative flex min-w-[260px] max-w-[300px] flex-1 flex-col justify-between rounded-2xl border border-zinc-200/80 bg-white p-4 sm:p-6 text-left transition-all duration-200 hover:border-slate-400 active:scale-[0.98] snap-start dark:border-white/[0.08] dark:bg-[#1a1a1a] dark:hover:border-slate-600/80 cursor-pointer"
              >
                {inner}
              </Link>
            )
          })}
        </div>
      </section>

      {/* National Emergency Hotline Strip */}
      <section className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-sm dark:border-white/[0.08] dark:bg-[#181818]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6 dark:border-slate-800">
          <div>
            <span className="text-[11px] font-bold tracking-widest text-red-600 dark:text-red-400 uppercase mono">
              National Emergency Directory
            </span>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-zinc-900 dark:text-slate-100 mt-1">
              Direct Emergency Helplines
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Toll-free 24/7 disaster response and rescue dispatch lines across India
            </p>
          </div>
          <Link
            to="/contacts"
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-slate-800 dark:bg-slate-100 dark:text-zinc-900 dark:hover:bg-white self-start sm:self-center"
          >
            <span>View All Contacts</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-6 sm:grid-cols-4">
          <a
            href="tel:112"
            className="group rounded-2xl border border-red-100 bg-red-50/50 p-4 transition-all hover:bg-red-50 hover:shadow-sm dark:border-red-950/40 dark:bg-red-950/20 dark:hover:bg-red-950/40"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400 mono">Emergency</span>
              <ArrowUpRight className="h-3.5 w-3.5 text-red-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </div>
            <div className="mt-2 text-2xl font-black tracking-tight text-red-700 dark:text-red-400 mono">112</div>
            <div className="mt-1 text-xs text-slate-600 dark:text-slate-400 font-medium">All India Emergency</div>
          </a>

          <a
            href="tel:1078"
            className="group rounded-2xl border border-amber-100 bg-amber-50/50 p-4 transition-all hover:bg-amber-50 hover:shadow-sm dark:border-amber-950/40 dark:bg-amber-950/20 dark:hover:bg-amber-950/40"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 mono">NDMA</span>
              <ArrowUpRight className="h-3.5 w-3.5 text-amber-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </div>
            <div className="mt-2 text-2xl font-black tracking-tight text-amber-700 dark:text-amber-400 mono">1078</div>
            <div className="mt-1 text-xs text-slate-600 dark:text-slate-400 font-medium">Disaster Management</div>
          </a>

          <a
            href="tel:1077"
            className="group rounded-2xl border border-blue-100 bg-blue-50/50 p-4 transition-all hover:bg-blue-50 hover:shadow-sm dark:border-blue-950/40 dark:bg-blue-950/20 dark:hover:bg-blue-950/40"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 mono">SEOC / DEOC</span>
              <ArrowUpRight className="h-3.5 w-3.5 text-blue-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </div>
            <div className="mt-2 text-2xl font-black tracking-tight text-blue-700 dark:text-blue-400 mono">1077</div>
            <div className="mt-1 text-xs text-slate-600 dark:text-slate-400 font-medium">State Emergency Ops</div>
          </a>

          <a
            href="tel:01124363260"
            className="group rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4 transition-all hover:bg-emerald-50 hover:shadow-sm dark:border-emerald-950/40 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/40"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mono">NDRF HQ</span>
              <ArrowUpRight className="h-3.5 w-3.5 text-emerald-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </div>
            <div className="mt-2 text-lg font-black tracking-tight text-emerald-700 dark:text-emerald-400 mono">011-24363260</div>
            <div className="mt-1 text-xs text-slate-600 dark:text-slate-400 font-medium">Disaster Response Force</div>
          </a>
        </div>
      </section>
    </div>
  )
}
