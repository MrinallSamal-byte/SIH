import {
  Siren,
  FileText,
  Compass,
  Building,
  Users,
  Bot,
  WifiOff,
  MapPin,
} from 'lucide-react'
import { useLanguage } from '../../lib/i18n'

const features = [
  { icon: Siren, titleKey: 'about.feature1Title', descKey: 'about.feature1Desc' },
  { icon: FileText, titleKey: 'about.feature2Title', descKey: 'about.feature2Desc' },
  { icon: MapPin, titleKey: 'about.feature3Title', descKey: 'about.feature3Desc' },
  { icon: Building, titleKey: 'about.feature4Title', descKey: 'about.feature4Desc' },
  { icon: Compass, titleKey: 'about.feature5Title', descKey: 'about.feature5Desc' },
  { icon: Bot, titleKey: 'about.feature6Title', descKey: 'about.feature6Desc' },
  { icon: Users, titleKey: 'about.feature7Title', descKey: 'about.feature7Desc' },
  { icon: WifiOff, titleKey: 'about.feature8Title', descKey: 'about.feature8Desc' },
]

export default function About() {
  const { t } = useLanguage()

  return (
    <div className="mx-auto max-w-4xl space-y-12 pb-12">
      {/* Hero */}
      <div className="space-y-4 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-800 dark:text-slate-300 sm:text-4xl md:text-5xl">
          {t('about.title')}
        </h1>
        <p className="mx-auto max-w-2xl text-base text-zinc-500 dark:text-slate-400 sm:text-lg">
          {t('about.subtitle')}
        </p>
      </div>

      {/* Mission */}
      <div className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm dark:border-white/[0.08] dark:bg-[#1a1a1a] sm:p-8">
        <h2 className="mb-3 text-xl font-bold text-zinc-800 dark:text-slate-300">
          {t('about.missionTitle')}
        </h2>
        <p className="leading-relaxed text-zinc-500 dark:text-slate-400">
          {t('about.missionDesc')}
        </p>
      </div>

      {/* Features */}
      <div className="space-y-6">
        <h2 className="text-center text-2xl font-bold tracking-tight text-zinc-800 dark:text-slate-300 sm:text-3xl">
          {t('about.featuresTitle')}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {features.map((f) => {
            const Icon = f.icon
            return (
              <div
                key={f.titleKey}
                className="group rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm transition dark:border-white/[0.08] dark:bg-[#1a1a1a]"
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600 transition group-hover:bg-red-600 group-hover:text-white dark:bg-red-950 dark:text-red-400">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mb-1.5 text-sm font-bold text-zinc-800 dark:text-slate-300">
                  {t(f.titleKey)}
                </h3>
                <p className="text-xs leading-relaxed text-zinc-500 dark:text-slate-400">
                  {t(f.descKey)}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
