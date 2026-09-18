import { Link } from 'react-router-dom'
import {
  Siren,
  ClipboardList,
  Navigation,
  Tent,
  Route,
  Users,
  ShieldCheck,
  Home,
  Megaphone,
  Bot,
  Satellite,
  HeartHandshake,
  CloudRain,
  Wind,
  Radio,
  Bluetooth,
  Zap,
  WifiOff,
  Download,
  Smartphone,
} from 'lucide-react'
import { useLanguage } from '../../lib/i18n'

const climateCards = [
  { icon: CloudRain, titleKey: 'about.climate1Title', descKey: 'about.climate1Desc' },
  { icon: Wind, titleKey: 'about.climate2Title', descKey: 'about.climate2Desc' },
  { icon: Radio, titleKey: 'about.climate3Title', descKey: 'about.climate3Desc' },
]

const featureCards = [
  { to: '/sos', icon: Siren, titleKey: 'nav.sos', descKey: 'about.featSosDesc' },
  { to: '/report', icon: ClipboardList, titleKey: 'nav.report', descKey: 'about.featReportDesc' },
  { to: '/track', icon: Navigation, titleKey: 'nav.track', descKey: 'service.trackDesc' },
  { to: '/shelters', icon: Tent, titleKey: 'nav.shelters', descKey: 'service.sheltersDesc' },
  { to: '/safe-routes', icon: Route, titleKey: 'nav.routes', descKey: 'service.routesDesc' },
  { to: '/missing-persons', icon: Users, titleKey: 'nav.missing', descKey: 'service.missingDesc' },
  { to: '/checkin', icon: ShieldCheck, titleKey: 'nav.checkin', descKey: 'service.checkinDesc' },
  { to: '/report-damage', icon: Home, titleKey: 'nav.damage', descKey: 'service.damageDesc' },
  { to: '/alerts', icon: Megaphone, titleKey: 'nav.alerts', descKey: 'about.featAlertsDesc' },
  { to: '/pfa-chat', icon: Bot, titleKey: 'nav.pfa', descKey: 'service.pfaDesc' },
  { to: '/donate', icon: HeartHandshake, titleKey: 'nav.donate', descKey: 'about.featDonateDesc' },
  { to: '/admin', icon: Satellite, titleKey: 'nav.admin', descKey: 'about.featAdminDesc' },
  { to: '/volunteer', icon: HeartHandshake, titleKey: 'nav.volunteer', descKey: 'about.featVolunteerDesc' },
]

const promoFeatures = [
  { icon: Bluetooth, titleKey: 'about.promoF1Title', descKey: 'about.promoF1Desc' },
  { icon: Zap, titleKey: 'about.promoF2Title', descKey: 'about.promoF2Desc' },
  { icon: ShieldCheck, titleKey: 'about.promoF3Title', descKey: 'about.promoF3Desc' },
  { icon: WifiOff, titleKey: 'about.promoF4Title', descKey: 'about.promoF4Desc' },
]

export default function About() {
  const { t } = useLanguage()

  return (
    <div className="mx-auto max-w-4xl space-y-12 pb-12">
      {/* Hero */}
      <div className="space-y-4 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-800 dark:text-white sm:text-4xl md:text-5xl">
          {t('about.title')}
        </h1>
        <p className="mx-auto max-w-2xl text-base text-zinc-500 dark:text-white sm:text-lg">
          {t('about.subtitle')}
        </p>
      </div>

      {/* Why AapdaSetu — India's Climate & Last-Mile Challenge */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-white/10 dark:bg-[#1a1a1a] sm:p-8 space-y-4">
        <p className="text-center text-[11px] font-black uppercase tracking-widest text-zinc-500 dark:text-white/60">{t('about.whyEyebrow')}</p>
        <h2 className="text-center text-xl font-black tracking-tight text-zinc-800 dark:text-white sm:text-2xl">{t('about.whyTitle')}</h2>
        <p className="mx-auto max-w-3xl text-center text-sm leading-relaxed text-zinc-600 dark:text-white/70 sm:text-base">
          {t('about.whyIntro')}
        </p>
        <div className="grid gap-3 sm:grid-cols-3 text-sm leading-relaxed">
          {climateCards.map((c) => {
            const Icon = c.icon
            return (
              <div key={c.titleKey} className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-white/10 dark:bg-black/20">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-900">
                    <Icon className="h-4.5 w-4.5" />
                  </span>
                  <p className="font-black text-zinc-800 dark:text-white">{t(c.titleKey)}</p>
                </div>
                <p className="mt-2 text-zinc-600 dark:text-white/70">{t(c.descKey)}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* How AapdaSetu Tackles These Problems */}
      <div className="space-y-6">
        <div className="text-center">
          <p className="text-[11px] font-black uppercase tracking-widest text-zinc-500 dark:text-white/60">{t('about.featEyebrow')}</p>
          <h2 className="mt-1 text-xl font-black tracking-tight text-zinc-800 dark:text-white sm:text-2xl">{t('about.featTitle')}</h2>
          <p className="mx-auto mt-2 max-w-3xl text-sm leading-relaxed text-zinc-600 dark:text-white/70 sm:text-base">
            {t('about.featSub')}
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 text-sm leading-relaxed">
          {featureCards.map((f) => {
            const Icon = f.icon
            return (
              <Link key={f.to} to={f.to} className="rounded-xl border border-zinc-200 bg-white p-4 transition hover:border-zinc-400 dark:border-white/10 dark:bg-[#1a1a1a] dark:hover:border-white/30">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-900">
                    <Icon className="h-4.5 w-4.5" />
                  </span>
                  <p className="font-black text-zinc-800 dark:text-white">{t(f.titleKey)}</p>
                </div>
                <p className="mt-2 text-zinc-600 dark:text-white/70">{t(f.descKey)}</p>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Offline Mobile App — SOA Mesh Companion */}
      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white text-zinc-800 dark:border-white/10 dark:bg-[#1a1a1a] dark:text-white">
        <div className="grid items-center gap-6 p-6 sm:grid-cols-2 sm:p-8">
          <div className="space-y-4">
            <p className="text-[11px] font-black uppercase tracking-widest text-zinc-500 dark:text-white/60">{t('about.promoEyebrow')}</p>
            <h2 className="text-xl font-black tracking-tight sm:text-2xl">{t('about.promoTitle')}</h2>
            <p className="text-sm leading-relaxed text-zinc-600 dark:text-white/70 sm:text-base">
              {t('about.promoDesc')}
            </p>
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="rounded-xl bg-zinc-100 p-3 dark:bg-black/20">
                <p className="text-xl font-black">97.8%</p>
                <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-white/60">{t('appdl.statAccuracyLabel')}</p>
              </div>
              <div className="rounded-xl bg-zinc-100 p-3 dark:bg-black/20">
                <p className="text-xl font-black">7 hops</p>
                <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-white/60">{t('appdl.statHopsLabel')}</p>
              </div>
              <div className="rounded-xl bg-zinc-100 p-3 dark:bg-black/20">
                <p className="text-xl font-black">&lt; 1.8s</p>
                <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-white/60">{t('appdl.statLatencyLabel')}</p>
              </div>
              <div className="rounded-xl bg-zinc-100 p-3 dark:bg-black/20">
                <p className="text-xl font-black">0 kB</p>
                <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-white/60">{t('appdl.statDataLabel')}</p>
              </div>
            </div>
            <Link
              to="/app"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-red-500"
            >
              <Download className="h-4 w-4" />
              <span>{t('about.promoCta')}</span>
            </Link>
            <p className="text-[11px] text-zinc-400 dark:text-zinc-500">{t('about.promoNote')}</p>
          </div>
          <div className="space-y-2 text-sm">
            {/* Phone visual — SOS hopping across the mesh */}
            <div className="mx-auto w-full max-w-[200px]">
              <div className="overflow-hidden rounded-[2rem] border-4 border-zinc-700 bg-zinc-950 shadow-xl dark:border-zinc-300">
                <div className="flex justify-center bg-zinc-950 pt-2">
                  <div className="h-1.5 w-14 rounded-full bg-zinc-600/70" />
                </div>
                <div className="space-y-2 px-3 py-3">
                  <div className="flex items-center justify-between border-b border-zinc-700/60 pb-1.5">
                    <span className="text-[9px] font-bold tracking-widest text-slate-300">SOA MESH</span>
                    <Bluetooth className="h-3 w-3 text-blue-400" />
                  </div>
                  <div className="max-w-[70%] rounded-2xl rounded-bl-sm bg-zinc-700/80 px-2.5 py-1.5">
                    <span className="font-mono text-[10px] font-black tracking-wider text-slate-100">SOS</span>
                  </div>
                  <div className="ml-auto flex max-w-[70%] items-center gap-1.5 rounded-2xl rounded-br-sm bg-red-600 px-2.5 py-1.5">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
                    </span>
                    <span className="font-mono text-[10px] font-black tracking-wider text-white">SOS</span>
                  </div>
                  <div className="max-w-[70%] rounded-2xl rounded-bl-sm bg-zinc-700/80 px-2.5 py-1.5">
                    <span className="font-mono text-[10px] font-black tracking-wider text-slate-100">SOS</span>
                  </div>
                </div>
                <div className="border-t border-zinc-700/60 bg-zinc-950 px-4 py-3">
                  <div className="flex items-center justify-between">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                    <span className="h-px w-10 border-t border-dashed border-slate-500" />
                    <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
                    <span className="h-px w-10 border-t border-dashed border-slate-500" />
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                  </div>
                </div>
              </div>
              <p className="mt-2 text-center text-[11px] text-zinc-400 dark:text-zinc-500">{t('about.promoMeshCap')}</p>
            </div>
            {promoFeatures.map((f) => {
              const Icon = f.icon
              return (
                <div key={f.titleKey} className="flex items-start gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-white/10 dark:bg-black/20">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-800 text-white dark:bg-white dark:text-zinc-900">
                    <Icon className="h-4.5 w-4.5" />
                  </span>
                  <div>
                    <p className="font-bold text-zinc-800 dark:text-white">{t(f.titleKey)}</p>
                    <p className="text-[13px] text-zinc-600 dark:text-white/70">{t(f.descKey)}</p>
                  </div>
                </div>
              )
            })}
            <p className="flex items-center gap-2 pt-1 text-[13px] text-zinc-500 dark:text-white/60">
              <Smartphone className="h-4 w-4 shrink-0" />
              {t('about.promoPairNote')}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
