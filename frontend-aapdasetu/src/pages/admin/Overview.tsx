import { useCallback } from 'react'
import { getOverviewKPIs } from '../../api/endpoints'
import Card from '../../components/common/Card'
import Loader from '../../components/common/Loader'
import { useRealtime } from '../../hooks/useRealtime'
import type { OverviewKPIs } from '../../types'

export default function Overview() {
  const fetchKpis = useCallback(() => getOverviewKPIs(), [])
  const kpis = useRealtime<OverviewKPIs>(fetchKpis, 10000)

  if (!kpis) return <Loader />

  const cards = [
    { label: 'Total reports', value: kpis.totalReports, color: 'text-slate-800 dark:text-slate-200' },
    { label: 'Active RED alerts', value: kpis.activeRedAlerts, color: 'text-red-600' },
    { label: 'Open shelters', value: kpis.openShelters, color: 'text-emerald-600' },
    { label: 'Available volunteers', value: kpis.availableVolunteers, color: 'text-blue-600' },
    { label: 'Avg response (min)', value: kpis.avgResponseTimeMins, color: 'text-amber-600' },
    { label: 'Open cases', value: kpis.openCases, color: 'text-slate-800 dark:text-slate-200' },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Overview & KPIs</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Command center crisis gauge and live performance metrics.</p>

      <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-3">
        {cards.map((c) => (
          <Card key={c.label}>
            <div className={`text-2xl font-bold tabular-nums ${c.color}`}>{c.value}</div>
            <div className="mt-1 text-xs text-slate-500">{c.label}</div>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card title="Crisis severity gauge">
          <div className="flex items-center gap-4">
            <div className="relative flex h-32 w-32 items-center justify-center rounded-full border-4 border-slate-100 dark:border-slate-600">
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background: `conic-gradient(${
                    kpis.crisisScore >= 80 ? '#dc2626' : kpis.crisisScore >= 50 ? '#f59e0b' : '#10b981'
                  } ${kpis.crisisScore * 3.6}deg, transparent 0deg)`,
                }}
              />
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white text-xl font-bold dark:bg-slate-900">
                {kpis.crisisScore}
              </div>
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-300">
              Composite crisis score from active RED alerts and pending cases. Higher = more severe.
            </div>
          </div>
        </Card>
        <Card title="Live response pulse">
          <div className="space-y-3 text-sm">
            <Bar label="Reports being handled" value={kpis.totalReports - kpis.openCases} max={Math.max(kpis.totalReports, 1)} />
            <Bar label="Open / pending" value={kpis.openCases} max={Math.max(kpis.totalReports, 1)} />
            <Bar label="RED critical" value={kpis.activeRedAlerts} max={Math.max(kpis.totalReports, 1)} />
          </div>
        </Card>
      </div>
    </div>
  )
}

function Bar({ label, value, max }: { label: string; value: number; max: number }) {
  return (
    <div>
      <div className="flex justify-between text-xs text-slate-500">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div className="mt-1 h-2 rounded bg-slate-100">
        <div className="h-2 rounded bg-blue-500" style={{ width: `${Math.min(100, (value / max) * 100)}%` }} />
      </div>
    </div>
  )
}
