import {
  Phone,
  Siren,
  Ambulance,
  Shield,
  Flame,
  HeartPulse,
  Droplets,
  HardHat,
  PhoneCall,
} from 'lucide-react'
import { useLanguage } from '../../lib/i18n'

const contacts = [
  { name: 'National Emergency (SOS)', num: '112', icon: Siren, highlight: true },
  { name: 'Ambulance', num: '108', icon: Ambulance },
  { name: 'Police', num: '100', icon: Shield },
  { name: 'Fire Brigade', num: '101', icon: Flame },
  { name: 'Disaster Helpline (NDMA)', num: '1070', icon: HeartPulse },
  { name: 'Flood Control Room', num: '1070', icon: Droplets },
  { name: 'NDRF Control Room', num: '011-24363260', icon: HardHat },
]

export default function Contacts() {
  const { t } = useLanguage()

  return (
    <div className="mx-auto max-w-2xl space-y-8 pb-12">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-zinc-800 text-white dark:bg-slate-100 dark:text-zinc-800">
          <PhoneCall className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-800 dark:text-slate-200">
            {t('contact.title')}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t('contact.subtitle')}
          </p>
        </div>
      </div>

      {/* SOS Card — full width */}
      {contacts
        .filter((c) => c.highlight)
        .map((c) => {
          const Icon = c.icon
          return (
            <a
              key={c.num}
              href={`tel:${c.num}`}
              className="group flex items-center gap-5 rounded-2xl border-2 border-red-200 bg-red-50 p-6 transition-all duration-200 hover:border-red-300 active:scale-[0.98] dark:border-red-900/60 dark:bg-red-950/40 dark:hover:border-red-800"
            >
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-red-600 text-white shadow-sm">
                <Icon className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-red-700 dark:text-red-300">
                  {c.name}
                </h3>
                <span className="mono text-2xl font-extrabold tracking-tight text-red-700 dark:text-red-300">
                  {c.num}
                </span>
              </div>
              <Phone className="h-5 w-5 shrink-0 text-red-400 dark:text-red-500" />
            </a>
          )
        })}

      {/* Other contacts — 2-col grid */}
      <div className="grid gap-3 sm:grid-cols-2">
        {contacts
          .filter((c) => !c.highlight)
          .map((c) => {
            const Icon = c.icon
            return (
              <a
                key={c.num + c.name}
                href={`tel:${c.num}`}
                className="group flex items-center gap-4 rounded-2xl border border-zinc-200/80 bg-white p-5 transition-all duration-200 hover:border-slate-400 active:scale-[0.98] dark:border-white/[0.08] dark:bg-[#1a1a1a] dark:hover:border-slate-600/80"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-zinc-800 text-white transition-transform duration-200 group-hover:scale-105 dark:bg-slate-100 dark:text-zinc-800">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-zinc-800 dark:text-slate-300">
                    {c.name}
                  </h3>
                  <span className="mono text-lg font-bold tracking-tight text-zinc-800 dark:text-slate-300">
                    {c.num}
                  </span>
                </div>
                <Phone className="h-4 w-4 shrink-0 text-slate-300 dark:text-zinc-500" />
              </a>
            )
          })}
      </div>
    </div>
  )
}
