import { useCallback } from 'react'
import { listAlerts } from '../../api/endpoints'
import Badge from '../../components/common/Badge'
import Loader from '../../components/common/Loader'
import { useRealtime } from '../../hooks/useRealtime'
import { timeAgo } from '../../lib/helpers'
import type { Alert } from '../../types'

export default function Alerts() {
  // Polls GET /api/alerts — swap for Supabase postgres_changes via useRealtime
  // when a backend is connected (see src/hooks/useRealtime.ts).
  const fetchAlerts = useCallback(() => listAlerts(), [])
  const alerts = useRealtime<Alert[]>(fetchAlerts, 8000)

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold">Public warnings</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Real-time emergency broadcasts from the Command Center.</p>

      {alerts === null && <Loader />}

      <div className="mt-4 space-y-3">
        {(alerts ?? []).map((a) => (
          <div
            key={a.id}
            className={`rounded-xl border-l-4 bg-white dark:bg-slate-900 p-4 shadow-sm ${
              a.severity === 'critical'
                ? 'border-red-500'
                : a.severity === 'warning'
                  ? 'border-amber-500'
                  : 'border-blue-500'
            }`}
          >
            <div className="flex items-center gap-2">
              <Badge value={a.severity} />
              <span className="font-semibold">{a.title}</span>
              <span className="ml-auto text-xs text-slate-400 dark:text-slate-500">{timeAgo(a.createdAt)}</span>
            </div>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{a.message}</p>
            {a.region && <div className="mt-1 text-xs text-slate-400 dark:text-slate-500">Region: {a.region}</div>}
          </div>
        ))}
        {alerts && alerts.length === 0 && <div className="text-sm text-slate-400 dark:text-slate-500">No active alerts.</div>}
      </div>
    </div>
  )
}
