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
  ChevronRight
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
    to: '/shelters',
    num: '01',
    tagKey: 'service.sheltersTag',
    titleKey: 'nav.shelters',
    descKey: 'service.sheltersDesc',
    icon: Building,
  },
  {
    to: '/safe-routes',
    num: '02',
    tagKey: 'service.navTag',
    titleKey: 'nav.routes',
    descKey: 'service.routesDesc',
    icon: Compass,
  },
  {
    to: '/missing-persons',
    num: '03',
    tagKey: 'service.registryTag',
    titleKey: 'nav.missing',
    descKey: 'service.missingDesc',
    icon: Users,
  },
  {
    to: '/report-damage',
    num: '04',
    tagKey: 'service.claimsTag',
    titleKey: 'nav.damage',
    descKey: 'service.damageDesc',
    icon: FileSpreadsheet,
  },
  {
    to: '/pfa-chat',
    num: '05',
    tagKey: 'service.aiTag',
    titleKey: 'nav.pfa',
    descKey: 'service.pfaDesc',
    icon: Bot,
  },
]

export default function Home() {
  const { t } = useLanguage()
  const scrollRef = useRef<HTMLDivElement>(null)

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

        {/* Hero CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
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
            className="w-full sm:w-auto group inline-flex items-center justify-center gap-2.5 rounded-xl border border-zinc-200 bg-white px-6 py-3 text-sm sm:text-base font-semibold text-zinc-700 transition-all hover:bg-zinc-50 active:scale-[0.98] shadow-xs dark:border-white/[0.1] dark:bg-[#1a1a1a] dark:text-slate-200 dark:hover:bg-[#252525] cursor-pointer"
          >
            <Search className="h-4.5 w-4.5" />
            <span>{t('nav.track')}</span>
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
              aria-label="Scroll left"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => scrollCards('right')}
              className="rounded-lg border border-zinc-200/80 bg-white p-1.5 text-slate-500 transition hover:bg-zinc-50 hover:text-zinc-800 dark:border-white/[0.08] dark:bg-[#1a1a1a] dark:text-slate-400 dark:hover:bg-[#252525] dark:hover:text-slate-200"
              aria-label="Scroll right"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div ref={scrollRef} className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide -mx-1 px-1">
          {emergencyServices.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.to}
                to={item.to}
                className="group relative flex min-w-[260px] max-w-[300px] flex-1 flex-col justify-between rounded-2xl border border-zinc-200/80 bg-white p-4 sm:p-6 text-left transition-all duration-200 hover:border-slate-400 active:scale-[0.98] snap-start dark:border-white/[0.08] dark:bg-[#1a1a1a] dark:hover:border-slate-600/80 cursor-pointer"
              >
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
              </Link>
            )
          })}

        </div>
      </section>
    </div>
  )
}
