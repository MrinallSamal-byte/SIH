import {
  Compass,
  Building,
  WifiOff,
  Smartphone,
  Radio,
  ShieldCheck,
  Download,
  ArrowRight,
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  Layers,
  Cpu,
  GitBranch,
  Terminal,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useLanguage } from '../../lib/i18n'

export default function About() {
  const { t } = useLanguage()

  const comparisonRows = [
    {
      paramKey: 'about.compRow1Param',
      legacyKey: 'about.compRow1Legacy',
      aapdaKey: 'about.compRow1Aapda',
      metric: '< 1.5s',
    },
    {
      paramKey: 'about.compRow2Param',
      legacyKey: 'about.compRow2Legacy',
      aapdaKey: 'about.compRow2Aapda',
      metric: '0-Auth',
    },
    {
      paramKey: 'about.compRow3Param',
      legacyKey: 'about.compRow3Legacy',
      aapdaKey: 'about.compRow3Aapda',
      metric: '97.8% Mesh',
    },
    {
      paramKey: 'about.compRow4Param',
      legacyKey: 'about.compRow4Legacy',
      aapdaKey: 'about.compRow4Aapda',
      metric: 'Lane-Level GPS',
    },
  ]

  const appMicroFeatures = [
    {
      icon: Activity,
      titleKey: 'about.appFeature1Title',
      descKey: 'about.appFeature1Desc',
      badge: '97.8% Verified',
    },
    {
      icon: Radio,
      titleKey: 'about.appFeature2Title',
      descKey: 'about.appFeature2Desc',
      badge: 'TTL = 7 Hops',
    },
    {
      icon: WifiOff,
      titleKey: 'about.appFeature3Title',
      descKey: 'about.appFeature3Desc',
      badge: '0 kB Mobile Data',
    },
    {
      icon: ShieldCheck,
      titleKey: 'about.appFeature4Title',
      descKey: 'about.appFeature4Desc',
      badge: 'Ed25519 Signed',
    },
  ]

  const lifecycleSteps = [
    {
      step: '01',
      titleKey: 'about.step1Title',
      descKey: 'about.step1Desc',
      tag: 'Edge Broadcast',
    },
    {
      step: '02',
      titleKey: 'about.step2Title',
      descKey: 'about.step2Desc',
      tag: 'Mesh Propagation',
    },
    {
      step: '03',
      titleKey: 'about.step3Title',
      descKey: 'about.step3Desc',
      tag: 'Neural Triage',
    },
    {
      step: '04',
      titleKey: 'about.step4Title',
      descKey: 'about.step4Desc',
      tag: 'Field Dispatch',
    },
  ]

  const techSpecs = [
    {
      labelKey: 'about.spec1Label',
      valKey: 'about.spec1Val',
      icon: Radio,
    },
    {
      labelKey: 'about.spec2Label',
      valKey: 'about.spec2Val',
      icon: ShieldCheck,
    },
    {
      labelKey: 'about.spec3Label',
      valKey: 'about.spec3Val',
      icon: Layers,
    },
    {
      labelKey: 'about.spec4Label',
      valKey: 'about.spec4Val',
      icon: Compass,
    },
  ]

  return (
    <div className="mx-auto max-w-5xl space-y-16 pb-16">
      {/* ── 1. Hero ───────────────────────────────────────────── */}
      <section className="space-y-4 pt-4 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3.5 py-1 font-mono text-[10px] font-bold tracking-widest text-zinc-700 dark:border-white/[0.08] dark:bg-[#1a1a1a] dark:text-slate-300">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          {t('about.systemSpecBadge')}
        </div>

        <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white sm:text-4xl md:text-5xl">
          {t('about.title')}
        </h1>
        <p className="mx-auto max-w-2xl text-sm leading-relaxed text-zinc-500 dark:text-slate-400 sm:text-base">
          {t('about.subtitle')}
        </p>
      </section>

      {/* ── 2. Mission & Origin Story ─────────────────────────── */}
      <section className="grid gap-6 md:grid-cols-2">
        {/* Mission Card */}
        <div className="flex flex-col justify-between rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm dark:border-white/[0.08] dark:bg-[#1a1a1a] sm:p-7">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-lg bg-zinc-100 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-700 dark:bg-white/[0.06] dark:text-slate-300">
              <Compass className="h-3.5 w-3.5" />
              {t('about.missionBadge')}
            </div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-slate-100 sm:text-xl">
              {t('about.missionTitle')}
            </h2>
            <div className="mt-3 space-y-2.5 text-xs leading-relaxed text-zinc-500 dark:text-slate-400 sm:text-sm">
              <p>
                {t('about.missionP1Pre')}
                <span className="font-bold text-zinc-800 dark:text-white">{t('about.missionP1Bold')}</span>
                {t('about.missionP1Post')}
              </p>
              <p>
                {t('about.missionP2Pre')}
                <span className="font-bold text-zinc-800 dark:text-white">{t('about.missionP2Bold')}</span>
                {t('about.missionP2Post')}
              </p>
              <p className="font-medium text-zinc-800 dark:text-slate-200">
                {t('about.missionP3')}
              </p>
            </div>
          </div>
          <div className="mt-6 flex items-center gap-3 border-t border-zinc-100 pt-4 dark:border-white/[0.05]">
            <span className="font-mono text-[11px] font-semibold text-zinc-400 dark:text-slate-500">
              LOC: 26.1445° N, 91.7362° E
            </span>
            <span className="h-1 w-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
            <span className="font-mono text-[11px] font-semibold text-zinc-400 dark:text-slate-500">
              BRAHMAPUTRA BASIN
            </span>
          </div>
        </div>

        {/* 3 AM Story Card */}
        <div className="flex flex-col justify-between rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm dark:border-white/[0.08] dark:bg-[#1a1a1a] sm:p-7">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-lg bg-red-50 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-red-700 dark:bg-red-950/40 dark:text-red-300">
              <Clock className="h-3.5 w-3.5" />
              {t('about.storyBadge')}
            </div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-slate-100 sm:text-xl">
              {t('about.storyTitle')}
            </h2>
            <div className="mt-3 space-y-2.5 text-xs leading-relaxed text-zinc-500 dark:text-slate-400 sm:text-sm">
              <p>
                {t('about.storyP1Pre')}
                <span className="font-bold text-zinc-800 dark:text-white">{t('about.storyP1Bold')}</span>
                {t('about.storyP1Post')}
              </p>
              <p>
                {t('about.storyP2Pre')}
                <span className="font-bold text-zinc-800 dark:text-white">{t('about.storyP2Bold')}</span>
                {t('about.storyP2Post')}
              </p>
              <p className="font-medium text-zinc-800 dark:text-slate-200">
                {t('about.storyP3')}
              </p>
            </div>
          </div>
          <div className="mt-6 flex items-center gap-3 border-t border-zinc-100 pt-4 dark:border-white/[0.05]">
            <span className="font-mono text-[11px] font-semibold text-zinc-400 dark:text-slate-500">
              STATUS: ZERO-QUEUE DISPATCH
            </span>
            <span className="h-1 w-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
            <span className="font-mono text-[11px] font-semibold text-zinc-400 dark:text-slate-500">
              FAIL-SAFE MESH
            </span>
          </div>
        </div>
      </section>

      {/* ── 3. The 3 AM Comparison Matrix (Status Quo vs AapdaSetu) ── */}
      <section className="space-y-5">
        <div className="text-center sm:text-left">
          <div className="inline-flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-slate-500">
            <GitBranch className="h-3.5 w-3.5" />
            BENCHMARK COMPARISON
          </div>
          <h2 className="mt-1 text-xl font-bold tracking-tight text-zinc-900 dark:text-slate-100 sm:text-2xl">
            {t('about.compTitle')}
          </h2>
          <p className="mt-1 text-xs text-zinc-500 dark:text-slate-400 sm:text-sm">
            {t('about.compSubtitle')}
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-sm dark:border-white/[0.08] dark:bg-[#1a1a1a]">
          <div className="hidden grid-cols-12 border-b border-zinc-200 bg-zinc-50 px-5 py-3 font-mono text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:border-white/[0.08] dark:bg-black/30 dark:text-slate-400 sm:grid">
            <div className="col-span-3">{t('about.compColParam')}</div>
            <div className="col-span-4 text-zinc-400 dark:text-slate-500">{t('about.compColLegacy')}</div>
            <div className="col-span-5 text-zinc-900 dark:text-white">{t('about.compColAapda')}</div>
          </div>

          <div className="divide-y divide-zinc-100 dark:divide-white/[0.05]">
            {comparisonRows.map((row) => (
              <div
                key={row.paramKey}
                className="grid gap-3 p-4 sm:grid-cols-12 sm:items-center sm:gap-4 sm:p-5"
              >
                <div className="sm:col-span-3">
                  <span className="font-mono text-xs font-bold text-zinc-900 dark:text-slate-200">
                    {t(row.paramKey)}
                  </span>
                  <span className="mt-1 block font-mono text-[10px] text-zinc-400 dark:text-slate-500">
                    {row.metric}
                  </span>
                </div>

                <div className="flex items-start gap-2 rounded-xl bg-zinc-50 p-2.5 dark:bg-white/[0.02] sm:col-span-4 sm:bg-transparent sm:p-0">
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400 dark:text-slate-500" />
                  <span className="text-xs leading-relaxed text-zinc-500 line-through decoration-zinc-400/50 dark:text-slate-400">
                    {t(row.legacyKey)}
                  </span>
                </div>

                <div className="flex items-start gap-2 sm:col-span-5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-xs font-medium leading-relaxed text-zinc-800 dark:text-slate-200">
                    {t(row.aapdaKey)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 4. Three-Tier Operational Architecture ─────────────── */}
      <section className="space-y-6">
        <div>
          <div className="inline-flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-slate-500">
            <Layers className="h-3.5 w-3.5" />
            SYSTEM MODULARITY
          </div>
          <h2 className="mt-1 text-xl font-bold tracking-tight text-zinc-900 dark:text-slate-100 sm:text-2xl">
            {t('about.archTitle')}
          </h2>
          <p className="mt-1 text-xs text-zinc-500 dark:text-slate-400 sm:text-sm">
            {t('about.archSubtitle')}
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {/* Tier 1: Edge & Zero-Grid */}
          <div className="flex flex-col justify-between rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm dark:border-white/[0.08] dark:bg-[#1a1a1a]">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-500 dark:text-slate-400">
                  {t('about.tier1Badge')}
                </span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 text-zinc-800 dark:bg-white/[0.06] dark:text-slate-200">
                  <Smartphone className="h-4 w-4" />
                </div>
              </div>
              <h3 className="mt-3 text-base font-bold text-zinc-900 dark:text-slate-100">
                {t('about.tier1Title')}
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-zinc-500 dark:text-slate-400">
                {t('about.tier1Desc')}
              </p>

              <ul className="mt-4 space-y-2 border-t border-zinc-100 pt-3 text-xs text-zinc-600 dark:border-white/[0.05] dark:text-slate-300">
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-zinc-400 dark:bg-zinc-500" />
                  <Link to="/sos" className="hover:underline">1-Tap SOS Dispatch</Link>
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-zinc-400 dark:bg-zinc-500" />
                  <Link to="/app" className="hover:underline">SOA Mesh (97.8% BLE Relay)</Link>
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-zinc-400 dark:bg-zinc-500" />
                  <span>Zero-Loss IndexedDB Outbox</span>
                </li>
              </ul>
            </div>
            <Link
              to="/app"
              className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-900 hover:underline dark:text-slate-200"
            >
              <span>Explore Offline Mesh</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* Tier 2: Neural Core */}
          <div className="flex flex-col justify-between rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm dark:border-white/[0.08] dark:bg-[#1a1a1a]">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-500 dark:text-slate-400">
                  {t('about.tier2Badge')}
                </span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 text-zinc-800 dark:bg-white/[0.06] dark:text-slate-200">
                  <Cpu className="h-4 w-4" />
                </div>
              </div>
              <h3 className="mt-3 text-base font-bold text-zinc-900 dark:text-slate-100">
                {t('about.tier2Title')}
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-zinc-500 dark:text-slate-400">
                {t('about.tier2Desc')}
              </p>

              <ul className="mt-4 space-y-2 border-t border-zinc-100 pt-3 text-xs text-zinc-600 dark:border-white/[0.05] dark:text-slate-300">
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-zinc-400 dark:bg-zinc-500" />
                  <Link to="/safe-routes" className="hover:underline">Dynamic Hazard Corridors</Link>
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-zinc-400 dark:bg-zinc-500" />
                  <span>AI Damage Assessment</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-zinc-400 dark:bg-zinc-500" />
                  <span>Satellite Flood Boundary Model</span>
                </li>
              </ul>
            </div>
            <Link
              to="/safe-routes"
              className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-900 hover:underline dark:text-slate-200"
            >
              <span>View Safe Evacuation</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* Tier 3: Command Level */}
          <div className="flex flex-col justify-between rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm dark:border-white/[0.08] dark:bg-[#1a1a1a]">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-500 dark:text-slate-400">
                  {t('about.tier3Badge')}
                </span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 text-zinc-800 dark:bg-white/[0.06] dark:text-slate-200">
                  <Building className="h-4 w-4" />
                </div>
              </div>
              <h3 className="mt-3 text-base font-bold text-zinc-900 dark:text-slate-100">
                {t('about.tier3Title')}
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-zinc-500 dark:text-slate-400">
                {t('about.tier3Desc')}
              </p>

              <ul className="mt-4 space-y-2 border-t border-zinc-100 pt-3 text-xs text-zinc-600 dark:border-white/[0.05] dark:text-slate-300">
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-zinc-400 dark:bg-zinc-500" />
                  <Link to="/shelters" className="hover:underline">Live Shelter Network</Link>
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-zinc-400 dark:bg-zinc-500" />
                  <Link to="/missing" className="hover:underline">Missing Persons Registry</Link>
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-zinc-400 dark:bg-zinc-500" />
                  <span>NDRF / SDRF Multi-Agency Queue</span>
                </li>
              </ul>
            </div>
            <Link
              to="/shelters"
              className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-900 hover:underline dark:text-slate-200"
            >
              <span>Search Relief Camps</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── 5. Android Companion App Spotlight (SOA Mesh) ──────── */}
      <section className="relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm dark:border-white/[0.08] dark:bg-[#1a1a1a] sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-100 px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-wider text-zinc-700 dark:border-white/[0.1] dark:bg-white/[0.06] dark:text-slate-300">
            <Smartphone className="h-3.5 w-3.5" />
            {t('about.appSpotlightBadge')}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-300/80 bg-zinc-900 px-3 py-1 font-mono text-[11px] font-bold text-white shadow-sm dark:border-white/[0.15] dark:bg-white dark:text-zinc-900">
            <Activity className="h-3 w-3 text-emerald-400 dark:text-emerald-600" />
            97.8% Relay Delivery Accuracy
          </span>
        </div>

        <div className="mt-4 space-y-2">
          <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-2xl">
            {t('about.appSpotlightTitle')}
          </h2>
          <p className="text-xs leading-relaxed text-zinc-500 dark:text-slate-400 sm:text-sm">
            {t('about.appSpotlightDesc')}
          </p>
        </div>

        {/* App micro-features grid */}
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {appMicroFeatures.map((item) => {
            const Icon = item.icon
            return (
              <div
                key={item.titleKey}
                className="flex flex-col justify-between rounded-xl border border-zinc-100 bg-zinc-50/70 p-4 dark:border-white/[0.05] dark:bg-white/[0.03]"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-800 text-white dark:bg-slate-100 dark:text-zinc-800">
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="rounded font-mono text-[9px] font-bold uppercase tracking-wider text-zinc-400 dark:text-slate-500">
                      {item.badge}
                    </span>
                  </div>
                  <h3 className="mt-3 text-xs font-bold text-zinc-900 dark:text-slate-100">
                    {t(item.titleKey)}
                  </h3>
                  <p className="mt-1 text-[11px] leading-relaxed text-zinc-500 dark:text-slate-400">
                    {t(item.descKey)}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        {/* CTA & Version Row */}
        <div className="mt-6 flex flex-col items-start justify-between gap-3 border-t border-zinc-100 pt-5 dark:border-white/[0.06] sm:flex-row sm:items-center">
          <span className="font-mono text-xs text-zinc-400 dark:text-slate-500">
            {t('about.appVersionInfo')}
          </span>
          <Link
            to="/app"
            className="group inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-900 px-5 py-2.5 text-xs font-bold text-white transition hover:bg-zinc-800 active:scale-[0.98] dark:bg-white dark:text-zinc-900 dark:hover:bg-slate-100"
          >
            <Download className="h-4 w-4 transition-transform group-hover:translate-y-0.5" />
            <span>{t('about.appDownloadCta')}</span>
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </section>

      {/* ── 6. The 4-Stage Disaster Lifecycle ──────────────────── */}
      <section className="space-y-6">
        <div>
          <div className="inline-flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-slate-500">
            <Clock className="h-3.5 w-3.5" />
            CRISIS WORKFLOW
          </div>
          <h2 className="mt-1 text-xl font-bold tracking-tight text-zinc-900 dark:text-slate-100 sm:text-2xl">
            {t('about.lifeTitle')}
          </h2>
          <p className="mt-1 text-xs text-zinc-500 dark:text-slate-400 sm:text-sm">
            {t('about.lifeSubtitle')}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {lifecycleSteps.map((step) => (
            <div
              key={step.step}
              className="relative flex flex-col justify-between rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm dark:border-white/[0.08] dark:bg-[#1a1a1a]"
            >
              <div>
                <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-white/[0.05]">
                  <span className="font-mono text-sm font-black text-zinc-400 dark:text-slate-500">
                    {step.step}
                  </span>
                  <span className="rounded-md border border-zinc-200/80 bg-zinc-50 px-2 py-0.5 font-mono text-[9px] font-semibold text-zinc-600 dark:border-white/[0.06] dark:bg-white/[0.03] dark:text-slate-400">
                    {step.tag}
                  </span>
                </div>
                <h3 className="mt-3 text-xs font-bold text-zinc-900 dark:text-slate-100">
                  {t(step.titleKey)}
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-zinc-500 dark:text-slate-400">
                  {t(step.descKey)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 7. Technical Standards & Specification Strip ────────── */}
      <section className="space-y-4 rounded-2xl border border-zinc-200/80 bg-zinc-50/50 p-6 dark:border-white/[0.08] dark:bg-[#161616] sm:p-7">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-zinc-500 dark:text-slate-400" />
          <h2 className="font-mono text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-slate-300">
            {t('about.specTitle')}
          </h2>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {techSpecs.map((spec) => {
            const Icon = spec.icon
            return (
              <div
                key={spec.labelKey}
                className="rounded-xl border border-zinc-200/80 bg-white p-3.5 shadow-sm dark:border-white/[0.06] dark:bg-[#1f1f1f]"
              >
                <div className="flex items-center gap-2 text-zinc-400 dark:text-slate-500">
                  <Icon className="h-3.5 w-3.5" />
                  <span className="font-mono text-[10px] font-bold uppercase">
                    {t(spec.labelKey)}
                  </span>
                </div>
                <p className="mt-1 font-mono text-xs font-semibold text-zinc-800 dark:text-slate-200">
                  {t(spec.valKey)}
                </p>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
