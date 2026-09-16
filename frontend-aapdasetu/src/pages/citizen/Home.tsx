import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Siren,
  ArrowRight,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Building,
  Compass,
  Users,
  FileSpreadsheet,
  Bot,
  Search,
  Smartphone,
  Bell,
  HeartHandshake,
  WifiOff,
} from 'lucide-react'
import { useLanguage } from '../../lib/i18n'
import { listShelters } from '../../api/endpoints'

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
    to: '/missing-persons',
    titleKey: 'nav.missing',
    descKey: 'service.missingDesc',
    icon: Users,
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
    to: '/alerts',
    titleKey: 'nav.alerts',
    descKey: 'alerts.pageDesc',
    icon: Bell,
  },
  {
    to: '/donate',
    titleKey: 'nav.donate',
    descKey: 'service.donateDesc',
    icon: HeartHandshake,
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
  const [openShelterCount, setOpenShelterCount] = useState<number | null>(null)

  // Horizontal services rail: edge-aware prev/next controls.
  const railRef = useRef<HTMLDivElement | null>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const updateRailEdges = () => {
    const el = railRef.current
    if (!el) return
    const maxLeft = el.scrollWidth - el.clientWidth
    setCanScrollLeft(el.scrollLeft > 4)
    setCanScrollRight(el.scrollLeft < maxLeft - 4)
  }

  useEffect(() => {
    updateRailEdges()
    window.addEventListener('resize', updateRailEdges)
    return () => window.removeEventListener('resize', updateRailEdges)
  }, [])

  const scrollRail = (dir: 1 | -1) => {
    const el = railRef.current
    if (!el) return
    // Advance by roughly one card so position stays card-aligned with snapping.
    el.scrollBy({ left: dir * Math.min(320, el.clientWidth * 0.8), behavior: 'smooth' })
  }

  // Snapshot live shelter count for the crisis status strip.
  useEffect(() => {
    let active = true
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

        {/* Live Status Strip — Monochromatic Nothing OS tag */}
        {openShelterCount !== null && (
          <div className="mb-6 flex flex-wrap items-center justify-center gap-2 text-xs">
            <Link
              to="/shelters"
              className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3.5 py-1 text-xs font-semibold text-zinc-700 shadow-2xs transition hover:border-zinc-300 hover:bg-zinc-50 active:scale-[0.98] dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-700 cursor-pointer mono"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <Building className="h-3.5 w-3.5 text-zinc-400" />
              <span>{openShelterCount}</span>
              <span>{t('home.sheltersOpen')}</span>
            </Link>
          </div>
        )}

        {/* Hero CTAs — High contrast SOS primary, secondary actions visible on mobile */}
        <div className="mt-6 flex flex-col items-center justify-center gap-3 md:flex-row md:items-stretch">
          <Link
            to="/sos"
            className="group inline-flex w-full items-center justify-center gap-2.5 rounded-xl bg-red-600 px-8 py-4 text-base font-extrabold uppercase tracking-tight text-white shadow-md shadow-red-600/20 ring-2 ring-red-600/30 transition hover:bg-red-700 active:scale-[0.98] md:w-auto sm:text-lg"
          >
            <Siren className="h-6 w-6" />
            <span>{t('hero.tapSos')}</span>
          </Link>

          <div className="flex flex-col sm:flex-row w-full items-stretch gap-2.5 md:w-auto">
            <Link
              to="/track"
              className="group flex-1 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 sm:px-5 py-3.5 sm:py-4 text-sm font-semibold whitespace-nowrap text-zinc-700 shadow-sm transition hover:bg-zinc-50 active:scale-[0.98] inline-flex md:w-auto sm:text-base dark:border-white/[0.1] dark:bg-[#1a1a1a] dark:text-slate-200 dark:hover:bg-[#252525]"
            >
              <Search className="size-[18px]" />
              <span>{t('nav.track')}</span>
            </Link>
            <Link
              to="/report"
              className="group flex-1 items-center justify-center gap-2 rounded-xl bg-zinc-800 px-4 sm:px-5 py-3.5 sm:py-4 text-sm font-semibold whitespace-nowrap text-white shadow-sm transition hover:bg-zinc-700 active:scale-[0.98] inline-flex md:w-auto sm:text-base dark:bg-slate-100 dark:text-zinc-800 dark:hover:bg-white"
            >
              <span>{t('hero.submitReport')}</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Crisis Reality Banner: Explicit acknowledgement that web features need internet, and we built a custom solution */}
      <section className="rounded-2xl border border-amber-300/80 bg-amber-50/70 p-4 sm:p-5 text-left dark:border-amber-900/50 dark:bg-amber-950/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-200/80 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300 mt-0.5">
            <WifiOff className="h-5 w-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300 mono">
                {t('home.blackoutAwarenessBadge')}
              </span>
              <span className="inline-flex items-center rounded-full bg-amber-200/60 px-2 py-0.5 text-[10px] font-bold text-amber-900 dark:bg-amber-900/80 dark:text-amber-200 mono">
                {t('home.blackoutZeroInternet')}
              </span>
            </div>
            <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-slate-100 mt-1">
              {t('home.blackoutHeading')}
            </h3>
            <p className="text-xs sm:text-sm text-zinc-600 dark:text-slate-400 mt-1 leading-relaxed max-w-3xl">
              {t('home.blackoutDesc')}
            </p>
          </div>
        </div>
        <Link
          to="/app"
          className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-zinc-800 dark:bg-slate-100 dark:text-zinc-900 dark:hover:bg-white cursor-pointer"
        >
          <span>{t('home.blackoutCta')}</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between gap-3 px-1">
          <h2 className="text-[11px] font-semibold tracking-widest text-slate-500 dark:text-slate-400 uppercase mono">
            {t('hero.quickAccess')}
          </h2>
          <div className="hidden items-center gap-1.5 sm:flex">
            <button
              type="button"
              onClick={() => scrollRail(-1)}
              disabled={!canScrollLeft}
              aria-label={t('common.scrollLeft', 'Scroll left')}
              className="rounded-lg border border-zinc-200/80 bg-white p-1.5 text-zinc-500 transition hover:bg-zinc-50 hover:text-zinc-800 disabled:opacity-30 dark:border-white/[0.08] dark:bg-[#1a1a1a] dark:text-slate-400 dark:hover:bg-[#252525] cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => scrollRail(1)}
              disabled={!canScrollRight}
              aria-label={t('common.scrollRight', 'Scroll right')}
              className="rounded-lg border border-zinc-200/80 bg-white p-1.5 text-zinc-500 transition hover:bg-zinc-50 hover:text-zinc-800 disabled:opacity-30 dark:border-white/[0.08] dark:bg-[#1a1a1a] dark:text-slate-400 dark:hover:bg-[#252525] cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="relative">
          <div
            ref={railRef}
            onScroll={updateRailEdges}
            className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 pt-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {emergencyServices.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className="group relative flex w-[240px] shrink-0 snap-start flex-col rounded-2xl border border-zinc-200/80 bg-white p-4 sm:w-[280px] sm:p-5 text-left transition hover:border-zinc-400 hover:shadow-sm active:scale-[0.99] dark:border-white/[0.08] dark:bg-[#1a1a1a] dark:hover:border-slate-600/80"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-800 text-white dark:bg-slate-100 dark:text-zinc-800">
                      <Icon className="h-5 w-5" />
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-slate-300 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-zinc-600 dark:text-zinc-600 dark:group-hover:text-slate-300" />
                  </div>
                  <h3 className="text-sm font-bold tracking-tight text-zinc-800 sm:text-base dark:text-slate-300">
                    {t(item.titleKey)}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    {t(item.descKey)}
                  </p>
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200/80 bg-white p-4 sm:p-8 dark:border-white/[0.08] dark:bg-[#181818]">
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-6">
          <a
            href="tel:112"
            aria-label={`${t('home.helpline112')} 112`}
            className="group rounded-2xl border border-red-100 bg-red-50/50 p-3.5 sm:p-4 transition hover:bg-red-50 dark:border-red-950/40 dark:bg-red-950/20 dark:hover:bg-red-950/40"
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
            className="group rounded-2xl border border-zinc-200/80 bg-zinc-50/60 p-3.5 sm:p-4 transition hover:bg-zinc-50 dark:border-white/[0.08] dark:bg-[#1a1a1a] dark:hover:bg-[#222]"
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
            className="group rounded-2xl border border-zinc-200/80 bg-zinc-50/60 p-3.5 sm:p-4 transition hover:bg-zinc-50 dark:border-white/[0.08] dark:bg-[#1a1a1a] dark:hover:bg-[#222]"
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
            className="group rounded-2xl border border-zinc-200/80 bg-zinc-50/60 p-3.5 sm:p-4 transition hover:bg-zinc-50 dark:border-white/[0.08] dark:bg-[#1a1a1a] dark:hover:bg-[#222]"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600 dark:text-slate-400 mono">{t('home.helplineNdrf')}</span>
              <ArrowUpRight className="h-3.5 w-3.5 text-zinc-400" />
            </div>
            <div className="mt-2 text-base sm:text-lg font-bold tracking-tight text-zinc-800 dark:text-slate-200 mono truncate">011-24363260</div>
            <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">{t('home.helplineNdrfDesc')}</div>
          </a>
        </div>
      </section>
    </div>
  )
}
