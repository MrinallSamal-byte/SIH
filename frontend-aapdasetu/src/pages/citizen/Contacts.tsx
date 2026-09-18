import {
  Ambulance,
  Shield,
  Flame,
  HeartPulse,
  Droplets,
  HardHat,
  PhoneCall,
  ExternalLink,
  Landmark,
} from 'lucide-react'
import { useLanguage } from '../../lib/i18n'

const contacts = [
  { name: 'Ambulance', num: '108', icon: Ambulance },
  { name: 'Police', num: '100', icon: Shield },
  { name: 'Fire Brigade', num: '101', icon: Flame },
  { name: 'Disaster Helpline (NDMA)', num: '1070', icon: HeartPulse },
  { name: 'Flood Control Room', num: '1070', icon: Droplets },
  { name: 'NDRF Control Room', num: '011-24363260', icon: HardHat },
]

const officialResources = [
  {
    nameKey: 'contact.resNdmaName',
    nameFallback: 'NDMA — Relief Norms & Guidelines',
    descKey: 'contact.resNdmaDesc',
    descFallback: 'National Disaster Management Authority: official disaster guidelines, live advisories, and SDRF/NDRF relief assistance norms for property and livelihood damage.',
    url: 'https://ndma.gov.in',
  },
  {
    nameKey: 'contact.resNdrfName',
    nameFallback: 'NDRF — Response Force',
    descKey: 'contact.resNdrfDesc',
    descFallback: 'National Disaster Response Force: rescue deployments, battalion contacts, and relief operation updates.',
    url: 'https://ndrf.gov.in',
  },
]

export default function Contacts() {
  const { t } = useLanguage()

  return (
    <div className="mx-auto max-w-2xl space-y-8 pb-12">
      {/* Page Header */}
      <div className="space-y-4 text-center">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900">
          <PhoneCall className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-800 dark:text-white">
            {t('contact.title')}
          </h1>
          <p className="mx-auto mt-1 max-w-xl text-sm text-slate-500 dark:text-white sm:text-base">
            {t('contact.subtitle')} {t('contact.tapHint', 'Tap any card to call directly.')}
          </p>
        </div>
      </div>

      {/* Helplines */}
      <div className="space-y-3">
        <p className="text-xs font-black uppercase tracking-widest text-zinc-500 dark:text-white/60">{t('contact.helplines', 'Helplines')}</p>
        <div className="grid gap-3 sm:grid-cols-2">
        {contacts.map((c) => {
            const Icon = c.icon
            return (
              <a
                key={c.num + c.name}
                href={`tel:${c.num}`}
                className="group flex items-center gap-4 rounded-2xl border border-zinc-200/80 bg-white p-5 transition-all duration-200 hover:border-slate-400 active:scale-[0.98] dark:border-white/[0.08] dark:bg-[#1a1a1a] dark:hover:border-slate-600/80"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-zinc-900 text-white transition-transform duration-200 group-hover:scale-105 dark:bg-white dark:text-zinc-900">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-bold text-zinc-800 dark:text-white">
                    {c.name}
                  </h3>
                  <span className="mono text-xl font-bold tracking-tight text-zinc-800 dark:text-white">
                    {c.num}
                  </span>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-zinc-300 px-3.5 py-1.5 text-sm font-bold text-zinc-700 transition group-hover:border-zinc-800 group-hover:bg-zinc-800 group-hover:text-white dark:border-white/20 dark:text-white dark:group-hover:bg-white dark:group-hover:text-zinc-900">
                  <PhoneCall className="h-4 w-4" />
                  {t('contact.call', 'Call')}
                </span>
              </a>
            )
          })}
        </div>
      </div>

      {/* Official government resources */}
      <div className="space-y-3">
        <p className="text-xs font-black uppercase tracking-widest text-zinc-500 dark:text-white/60">{t('contact.resources', 'Official government resources')}</p>
        <p className="text-sm leading-relaxed text-slate-500 dark:text-white/70">
          {t('contact.resourcesIntro', 'For damage relief claims, compensation norms, and verified disaster advisories, refer to the authorities below.')}
        </p>
        <div className="grid gap-3">
          {officialResources.map((r) => (
            <a
              key={r.url}
              href={r.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-start gap-4 rounded-2xl border border-zinc-200/80 bg-white p-5 transition-all duration-200 hover:border-slate-400 active:scale-[0.98] dark:border-white/[0.08] dark:bg-[#1a1a1a] dark:hover:border-slate-600/80"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-zinc-900 text-white transition-transform duration-200 group-hover:scale-105 dark:bg-white dark:text-zinc-900">
                <Landmark className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-zinc-800 dark:text-white">
                  {t(r.nameKey, r.nameFallback)}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-500 dark:text-white/70">
                  {t(r.descKey, r.descFallback)}
                </p>
                <span className="mono mt-1.5 block text-sm font-bold text-zinc-500 dark:text-white/60">
                  {r.url.replace('https://', '')}
                </span>
              </div>
              <ExternalLink className="h-4 w-4 shrink-0 text-slate-300 dark:text-zinc-500" />
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
