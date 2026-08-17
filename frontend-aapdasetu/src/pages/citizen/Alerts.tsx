import { useCallback, useState } from 'react'
import { listAlerts } from '../../api/endpoints'
import Badge from '../../components/common/Badge'
import Loader from '../../components/common/Loader'
import { useRealtime } from '../../hooks/useRealtime'
import { timeAgo } from '../../lib/helpers'
import { useLanguage } from '../../lib/i18n'
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
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{t('alerts.title')}</h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {t('alerts.subtitle')}
          </p>
        </div>

        {/* Severity Filter Tabs */}
        <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-900">
          {(['all', 'critical', 'warning', 'info'] as const).map((sev) => (
            <button
              key={sev}
              onClick={() => setFilter(sev)}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold capitalize transition cursor-pointer ${
                filter === sev
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              {t(`alerts.${sev}`)}
            </button>
          ))}
        </div>
      </div>

      {alerts === null && <Loader />}

      <div className="space-y-3">
        {filtered.map((a) => (
          <div
            key={a.id}
            className={`rounded-2xl border bg-white p-5 shadow-xs transition dark:bg-slate-900 ${
              a.severity === 'critical'
                ? 'border-red-200 ring-1 ring-red-500/20 dark:border-red-900/60'
                : a.severity === 'warning'
                ? 'border-amber-200 dark:border-amber-900/60'
                : 'border-slate-200 dark:border-slate-800'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Badge value={a.severity} />
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{a.title}</h3>
              </div>
              <span className="text-xs text-slate-400">{timeAgo(a.createdAt)}</span>
            </div>

            <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">{a.message}</p>

            {a.region && (
              <div className="mt-3 flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                <span>📍 {t('alerts.affectedRegion')}</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">{a.region}</span>
              </div>
            )}
          </div>
        ))}

        {alerts && filtered.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-200 p-10 text-center text-xs text-slate-400 dark:border-slate-800">
            {t('alerts.noneFound')}
          </div>
        )}
      </div>
    </div>
  )
}
