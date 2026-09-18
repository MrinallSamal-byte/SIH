import { useRef } from 'react'
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
  Smartphone,
  Bell,
  FileText,
  HeartHandshake
} from 'lucide-react'
import { useLanguage } from '../../lib/i18n'

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
    to: '/report',
    num: '01',
    tagKey: 'service.noticeTag',
    titleKey: 'nav.report',
    descKey: 'service.reportDesc',
    icon: FileText,
  },
  {
    to: '/track',
    num: '02',
    tagKey: 'service.statusTag',
    titleKey: 'nav.track',
    descKey: 'service.trackDesc',
    icon: Search,
  },
  {
    to: '/checkin',
    num: '03',
    tagKey: 'service.registryTag',
    titleKey: 'nav.checkin',
    descKey: 'service.checkinDesc',
    icon: ShieldCheck,
  },
  {
    to: '/shelters',
    num: '04',
    tagKey: 'service.sheltersTag',
    titleKey: 'nav.shelters',
    descKey: 'service.sheltersDesc',
    icon: Building,
  },
  {
    to: '/safe-routes',
    num: '05',
    tagKey: 'service.navTag',
    titleKey: 'nav.routes',
    descKey: 'service.routesDesc',
    icon: Compass,
  },
  {
    to: '/missing-persons',
    num: '06',
    tagKey: 'service.registryTag',
    titleKey: 'nav.missing',
    descKey: 'service.missingDesc',
    icon: Users,
  },
  {
    to: '/report-damage',
    num: '07',
    tagKey: 'service.claimsTag',
    titleKey: 'nav.damage',
    descKey: 'service.damageDesc',
    icon: FileSpreadsheet,
  },
  {
    to: '/pfa-chat',
    num: '08',
    tagKey: 'service.aiTag',
    titleKey: 'nav.pfa',
    descKey: 'service.pfaDesc',
    icon: Bot,
  },
  {
    to: '/donate',
    num: '09',
    tagKey: 'service.claimsTag',
    titleKey: 'nav.donate',
    descKey: 'service.donateDesc',
    icon: HeartHandshake,
  },
]

export default function Home() {
  const { t } = useLanguage()
  const scrollRef = useRef<HTMLDivElement>(null)

  const scrollCards = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return
    const amount = scrollRef.current.clientWidth * 0.86
    scrollRef.current.scrollBy({ left: dir === 'left' ? -amount : amount, behavior: 'smooth' })
  }

  return (
    <div className="pb-12">
      {/* Hero Section — full-bleed band */}
      <section className="border-b border-zinc-200/70 bg-white dark:border-white/[0.06] dark:bg-[#161616]">
        <div className="mx-auto max-w-6xl px-4 pb-10 pt-6 text-center sm:pb-14 sm:pt-10">
        <h1 className="text-2xl font-bold tracking-tight sm:text-4xl md:text-6xl text-zinc-800 dark:text-white mb-3 sm:mb-5">
          {t('hero.title')}
        </h1>
        <p className="text-sm sm:text-lg text-zinc-500 dark:text-white max-w-3xl mx-auto mb-5 sm:mb-8 leading-relaxed">
          {t('hero.subtitle')}
        </p>

        {/* Hero CTAs */}
        <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-3">
          <Link
            to="/report"
            className="w-full sm:w-auto group inline-flex items-center justify-center gap-2.5 rounded-xl bg-zinc-800 px-6 py-3 text-sm sm:text-base font-semibold text-white transition-all hover:bg-zinc-700 active:scale-[0.98] dark:bg-slate-100 dark:text-zinc-800 dark:hover:bg-white shadow-sm cursor-pointer"
          >
            <span>{t('hero.submitReport')}</span>
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <Link
            to="/sos"
            className="w-full sm:w-auto group inline-flex items-center justify-center gap-2.5 rounded-xl bg-red-600 px-6 py-3 text-sm sm:text-base font-bold text-white transition-all hover:bg-red-700 active:scale-[0.98] shadow-sm cursor-pointer"
          >
            <Siren className="h-5 w-5" />
            <span>{t('hero.tapSos')}</span>
          </Link>
          <Link
            to="/track"
            className="w-full sm:w-auto group inline-flex items-center justify-center gap-2.5 rounded-xl border-2 border-black bg-white px-6 py-3 text-sm sm:text-base font-semibold text-zinc-700 transition-all hover:bg-zinc-50 active:scale-[0.98] shadow-xs dark:border-black dark:bg-[#1a1a1a] dark:text-white dark:hover:bg-[#252525] cursor-pointer"
          >
            <Search className="h-4.5 w-4.5" />
            <span>{t('nav.track')}</span>
          </Link>
          {/* Live status updates */}
          <Link
            to="/alerts"
            className="w-full sm:w-auto group inline-flex items-center justify-center gap-2.5 rounded-xl border-2 border-black bg-white px-6 py-3 text-sm sm:text-base font-bold text-zinc-800 transition-all hover:bg-zinc-50 active:scale-[0.98] shadow-xs dark:border-black dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100 cursor-pointer"
          >
            <Bell className="h-4.5 w-4.5" />
            <span>{t('hero.liveAlerts')}</span>
          </Link>
        </div>

        </div>
      </section>

      {/* Offline App Promotion */}
      <section className="border-b border-zinc-200/70 bg-zinc-50 dark:border-white/[0.06] dark:bg-[#141414]">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:py-8">
          <Link
            to="/app"
            className="group mx-auto flex max-w-5xl items-center gap-4 rounded-xl border border-zinc-200 bg-white px-5 py-4 transition-colors hover:border-zinc-400 dark:border-white/[0.08] dark:bg-[#1a1a1a] dark:hover:border-white/20 sm:gap-6 sm:px-7 sm:py-5"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 sm:h-14 sm:w-14">
              <Smartphone className="h-6 w-6 sm:h-7 sm:w-7" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mono sm:text-[11px]">
                {t('service.appTag')}
              </div>
              <h2 className="mt-1 text-base font-bold text-zinc-800 dark:text-white sm:text-lg">
                {t('service.appTitle')}
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-slate-500 dark:text-white/70 sm:text-[15px]">
                {t('service.appDesc')}
              </p>
            </div>
            <ArrowRight className="h-5 w-5 shrink-0 text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-zinc-800 dark:group-hover:text-white" />
          </Link>
        </div>
      </section>

      {/* Quick Action Widget Grid */}
      <section>
        <div className="mx-auto max-w-7xl px-4 pt-4 pb-10 sm:pt-6 sm:pb-14">
        <div className="flex items-center justify-between mb-4 px-1">
          <span className="text-[11px] font-bold tracking-widest text-slate-500 dark:text-white uppercase mono flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-red-600 inline-block animate-pulse" />
            {t('hero.quickAccess')}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => scrollCards('left')}
              className="rounded-lg border border-zinc-200/80 bg-white p-1.5 text-slate-500 transition hover:bg-zinc-50 hover:text-zinc-800 dark:border-white/[0.08] dark:bg-[#1a1a1a] dark:text-white dark:hover:bg-[#252525] dark:hover:text-white"
              aria-label="Scroll left"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => scrollCards('right')}
              className="rounded-lg border border-zinc-200/80 bg-white p-1.5 text-slate-500 transition hover:bg-zinc-50 hover:text-zinc-800 dark:border-white/[0.08] dark:bg-[#1a1a1a] dark:text-white dark:hover:bg-[#252525] dark:hover:text-white"
              aria-label="Scroll right"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div ref={scrollRef} className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide -mx-1 px-1">
          {emergencyServices.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.to}
                to={item.to}
                className="group relative flex w-[260px] min-w-[260px] sm:w-[280px] sm:min-w-[280px] lg:w-[300px] lg:min-w-[300px] aspect-square flex-none flex-col justify-between rounded-xl border border-zinc-200/80 bg-white p-6 sm:p-7 text-left transition-all duration-200 hover:border-slate-400 active:scale-[0.98] snap-start dark:border-white/[0.08] dark:bg-[#1a1a1a] dark:hover:border-slate-600/80 cursor-pointer"
              >
                <div>
                  <div className="flex items-start justify-between w-full mb-6">
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-zinc-900 text-white transition-transform duration-200 group-hover:scale-105 dark:bg-white dark:text-zinc-900">
                      <Icon className="h-7 w-7" />
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[11px] font-bold tracking-wider text-slate-400 mono">
                        {item.num}
                      </span>
                      <ArrowUpRight className="h-4 w-4 text-slate-300 transition-colors group-hover:text-zinc-800 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 dark:text-zinc-500 dark:group-hover:text-white" />
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] font-bold tracking-widest text-slate-400 uppercase mono mb-1">
                      {t(item.tagKey)}
                    </div>
                    <h2 className="text-base sm:text-xl font-bold tracking-tight text-zinc-800 dark:text-white">
                      {t(item.titleKey)}
                    </h2>
                    <p className="text-sm sm:text-base text-slate-500 dark:text-white mt-1.5 line-clamp-2 leading-relaxed">
                      {t(item.descKey)}
                    </p>
                  </div>
                </div>
              </Link>
            )
          })}

        </div>
        </div>
      </section>

      {/* Mission statement */}
      <section className="border-y border-zinc-200/70 bg-zinc-100 dark:border-white/[0.06] dark:bg-black">
        <div className="mx-auto max-w-4xl px-4 py-10 text-center sm:py-14">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-white/60">
            {t('about.missionBadge')}
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-zinc-800 dark:text-white sm:text-3xl">
            {t('about.missionTitle')}
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-zinc-600 dark:text-white/70 sm:text-base">
            {t('about.missionDesc')}
          </p>
          <div className="mx-auto mt-5 max-w-2xl space-y-3 text-left text-sm leading-relaxed text-zinc-600 dark:text-white/70 sm:text-base">
            <p>
              {t('about.missionP1Pre')}
              <strong className="font-bold text-zinc-800 dark:text-white">{t('about.missionP1Bold')}</strong>
              {t('about.missionP1Post')}
            </p>
            <p>
              {t('about.missionP2Pre')}
              <strong className="font-bold text-zinc-800 dark:text-white">{t('about.missionP2Bold')}</strong>
              {t('about.missionP2Post')}
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
