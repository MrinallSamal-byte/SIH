import { useEffect, useState } from 'react'
import {
  Download,
  Smartphone,
  WifiOff,
  Bluetooth,
  ShieldCheck,
  Feather,
  CloudLightning,
  Users,
  Mountain,
  ZapOff,
  PhoneCall,
  ExternalLink,
  Info,
} from 'lucide-react'
import { useLanguage } from '../../lib/i18n'

const GITHUB_REPO_URL = 'https://github.com/MrinallSamal-byte/SIH'
const APK_PATH = 'downloads/soa-mesh.apk'

type ApkAvailability = 'checking' | 'ready' | 'missing'

const whyCards = [
  { icon: WifiOff, titleKey: 'appdl.whyOfflineTitle', descKey: 'appdl.whyOfflineDesc' },
  { icon: Bluetooth, titleKey: 'appdl.whyNoSimTitle', descKey: 'appdl.whyNoSimDesc' },
  { icon: ShieldCheck, titleKey: 'appdl.whyPrivateTitle', descKey: 'appdl.whyPrivateDesc' },
  { icon: Feather, titleKey: 'appdl.whyLightTitle', descKey: 'appdl.whyLightDesc' },
]

const whenScenarios = [
  { icon: CloudLightning, textKey: 'appdl.whenCyclone' },
  { icon: Users, textKey: 'appdl.whenFestival' },
  { icon: Mountain, textKey: 'appdl.whenTrek' },
  { icon: ZapOff, textKey: 'appdl.whenBlackout' },
]

const installSteps = [
  { titleKey: 'appdl.step1Title', descKey: 'appdl.step1Desc' },
  { titleKey: 'appdl.step2Title', descKey: 'appdl.step2Desc' },
  { titleKey: 'appdl.step3Title', descKey: 'appdl.step3Desc' },
  { titleKey: 'appdl.step4Title', descKey: 'appdl.step4Desc' },
]

const faqItems = [
  { qKey: 'appdl.faqInternetQ', aKey: 'appdl.faqInternetA' },
  { qKey: 'appdl.faqIosQ', aKey: 'appdl.faqIosA' },
  { qKey: 'appdl.faqPrivacyQ', aKey: 'appdl.faqPrivacyA' },
]

export default function AppDownload() {
  const { t } = useLanguage()
  const [apkState, setApkState] = useState<ApkAvailability>('checking')
  const apkUrl = `${import.meta.env.BASE_URL}${APK_PATH}`

  // Graceful missing-file handling: if the APK isn't published yet, swap the
  // download CTA for an "uploading soon" state plus the GitHub source link.
  useEffect(() => {
    let cancelled = false
    fetch(apkUrl, { method: 'HEAD' })
      .then((res) => {
        if (cancelled) return
        // SPA fallbacks happily serve 200 + text/html for missing files — only
        // trust an Android APK content-type or a real .apk path.
        const ctype = (res.headers.get('content-type') || '').toLowerCase()
        const looksLikeApk =
          ctype.includes('android') || apkUrl.toLowerCase().endsWith('.apk')
        const isSpaFallback = ctype.includes('text/html')
        setApkState(res.ok && looksLikeApk && !isSpaFallback ? 'ready' : 'missing')
      })
      .catch(() => {
        if (!cancelled) setApkState('missing')
      })
    return () => {
      cancelled = true
    }
  }, [apkUrl])

  const apkMissing = apkState === 'missing'

  return (
    <div className="mx-auto max-w-5xl space-y-14 pb-12">
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="grid items-center gap-8 pt-4 md:grid-cols-2 md:gap-10">
        <div className="space-y-4">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
            <Smartphone className="h-3 w-3" />
            {t('appdl.heroBadge')}
          </span>

          <h1 className="text-2xl font-bold tracking-tight text-zinc-800 dark:text-slate-200 sm:text-3xl md:text-4xl">
            {t('appdl.heroTitle')}
          </h1>

          <p className="text-sm leading-relaxed text-zinc-500 dark:text-slate-400 sm:text-base">
            {t('appdl.heroDesc')}
          </p>

          {/* Version chip */}
          <div className="inline-block rounded-full border border-zinc-200/80 bg-white px-3 py-1 font-mono text-[11px] font-bold text-slate-500 dark:border-white/[0.08] dark:bg-[#1a1a1a] dark:text-slate-400">
            {t('appdl.versionChip')}
          </div>

          <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center">
            {apkMissing ? (
              <button
                type="button"
                disabled
                aria-disabled="true"
                className="inline-flex cursor-not-allowed items-center justify-center gap-2.5 rounded-xl bg-zinc-300 px-7 py-4 text-base font-extrabold text-zinc-500 shadow-sm dark:bg-[#252525] dark:text-slate-500"
              >
                <Info className="h-5 w-5" />
                <span>{t('appdl.uploadingSoon')}</span>
              </button>
            ) : apkState === 'checking' ? (
              // Download CTA stays disabled until the HEAD probe confirms a real APK.
              <button
                type="button"
                disabled
                aria-disabled="true"
                aria-busy="true"
                aria-label={t('appdl.checkingBuild')}
                className="inline-flex cursor-not-allowed items-center justify-center gap-2.5 rounded-xl bg-zinc-300 px-7 py-4 text-base font-extrabold text-zinc-500 shadow-sm dark:bg-[#252525] dark:text-slate-500"
              >
                <Download className="h-5 w-5" />
                <span>{t('appdl.checkingBuild')}</span>
              </button>
            ) : (
              <a
                href={apkUrl}
                download="soa-mesh.apk"
                className="group inline-flex items-center justify-center gap-2.5 rounded-xl bg-red-600 px-7 py-4 text-base font-extrabold uppercase tracking-tight text-white transition-all hover:bg-red-700 active:scale-[0.98] shadow-md shadow-red-600/20 ring-2 ring-red-600/30"
              >
                <Download className="h-5 w-5 transition-transform group-hover:translate-y-0.5" />
                <span>{t('appdl.downloadBtn')}</span>
              </a>
            )}
            {apkMissing && (
              <a
                href={GITHUB_REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-6 py-3.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 active:scale-[0.98] dark:border-white/[0.1] dark:bg-[#1a1a1a] dark:text-slate-200 dark:hover:bg-[#252525]"
              >
                <ExternalLink className="size-[18px]" />
                <span>{t('appdl.getFromGitHub')}</span>
              </a>
            )}
            {/* ponytail: an href="#how-to-install" anchor gets hijacked by HashRouter — scroll manually instead */}
            <button
              type="button"
              onClick={() =>
                document.getElementById('how-to-install')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-6 py-3.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 active:scale-[0.98] dark:border-white/[0.1] dark:bg-[#1a1a1a] dark:text-slate-200 dark:hover:bg-[#252525]"
            >
              <Smartphone className="size-[18px]" />
              <span>{t('appdl.howInstallLink')}</span>
            </button>
          </div>

          <p className="text-xs text-slate-400 dark:text-slate-500">
            {t('appdl.downloadHint')}
            {apkState === 'ready' && (
              <>
                {' · '}
                <a
                  href={`${import.meta.env.BASE_URL}downloads/soa-mesh-universal.apk`}
                  download="soa-mesh-universal.apk"
                  className="underline decoration-dotted underline-offset-2 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  {t('appdl.universalApk')}
                </a>
              </>
            )}
          </p>
        </div>

        {/* Phone mockup — SOS message hopping across a 3-device mesh */}
        <div className="mx-auto w-full max-w-[260px]">
          <div className="overflow-hidden rounded-[2.2rem] border-4 border-zinc-800 bg-zinc-900 shadow-xl dark:border-zinc-600 dark:bg-black">
            {/* Notch */}
            <div className="flex justify-center bg-zinc-900 pt-2 dark:bg-black">
              <div className="h-1.5 w-16 rounded-full bg-zinc-600/70" />
            </div>
            {/* Chat area */}
            <div className="space-y-2.5 px-3 py-4">
              <div className="flex items-center justify-between border-b border-zinc-700/60 pb-2">
                <span className="text-[9px] font-bold tracking-widest text-slate-300">SOA MESH</span>
                <Bluetooth className="h-3 w-3 text-blue-400" />
              </div>
              <div className="max-w-[70%] rounded-2xl rounded-bl-sm bg-zinc-700/80 px-3 py-2">
                <span className="font-mono text-[11px] font-black tracking-wider text-slate-100">SOS</span>
                <div className="mt-0.5 h-0.5 w-8 rounded-full bg-slate-500" />
              </div>
              <div className="ml-auto flex max-w-[70%] items-center gap-1.5 rounded-2xl rounded-br-sm bg-red-600 px-3 py-2">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
                </span>
                <span className="font-mono text-[11px] font-black tracking-wider text-white">SOS</span>
              </div>
              <div className="max-w-[70%] rounded-2xl rounded-bl-sm bg-zinc-700/80 px-3 py-2">
                <span className="font-mono text-[11px] font-black tracking-wider text-slate-100">SOS</span>
                <div className="mt-0.5 flex gap-1">
                  <span className="h-0.5 w-8 rounded-full bg-slate-500" />
                  <span className="h-0.5 w-3 rounded-full bg-slate-500" />
                </div>
              </div>
            </div>
            {/* Mesh strip: 3 device dots relaying */}
            <div className="border-t border-zinc-700/60 bg-zinc-900 px-5 py-4 dark:bg-black">
              <div className="flex items-center justify-between">
                <span className="relative flex h-3.5 w-3.5 items-center justify-center">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-40" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-emerald-400/30" />
                </span>
                <span className="h-px w-12 border-t border-dashed border-slate-500" />
                <span className="relative flex h-3.5 w-3.5 items-center justify-center">
                  <span
                    className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-50"
                    style={{ animationDelay: '300ms' }}
                  />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-red-500/30" />
                </span>
                <span className="h-px w-12 border-t border-dashed border-slate-500" />
                <span className="relative flex h-3.5 w-3.5 items-center justify-center">
                  <span
                    className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-40"
                    style={{ animationDelay: '600ms' }}
                  />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-emerald-400/30" />
                </span>
              </div>
            </div>
          </div>
          <p className="mt-3 text-center text-xs leading-relaxed text-slate-400 dark:text-slate-500">
            {t('appdl.meshCaption')}
          </p>
        </div>
      </section>

      {/* ── Why use it ───────────────────────────────────────── */}
      <section className="space-y-5">
        <h2 className="text-xl font-bold tracking-tight text-zinc-800 dark:text-slate-300 sm:text-2xl">
          {t('appdl.whyTitle')}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {whyCards.map((card) => {
            const Icon = card.icon
            return (
              <div
                key={card.titleKey}
                className="group rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm transition dark:border-white/[0.08] dark:bg-[#1a1a1a]"
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600 transition group-hover:bg-red-600 group-hover:text-white dark:bg-red-950 dark:text-red-400">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mb-1.5 text-sm font-bold text-zinc-800 dark:text-slate-300">
                  {t(card.titleKey)}
                </h3>
                <p className="text-xs leading-relaxed text-zinc-500 dark:text-slate-400">
                  {t(card.descKey)}
                </p>
              </div>
            )
          })}
        </div>
        <p className="text-xs leading-relaxed text-slate-400 dark:text-slate-500">
          {t('appdl.meshNote')}
        </p>
      </section>

      {/* ── When to use it ───────────────────────────────────── */}
      <section className="space-y-5">
        <h2 className="text-xl font-bold tracking-tight text-zinc-800 dark:text-slate-300 sm:text-2xl">
          {t('appdl.whenTitle')}
        </h2>
        <ol className="space-y-3">
          {whenScenarios.map((item, i) => {
            const Icon = item.icon
            return (
              <li
                key={item.textKey}
                className="flex items-start gap-3.5 rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm dark:border-white/[0.08] dark:bg-[#1a1a1a]"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300">
                  <Icon className="size-[18px]" />
                </div>
                <div className="min-w-0 pt-1.5">
                  <span className="mr-2 font-mono text-[10px] font-bold text-slate-400 mono">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="text-sm font-medium leading-relaxed text-zinc-600 dark:text-slate-300">
                    {t(item.textKey)}
                  </span>
                </div>
              </li>
            )
          })}
        </ol>

        {/* Amber safety callout */}
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-5 shadow-sm dark:border-amber-900/30 dark:from-amber-950/20 dark:to-[#1a1a1a]">
          <PhoneCall className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <p className="text-sm font-medium leading-relaxed text-amber-800 dark:text-amber-200">
            {t('appdl.callout112')}
          </p>
        </div>
      </section>

      {/* ── How to install ───────────────────────────────────── */}
      <section id="how-to-install" className="scroll-mt-24 space-y-5">
        <h2 className="text-xl font-bold tracking-tight text-zinc-800 dark:text-slate-300 sm:text-2xl">
          {t('appdl.installTitle')}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {installSteps.map((step, i) => (
            <div
              key={step.titleKey}
              className="flex items-start gap-3.5 rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm dark:border-white/[0.08] dark:bg-[#1a1a1a]"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-800 font-mono text-xs font-black text-white dark:bg-slate-100 dark:text-zinc-800">
                {i + 1}
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-zinc-800 dark:text-slate-300">
                  {t(step.titleKey)}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-zinc-500 dark:text-slate-400">
                  {t(step.descKey)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FAQ mini ─────────────────────────────────────────── */}
      <section className="space-y-5">
        <h2 className="text-xl font-bold tracking-tight text-zinc-800 dark:text-slate-300 sm:text-2xl">
          {t('appdl.faqTitle')}
        </h2>
        <div className="space-y-3">
          {faqItems.map((item) => (
            <details
              key={item.qKey}
              className="group rounded-2xl border border-zinc-200/80 bg-white px-5 py-4 shadow-sm open:pb-5 dark:border-white/[0.08] dark:bg-[#1a1a1a]"
            >
              <summary className="cursor-pointer list-none text-sm font-bold text-zinc-800 marker:hidden marker:content-none dark:text-slate-300 [&::-webkit-details-marker]:hidden">
                <span className="mr-2 inline-block text-red-500 transition-transform group-open:rotate-90">▸</span>
                {t(item.qKey)}
              </summary>
              <p className="mt-2.5 pl-6 text-xs leading-relaxed text-zinc-500 dark:text-slate-400">
                {t(item.aKey)}
              </p>
            </details>
          ))}
        </div>
      </section>
    </div>
  )
}
