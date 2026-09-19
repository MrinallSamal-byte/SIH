import { Link } from 'react-router-dom'
import { ChevronDown, CircleHelp, Bot, Siren, PhoneCall } from 'lucide-react'
import { useLanguage } from '../../lib/i18n'

const faqItems = [
  ['footer.q1', 'footer.a1'],
  ['footer.q2', 'footer.a2'],
  ['footer.q3', 'footer.a3'],
  ['footer.q4', 'footer.a4'],
  ['footer.q5', 'footer.a5'],
] as const

export default function Faq() {
  const { t } = useLanguage()

  return (
    <div className="mx-auto max-w-3xl space-y-8 pb-12">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-zinc-800 text-white dark:bg-slate-100 dark:text-zinc-800">
          <CircleHelp className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-800 dark:text-slate-200">
            {t('footer.faqTitle')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            {t('footer.faqSubtitle')}
          </p>
        </div>
      </div>

      {/* Accordion Questions */}
      <div className="space-y-3">
        {faqItems.map(([qKey, aKey]) => (
          <details
            key={qKey}
            className="group rounded-2xl border border-zinc-200/80 bg-white p-4 transition-all duration-200 hover:border-slate-400 dark:border-white/[0.08] dark:bg-[#1a1a1a] dark:hover:border-slate-600/80"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-bold text-zinc-800 dark:text-slate-200">
              <span>{t(qKey)}</span>
              <ChevronDown className="h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 group-open:rotate-180 dark:text-slate-500" />
            </summary>
            <p className="mt-3 text-xs sm:text-sm leading-relaxed text-slate-600 dark:text-slate-400 border-t border-zinc-100 pt-3 dark:border-white/[0.04]">
              {t(aKey)}
            </p>
          </details>
        ))}
      </div>

      {/* Ask More via AI Assistant Card */}
      <div className="rounded-2xl border border-zinc-200/80 bg-zinc-50/70 p-5 sm:p-6 dark:border-white/[0.08] dark:bg-white/[0.02]">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-400">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-zinc-800 dark:text-slate-200">
                {t('footer.askMoreAi')}
              </h3>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                {t('footer.askMoreAiDesc')}
              </p>
            </div>
          </div>
          <Link
            to="/pfa-chat"
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-sm transition-colors hover:bg-zinc-800 active:scale-[0.98] dark:bg-slate-100 dark:text-zinc-900 dark:hover:bg-white"
          >
            <Bot className="h-4 w-4" />
            <span>{t('nav.pfa')}</span>
          </Link>
        </div>
      </div>

      {/* Emergency Quick Action Buttons */}
      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        <Link
          to="/contacts"
          className="inline-flex items-center gap-2 rounded-xl border border-zinc-200/80 bg-white px-4 py-2.5 text-xs sm:text-sm font-semibold text-zinc-700 shadow-sm transition hover:border-slate-400 hover:bg-zinc-50 dark:border-white/[0.08] dark:bg-[#1a1a1a] dark:text-slate-200 dark:hover:bg-zinc-800"
        >
          <PhoneCall className="h-4 w-4 text-slate-500" />
          <span>{t('nav.contacts')}</span>
        </Link>
        <Link
          to="/sos"
          className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-sm transition hover:bg-red-700 active:scale-95"
        >
          <Siren className="h-4 w-4" />
          <span>{t('nav.sos')}</span>
        </Link>
      </div>
    </div>
  )
}
