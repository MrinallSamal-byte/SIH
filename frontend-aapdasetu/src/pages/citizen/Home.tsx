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
  Smartphone,
  Bell,
  WifiOff,
  Radio,
  Bluetooth,
  Download,
  Zap,
  CheckCircle2,
  HeartHandshake,
  LifeBuoy,
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
    to: '/app',
    titleKey: 'appdl.navLabel',
    descKey: 'appdl.cardDesc',
    icon: Smartphone,
  },
]

export default function Home() {
  const { t } = useLanguage()
  const [openShelterCount, setOpenShelterCount] = useState<number | null>(null)

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
        <div className="mt-6 flex flex-col items-center justify-center gap-3 md:flex-row">
          <Link
            to="/sos"
            className="group inline-flex w-full items-center justify-center gap-2.5 rounded-xl bg-red-600 px-8 py-4 text-base font-extrabold uppercase tracking-tight text-white shadow-md shadow-red-600/20 ring-2 ring-red-600/30 transition hover:bg-red-700 active:scale-[0.98] md:w-auto sm:text-lg"
          >
            <Siren className="h-6 w-6" />
            <span>{t('hero.tapSos')}</span>
          </Link>

          <div className="flex w-full items-center gap-2.5 md:w-auto">
            <Link
              to="/track"
              className="group flex-1 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-5 py-3 text-sm font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50 active:scale-[0.98] inline-flex md:w-auto sm:text-base dark:border-white/[0.1] dark:bg-[#1a1a1a] dark:text-slate-200 dark:hover:bg-[#252525]"
            >
              <Search className="size-[18px]" />
              <span>{t('nav.track')}</span>
            </Link>
            <Link
              to="/report"
              className="group flex-1 items-center justify-center gap-2 rounded-xl bg-zinc-800 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-700 active:scale-[0.98] inline-flex md:w-auto sm:text-base dark:bg-slate-100 dark:text-zinc-800 dark:hover:bg-white"
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

      {/* Offline Custom Solution & App Showcase */}
      <section className="rounded-2xl border border-zinc-200/80 bg-white p-6 sm:p-8 md:p-10 dark:border-white/[0.08] dark:bg-[#181818] shadow-xs relative overflow-hidden">
        {/* Top Badges & Problem Context */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-red-200/90 bg-red-50/80 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400 mono">
            <WifiOff className="h-3 w-3" />
            <span>{t('home.offlineKicker')}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-[11px] font-semibold text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 mono">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>BLE P2P MESH ENGINE</span>
          </span>
        </div>

        <div className="max-w-3xl">
          <h2 className="text-xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-slate-100 mb-3">
            {t('home.offlineTitle')}
          </h2>
          <p className="text-sm sm:text-base text-zinc-600 dark:text-slate-400 leading-relaxed">
            {t('home.offlineSubtitle')}
          </p>
        </div>

        {/* Interactive Device & Mesh Visualizer */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Left Column: Terminal / Live Device Mockup & Mesh Radar Card */}
          <div className="lg:col-span-5 flex flex-col justify-between rounded-2xl border border-zinc-200 bg-zinc-50/70 p-5 sm:p-6 dark:border-white/[0.08] dark:bg-[#151515]">
            <div>
              <div className="flex items-center justify-between border-b border-zinc-200/80 pb-3.5 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-zinc-700 dark:text-zinc-300" />
                  <span className="text-xs font-bold text-zinc-800 dark:text-slate-200 mono">SOA MESH NODE</span>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 mono">
                  <span className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse" />
                  OFFLINE ACTIVE
                </span>
              </div>

              {/* Realistic Android App Mockup */}
              <div className="my-5 mx-auto w-full max-w-[240px]">
                <div className="overflow-hidden rounded-[2rem] border-4 border-zinc-800 bg-zinc-950 shadow-xl dark:border-zinc-700 dark:bg-black p-3 space-y-3">
                  {/* Notch & Status */}
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                    <span className="font-mono text-[9px] font-bold text-zinc-400">SOA MESH v2.4</span>
                    <span className="flex items-center gap-1 text-[9px] font-semibold text-emerald-400">
                      <span className="h-1 w-1 rounded-full bg-emerald-400" />
                      BLE 5.2
                    </span>
                  </div>

                  {/* App Signal Status Strip */}
                  <div className="flex items-center justify-between rounded-lg bg-zinc-900 px-2 py-1 text-[9px] text-zinc-400 font-mono">
                    <span>CELL: 0 BARS</span>
                    <span className="text-amber-400 font-bold">AIRPLANE MODE</span>
                  </div>

                  {/* Active SOS Beacon Badge in App */}
                  <div className="rounded-xl border border-red-600/40 bg-red-950/60 p-2.5 text-left text-white space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold text-red-400">
                        <Radio className="h-3 w-3 animate-pulse text-red-500" />
                        SOS ACTIVE
                      </span>
                      <span className="text-[9px] text-zinc-400 mono">HOP #1</span>
                    </div>
                    <div className="text-[11px] font-bold text-zinc-100">Flash Flood Triage</div>
                    <div className="text-[9px] text-zinc-300 font-mono">3 Persons · Medical / Boat</div>
                  </div>

                  {/* Nearby Radar Indicator */}
                  <div className="rounded-xl bg-zinc-900/90 p-2 text-left border border-zinc-800">
                    <div className="text-[9px] text-zinc-400 uppercase tracking-wider mono font-semibold">Nearby Mesh Radar</div>
                    <div className="text-[10px] text-emerald-400 font-semibold mt-0.5">3 Peer Nodes within 150m</div>
                    <div className="mt-1.5 flex items-center justify-between px-1">
                      <span className="relative flex h-2.5 w-2.5 items-center justify-center">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-40" />
                        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      </span>
                      <span className="h-px w-8 border-t border-dashed border-zinc-700" />
                      <span className="relative flex h-2.5 w-2.5 items-center justify-center">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-50" />
                        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-blue-400" />
                      </span>
                      <span className="h-px w-8 border-t border-dashed border-zinc-700" />
                      <span className="relative flex h-2.5 w-2.5 items-center justify-center">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-40" />
                        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Hop relay simulation visual */}
              <div className="my-4 space-y-2.5">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mono">
                  Simulated Emergency Relay Path
                </div>

                <div className="space-y-2 text-xs mono">
                  <div className="flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50/80 p-2.5 text-red-900 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
                    <Radio className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0 animate-pulse" />
                    <div>
                      <div className="font-bold">Citizen Device (Stranded)</div>
                      <div className="text-[10px] text-red-700/80 dark:text-red-400/80">0 Bars · No Internet · SOS Beacon Fired</div>
                    </div>
                  </div>

                  <div className="flex justify-center py-0.5">
                    <span className="text-[10px] text-zinc-400 dark:text-zinc-500">↓ Bluetooth Low Energy (~80m direct hop)</span>
                  </div>

                  <div className="flex items-center gap-2.5 rounded-xl border border-zinc-200 bg-white p-2.5 text-zinc-800 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
                    <Bluetooth className="h-4 w-4 text-blue-500 shrink-0" />
                    <div>
                      <div className="font-semibold">Passing Volunteer / Civilian Phone</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">Hop 1 of 7 · Automated Silent Packet Forward</div>
                    </div>
                  </div>

                  <div className="flex justify-center py-0.5">
                    <span className="text-[10px] text-zinc-400 dark:text-zinc-500">↓ Multi-hop daisy-chain relay (~6+ km radius)</span>
                  </div>

                  <div className="flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/80 p-2.5 text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <div>
                      <div className="font-bold">Rescue Boat / Base Camp Gateway</div>
                      <div className="text-[10px] text-emerald-700/80 dark:text-emerald-400/80">Received & Dispatched to NDRF / SDRF Map</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 gap-2 pt-3 border-t border-zinc-200/80 dark:border-zinc-800 text-center mono">
              <div className="rounded-lg bg-white dark:bg-zinc-900/70 p-2 border border-zinc-200/60 dark:border-zinc-800/60">
                <div className="text-sm font-bold text-zinc-900 dark:text-slate-100">97.8%</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400">{t('home.offlineStatAccuracy')}</div>
              </div>
              <div className="rounded-lg bg-white dark:bg-zinc-900/70 p-2 border border-zinc-200/60 dark:border-zinc-800/60">
                <div className="text-sm font-bold text-zinc-900 dark:text-slate-100">&lt; 1.2s</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400">{t('home.offlineStatLatency')}</div>
              </div>
              <div className="rounded-lg bg-white dark:bg-zinc-900/70 p-2 border border-zinc-200/60 dark:border-zinc-800/60">
                <div className="text-sm font-bold text-zinc-900 dark:text-slate-100">7 Hops</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400">{t('home.offlineStatHops')}</div>
              </div>
              <div className="rounded-lg bg-white dark:bg-zinc-900/70 p-2 border border-zinc-200/60 dark:border-zinc-800/60">
                <div className="text-sm font-bold text-zinc-900 dark:text-slate-100">0 kB</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400">{t('home.offlineStatData')}</div>
              </div>
            </div>
          </div>

          {/* Right Column: Key Features Showcase & How it helps */}
          <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
            {/* 4 Key Features */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="rounded-2xl border border-zinc-200/80 bg-zinc-50/50 p-4 sm:p-5 dark:border-white/[0.08] dark:bg-[#1a1a1a] transition hover:border-zinc-400 dark:hover:border-slate-600">
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-red-600 text-white shadow-xs">
                  <Radio className="h-4 w-4" />
                </div>
                <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-slate-200">
                  {t('home.offlineFeat1Title')}
                </h3>
                <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  {t('home.offlineFeat1Desc')}
                </p>
              </div>

              <div className="rounded-2xl border border-zinc-200/80 bg-zinc-50/50 p-4 sm:p-5 dark:border-white/[0.08] dark:bg-[#1a1a1a] transition hover:border-zinc-400 dark:hover:border-slate-600">
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-800 text-white dark:bg-slate-100 dark:text-zinc-800 shadow-xs">
                  <Bluetooth className="h-4 w-4" />
                </div>
                <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-slate-200">
                  {t('home.offlineFeat2Title')}
                </h3>
                <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  {t('home.offlineFeat2Desc')}
                </p>
              </div>

              <div className="rounded-2xl border border-zinc-200/80 bg-zinc-50/50 p-4 sm:p-5 dark:border-white/[0.08] dark:bg-[#1a1a1a] transition hover:border-zinc-400 dark:hover:border-slate-600">
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-800 text-white dark:bg-slate-100 dark:text-zinc-800 shadow-xs">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-slate-200">
                  {t('home.offlineFeat3Title')}
                </h3>
                <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  {t('home.offlineFeat3Desc')}
                </p>
              </div>

              <div className="rounded-2xl border border-zinc-200/80 bg-zinc-50/50 p-4 sm:p-5 dark:border-white/[0.08] dark:bg-[#1a1a1a] transition hover:border-zinc-400 dark:hover:border-slate-600">
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-800 text-white dark:bg-slate-100 dark:text-zinc-800 shadow-xs">
                  <Zap className="h-4 w-4" />
                </div>
                <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-slate-200">
                  {t('home.offlineFeat4Title')}
                </h3>
                <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  {t('home.offlineFeat4Desc')}
                </p>
              </div>
            </div>

            {/* How It Helps You (Persona Breakdown) */}
            <div className="rounded-2xl border border-zinc-200/80 bg-zinc-50/50 p-4 sm:p-5 dark:border-white/[0.08] dark:bg-[#1a1a1a]">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mono mb-3">
                {t('home.offlineHowItHelpsTitle')}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="space-y-1 rounded-xl bg-white p-3 border border-zinc-200/60 dark:bg-zinc-900/60 dark:border-zinc-800/60">
                  <div className="flex items-center gap-1.5 font-bold text-zinc-900 dark:text-slate-200">
                    <LifeBuoy className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                    <span>{t('home.offlineHelpCitizenTitle')}</span>
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
                    {t('home.offlineHelpCitizenDesc')}
                  </p>
                </div>
                <div className="space-y-1 rounded-xl bg-white p-3 border border-zinc-200/60 dark:bg-zinc-900/60 dark:border-zinc-800/60">
                  <div className="flex items-center gap-1.5 font-bold text-zinc-900 dark:text-slate-200">
                    <HeartHandshake className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                    <span>{t('home.offlineHelpVolunteerTitle')}</span>
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
                    {t('home.offlineHelpVolunteerDesc')}
                  </p>
                </div>
                <div className="space-y-1 rounded-xl bg-white p-3 border border-zinc-200/60 dark:bg-zinc-900/60 dark:border-zinc-800/60">
                  <div className="flex items-center gap-1.5 font-bold text-zinc-900 dark:text-slate-200">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>{t('home.offlineHelpResponderTitle')}</span>
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
                    {t('home.offlineHelpResponderDesc')}
                  </p>
                </div>
              </div>
            </div>

            {/* 3 Steps in blackout */}
            <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 sm:p-5 dark:border-white/[0.08] dark:bg-[#151515]">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mono mb-3">
                How It Works During a Blackout
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="space-y-1">
                  <span className="font-bold text-zinc-800 dark:text-slate-200">{t('home.offlineStep1Title')}</span>
                  <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">{t('home.offlineStep1Desc')}</p>
                </div>
                <div className="space-y-1">
                  <span className="font-bold text-zinc-800 dark:text-slate-200">{t('home.offlineStep2Title')}</span>
                  <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">{t('home.offlineStep2Desc')}</p>
                </div>
                <div className="space-y-1">
                  <span className="font-bold text-zinc-800 dark:text-slate-200">{t('home.offlineStep3Title')}</span>
                  <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">{t('home.offlineStep3Desc')}</p>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
              <Link
                to="/app"
                className="inline-flex items-center justify-center gap-2.5 rounded-xl bg-zinc-900 px-6 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-zinc-800 active:scale-[0.98] dark:bg-slate-100 dark:text-zinc-900 dark:hover:bg-white"
              >
                <Download className="h-4 w-4" />
                <span>{t('home.offlineDownloadBtn')}</span>
              </Link>
              <Link
                to="/app"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-5 py-3.5 text-sm font-semibold text-zinc-700 shadow-2xs transition hover:bg-zinc-50 active:scale-[0.98] dark:border-white/[0.1] dark:bg-[#1a1a1a] dark:text-slate-200 dark:hover:bg-[#252525]"
              >
                <span>{t('home.offlineExploreBtn')}</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
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
