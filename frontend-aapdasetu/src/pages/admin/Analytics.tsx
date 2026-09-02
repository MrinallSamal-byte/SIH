import { useCallback } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock
} from 'lucide-react'
import { getAnalytics } from '../../api/endpoints'
import Card from '../../components/common/Card'
import Loader from '../../components/common/Loader'
import { useRealtime } from '../../hooks/useRealtime'
import { useLanguage } from '../../lib/i18n'
import type { AnalyticsData } from '../../types'

const PRIORITY_COLORS: Record<string, string> = { RED: '#dc2626', YELLOW: '#71717a', GREEN: '#27272a' }
const TYPE_COLORS: string[] = ['#18181b', '#3f3f46', '#52525b', '#71717a', '#a1a1aa', '#d4d4d8']

function toChartData(record: Record<string, number>) {
  return Object.entries(record).map(([name, value]) => ({ name, value }))
}

export default function Analytics() {
  const { t } = useLanguage()
  const fetchAnalytics = useCallback(() => getAnalytics(), [])
  const data = useRealtime<AnalyticsData>(fetchAnalytics, 10000)

  if (!data) return <Loader />

  const byType = toChartData(data.byType)
  const byPriority = toChartData(data.byPriority)
  const byStatus = toChartData(data.byStatus)

  const totalIncidents = byType.reduce((a, b) => a + b.value, 0)
  const redCount = data.byPriority['RED'] || 0
  const resolvedCount = data.byStatus['resolved'] || 0
  const resolvedPct = totalIncidents > 0 ? Math.round((resolvedCount / totalIncidents) * 100) : 0
  // Optional field mapped by getAnalytics when the backend reports it.
  const avgResponseMinutes = (data as AnalyticsData & { avgResponseMinutes?: number | null }).avgResponseMinutes

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-zinc-900 dark:text-zinc-100" />
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-slate-100">
              {t('an.title')}
            </h1>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {t('an.subtitle')}
          </p>
        </div>

        <span className="rounded-lg border border-zinc-200 bg-white px-3 py-1 text-xs font-bold text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 mono shadow-2xs">
          {totalIncidents.toLocaleString()} {t('an.incidentPointsAnalyzed')}
        </span>
      </div>

      {/* KPI Cards Row — Monochromatic high-contrast */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-2xs dark:border-zinc-800 dark:bg-[#181818]">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mono">{t('an.incidentLoad')}</div>
          <div className="mt-1 text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-100">
            {totalIncidents.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400">{t('an.aggregatedSubmissions')}</div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-2xs dark:border-zinc-800 dark:bg-[#181818]">
          <div className="text-[11px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400 mono flex items-center gap-1">
            <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
            <span>{t('an.redPriorityRatio')}</span>
          </div>
          <div className="mt-1 text-2xl font-bold font-mono text-red-600 dark:text-red-400">
            {totalIncidents > 0 ? Math.round((redCount / totalIncidents) * 100) : 0}%
          </div>
          <div className="text-[11px] text-slate-400">{redCount} {t('an.criticalDistressCalls')}</div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-2xs dark:border-zinc-800 dark:bg-[#181818]">
          <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mono flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5 text-zinc-500" />
            <span>{t('an.resolutionRate')}</span>
          </div>
          <div className="mt-1 text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-100">
            {resolvedPct}%
          </div>
          <div className="text-[11px] text-slate-400">{resolvedCount} {t('an.casesClosed')}</div>
        </div>

        {typeof avgResponseMinutes === 'number' && (
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-2xs dark:border-zinc-800 dark:bg-[#181818]">
            <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mono flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-zinc-500" />
              <span>{t('an.meanResponseDelta')}</span>
            </div>
            <div className="mt-1 text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-100">
              {Math.round(avgResponseMinutes)} min
            </div>
            <div className="text-[11px] text-slate-400">{t('an.avgResponseCaption', 'avg response')}</div>
          </div>
        )}
      </div>

      {/* Main Charts Grid */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Incidents by Type */}
        <Card title={t('an.byHazardCategory')}>
          <div className="h-64 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byType} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="name" fontSize={11} tickLine={false} />
                <YAxis allowDecimals={false} fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: 'none',
                    borderRadius: '0.75rem',
                    color: '#fff',
                    fontSize: '12px',
                    fontWeight: 600,
                  }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {byType.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={TYPE_COLORS[index % TYPE_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Priority Distribution */}
        <Card title={t('an.priorityDistribution')}>
          <div className="h-64 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={byPriority}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={4}
                  label={({ name, percent }: { name?: string; percent?: number }) => `${name ?? ''} ${Number.isFinite(percent) ? ((percent! * 100)).toFixed(0) : '0'}%`}
                >
                  {byPriority.map((entry) => (
                    <Cell key={entry.name} fill={PRIORITY_COLORS[entry.name] ?? '#94a3b8'} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: 'none',
                    borderRadius: '0.75rem',
                    color: '#fff',
                    fontSize: '12px',
                    fontWeight: 600,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Response Status */}
        <Card title={t('an.mitigationStatus')}>
          <div className="h-64 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={byStatus}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={4}
                  label={({ name, percent }: { name?: string; percent?: number }) => `${(name ?? '').replace('_', ' ')} ${Number.isFinite(percent) ? ((percent! * 100)).toFixed(0) : '0'}%`}
                >
                  {byStatus.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={
                        entry.name === 'pending'
                          ? '#71717a'
                          : entry.name === 'in_progress'
                          ? '#3f3f46'
                          : '#18181b'
                      }
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#18181b',
                    border: '1px solid #27272a',
                    borderRadius: '0.75rem',
                    color: '#fff',
                    fontSize: '12px',
                    fontWeight: 600,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Temporal Trends */}
        <Card title={t('an.submissionsOverTime')}>
          <div className="h-64 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.byTime} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="countGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#52525b" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#52525b" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="date" fontSize={11} tickLine={false} />
                <YAxis allowDecimals={false} fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#18181b',
                    border: '1px solid #27272a',
                    borderRadius: '0.75rem',
                    color: '#fff',
                    fontSize: '12px',
                    fontWeight: 600,
                  }}
                />
                <Area type="monotone" dataKey="count" stroke="#27272a" strokeWidth={2.5} fill="url(#countGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  )
}
