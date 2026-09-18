import { Link } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'
import { useLanguage } from '../../lib/i18n'

const questions = [
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
      <div className="text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-white/60">
          {t('footer.faqTitle')}
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-800 dark:text-white sm:text-4xl">
          {t('footer.faqTitle')}
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-zinc-600 dark:text-white/70 sm:text-base">
          {t('footer.faqSubtitle')}
        </p>
      </div>

      <div className="space-y-2">
        {questions.map(([questionKey, answerKey]) => (
          <details key={questionKey} className="group rounded-xl border border-zinc-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-[#1a1a1a]">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-bold text-zinc-800 dark:text-white">
              <span>{t(questionKey)}</span>
              <ChevronDown className="h-4 w-4 shrink-0 text-zinc-400 transition-transform group-open:rotate-180" />
            </summary>
            <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-white/70">{t(answerKey)}</p>
          </details>
        ))}
      </div>

      <div className="flex flex-wrap justify-center gap-2 text-sm">
        <Link to="/contacts" className="rounded-lg border border-zinc-200 px-3 py-2 font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-white/10 dark:text-white dark:hover:bg-white/10">
          {t('nav.contacts')}
        </Link>
        <Link to="/sos" className="rounded-lg bg-red-600 px-3 py-2 font-bold text-white hover:bg-red-700">
          {t('nav.sos')}
        </Link>
      </div>
    </div>
  )
}
