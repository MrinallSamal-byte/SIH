import { useCallback, useState } from 'react'
import {
  ShieldAlert,
  AlertTriangle,
  Info,
  Clock,
  MapPin,
  Radio
} from 'lucide-react'
import { listAlerts } from '../../api/endpoints'
import Badge from '../../components/common/Badge'
import Loader from '../../components/common/Loader'
import { useRealtime } from '../../hooks/useRealtime'
import { useLanguage } from '../../lib/i18n'
import { timeAgo } from '../../lib/helpers'
import type { Alert } from '../../types'

export default function Alerts() {
  const { t } = useLanguage()
  const fetchAlerts = useCallback(() => listAlerts(), [])
  const alerts = useRealtime<Alert[]>(fetchAlerts, 8000)
  const [filter, setFilter] = useState<string>('all')

  const filtered = (alerts ?? []).filter((a) => {
    if (filter === 'all') return true
    return a.severity === filter
  })

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Radio className="h-5 w-5 text-red-600 animate-pulse" />
            <h1 className="text-2xl font-bold text-zinc-800 dark:text-slate-300">{t('bulletin.title')}</h1>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Real-time emergency broadcasts from NDMA, SDMA, and National Incident Command.
          </p>
        </div>

        {/* Severity Filter Tabs */}
        <div className="flex items-center gap-1 rounded-xl border border-zinc-200/80 bg-white p-1 dark:border-white/[0.08] dark:bg-[#1a1a1a] shadow-xs">
          {(['all', 'critical', 'warning', 'info'] as const).map((sev) => (
            <button
              key={sev}
              onClick={() => setFilter(sev)}
              className={`rounded-lg px-3 py-1 text-xs font-semibold capitalize transition ${
                filter === sev
                  ? 'bg-zinc-800 text-white dark:bg-slate-100 dark:text-zinc-800'
                  : 'text-zinc-500 hover:text-zinc-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              {sev}
            </button>
          ))}
        </div>
      </div>

      {alerts === null && <Loader />}

      <div className="space-y-3">
        {filtered.map((a) => {
          const borderClass =
            a.severity === 'critical'
              ? 'border-l-4 border-l-red-600'
              : a.severity === 'warning'
              ? 'border-l-4 border-l-amber-500'
              : 'border-l-4 border-l-blue-500'

          const Icon = a.severity === 'critical' ? ShieldAlert : a.severity === 'warning' ? AlertTriangle : Info

          return (
            <div
              key={a.id}
              className={`rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-xs transition dark:border-white/[0.08] dark:bg-[#1a1a1a] ${borderClass}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Icon className="h-4.5 w-4.5 text-slate-500" />
                  <Badge value={a.severity} />
                  <h3 className="text-sm font-bold text-zinc-800 dark:text-slate-300">{a.title}</h3>
                </div>
                <div className="flex items-center gap-1 text-xs text-slate-400 mono">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{timeAgo(a.createdAt)}</span>
                </div>
              </div>

              <p className="mt-2.5 text-xs leading-relaxed text-zinc-500 dark:text-slate-300">{a.message}</p>

              {a.region && (
                <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 pt-2.5 dark:border-white/[0.08]">
                  <MapPin className="h-3.5 w-3.5 text-slate-400" />
                  <span className="font-semibold text-zinc-600 dark:text-slate-300">Affected Area: {a.region}</span>
                </div>
              )}
            </div>
          )
        })}

        {alerts && filtered.length === 0 && (
          <div className="rounded-2xl border border-dashed border-zinc-200/80 p-12 text-center text-xs text-slate-400 dark:border-white/[0.08]">
            No active emergency alerts in this category.
          </div>
        )}
      </div>
    </div>
  )
}
