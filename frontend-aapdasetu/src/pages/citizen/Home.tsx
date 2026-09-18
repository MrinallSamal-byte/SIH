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
  Smartphone,
  Download,
  Radio,
  Bell
} from 'lucide-react'
import { useLanguage } from '../../lib/i18n'
import { listAlerts } from '../../api/endpoints'
import type { Alert } from '../../types'
import { openChatWidget } from '../../components/ChatWidget'

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
  {
    to: '/app',
    num: '06',
    tagKey: 'service.appTag',
    titleKey: 'service.appTitle',
    descKey: 'service.appDesc',
    icon: Smartphone,
  },
]

export default function Home() {
  const { t } = useLanguage()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [liveAlerts, setLiveAlerts] = useState<Alert[]>([])
  useEffect(() => {
    listAlerts().then(setLiveAlerts).catch(() => {})
  }, [])

  const scrollCards = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return
    const amount = 340
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
          {/* Mobile App promotion beside Track Incident */}
          <Link
            to="/app"
            className="w-full sm:w-auto group inline-flex items-center justify-center gap-2.5 rounded-xl border-2 border-black bg-white px-6 py-3 text-sm sm:text-base font-bold text-zinc-800 transition-all hover:bg-zinc-50 active:scale-[0.98] shadow-xs dark:border-black dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100 cursor-pointer"
          >
            <Smartphone className="h-4.5 w-4.5" />
            <span>{t('hero.getMobileApp')}</span>
            <Download className="h-4 w-4 opacity-60 group-hover:opacity-100 transition-opacity" />
          </Link>
        </div>

        {/* Live Alert Signal - below Mobile App - translated */}
        <div className="mx-auto mt-6 flex max-w-4xl items-center justify-between rounded-2xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-900/40 dark:bg-red-950/20">
          <div className="flex items-center gap-3 min-w-0">
            <span className="relative flex h-3 w-3 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-40" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-red-600" />
            </span>
            <Radio className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-bold text-red-700 dark:text-red-300 flex items-center gap-1.5">
                <Bell className="h-3 w-3" />
                {liveAlerts.length === 0 ? t('hero.liveAlerts') : liveAlerts.length === 1 ? t('hero.liveAlertSingle') : `${liveAlerts.length} ${t('hero.liveAlerts')}`} • {t('hero.signalActive')}
              </p>
              <p className="text-[11px] text-red-600/80 dark:text-red-400/80 truncate">
                {liveAlerts[0]?.title || t('hero.noBulletinsHome')}
              </p>
            </div>
          </div>
          <Link to="/alerts" className="ml-3 shrink-0 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700">
            {t('hero.viewMore')}
          </Link>
        </div>
        </div>
      </section>

      {/* Quick Action Widget Grid */}
      <section>
        <div className="mx-auto max-w-7xl px-4 py-10 sm:py-14">
        <div className="flex items-center justify-between mb-4 px-1">
          <span className="text-[11px] font-bold tracking-widest text-slate-500 dark:text-white uppercase mono flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-red-600 inline-block animate-pulse" />
            {t('hero.quickAccess')}
          </span>
          <div className="flex items-center gap-1.5 lg:hidden">
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

        <div ref={scrollRef} className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide -mx-1 px-1 lg:mx-0 lg:grid lg:grid-cols-3 lg:overflow-visible lg:px-0 lg:snap-none">
          {emergencyServices.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.to}
                to={item.to}
                className="group relative flex min-w-[82vw] max-w-[86vw] sm:min-w-[360px] sm:max-w-[480px] lg:min-w-0 lg:max-w-none lg:w-full min-h-[200px] sm:min-h-[220px] flex-1 flex-col justify-between rounded-md border border-zinc-200/80 bg-white p-8 sm:p-10 text-left transition-all duration-200 hover:border-slate-400 active:scale-[0.98] snap-start lg:snap-align-none dark:border-white/[0.08] dark:bg-[#1a1a1a] dark:hover:border-slate-600/80 cursor-pointer"
              >
                <div>
                  <div className="flex items-start justify-between w-full mb-8">
                    <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-zinc-900 text-white transition-transform duration-200 group-hover:scale-105 dark:bg-white dark:text-zinc-900">
                      <Icon className="h-8 w-8" />
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

      {/* FAQ - full-bleed band */}
      <section className="border-y border-zinc-200/70 bg-zinc-100 dark:border-white/[0.06] dark:bg-black">
        <div className="mx-auto max-w-5xl px-4 py-10 sm:py-14">
        <div className="text-left">
          <h3 className="inline-flex items-center gap-2 text-sm font-black uppercase tracking-widest text-zinc-800 dark:text-white">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-red-600 text-white text-xs">?</span>
            {t('footer.faqTitle')}
          </h3>
          <p className="mt-1.5 text-[13px] text-zinc-500 dark:text-white/60">{t('footer.faqSubtitle')}</p>
        </div>
        <div className="mt-4 flex flex-col gap-2">
          <details className="group rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-sm open:shadow-md dark:border-white/10 dark:bg-white/[0.06]">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-[13px] font-bold text-zinc-800 dark:text-white"><span className="flex items-center gap-2"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-50 text-xs font-black text-red-600 dark:bg-red-950 dark:text-red-300">Q</span> {t('footer.q1')}</span><span className="text-zinc-400 group-open:rotate-180 transition-transform">▾</span></summary>
            <p className="mt-1.5 text-[13px] leading-relaxed text-zinc-500 dark:text-white/70">{t('footer.a1')}</p>
          </details>
          <details className="group rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-sm open:shadow-md dark:border-white/10 dark:bg-white/[0.06]">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-[13px] font-bold text-zinc-800 dark:text-white"><span className="flex items-center gap-2"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-50 text-xs font-black text-red-600 dark:bg-red-950 dark:text-red-300">Q</span> {t('footer.q2')}</span><span className="text-zinc-400 group-open:rotate-180 transition-transform">▾</span></summary>
            <p className="mt-1.5 text-[13px] leading-relaxed text-zinc-500 dark:text-white/70">{t('footer.a2')}</p>
          </details>
          <details className="group rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-sm open:shadow-md dark:border-white/10 dark:bg-white/[0.06]">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-[13px] font-bold text-zinc-800 dark:text-white"><span className="flex items-center gap-2"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-50 text-xs font-black text-red-600 dark:bg-red-950 dark:text-red-300">Q</span> {t('footer.q3')}</span><span className="text-zinc-400 group-open:rotate-180 transition-transform">▾</span></summary>
            <p className="mt-1.5 text-[13px] leading-relaxed text-zinc-500 dark:text-white/70">{t('footer.a3')}</p>
          </details>
          <details className="group rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-sm open:shadow-md dark:border-white/10 dark:bg-white/[0.06]">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-[13px] font-bold text-zinc-800 dark:text-white"><span className="flex items-center gap-2"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-50 text-xs font-black text-red-600 dark:bg-red-950 dark:text-red-300">Q</span> {t('footer.q4')}</span><span className="text-zinc-400 group-open:rotate-180 transition-transform">▾</span></summary>
            <p className="mt-1.5 text-[13px] leading-relaxed text-zinc-500 dark:text-white/70">{t('footer.a4')}</p>
          </details>
          <details className="group rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-sm open:shadow-md dark:border-white/10 dark:bg-white/[0.06]">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-[13px] font-bold text-zinc-800 dark:text-white"><span className="flex items-center gap-2"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-50 text-xs font-black text-red-600 dark:bg-red-950 dark:text-red-300">Q</span> {t('footer.q5')}</span><span className="text-zinc-400 group-open:rotate-180 transition-transform">▾</span></summary>
            <p className="mt-1.5 text-[13px] leading-relaxed text-zinc-500 dark:text-white/70">{t('footer.a5')}</p>
          </details>
        </div>
        <div className="mt-4 flex flex-col items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-4 dark:border-red-900/30 dark:bg-red-950/20">
          <p className="text-[13px] text-red-700 dark:text-red-300 text-center">{t('footer.askMoreAiDesc')}</p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button type="button" onClick={() => openChatWidget()} className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-[13px] font-bold text-white shadow-sm hover:bg-red-700 active:scale-[0.98]">
              <Bot className="h-4 w-4" /> {t('footer.askMoreAi')}
            </button>
            <Link to="/pfa-chat" className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-4 py-2 text-[13px] font-semibold text-red-700 hover:bg-red-50 dark:border-red-900/30 dark:bg-black dark:text-red-300 dark:hover:bg-red-950/40">
              Open full chat
            </Link>
          </div>
        </div>
        </div>
      </section>
    </div>
  )
}
