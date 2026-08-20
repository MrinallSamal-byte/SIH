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
import type { AnalyticsData } from '../../types'

const PRIORITY_COLORS: Record<string, string> = { RED: '#dc2626', YELLOW: '#f59e0b', GREEN: '#10b981' }
const TYPE_COLORS: string[] = ['#3b82f6', '#06b6d4', '#8b5cf6', '#ec4899', '#f97316', '#10b981']

function toChartData(record: Record<string, number>) {
  return Object.entries(record).map(([name, value]) => ({ name, value }))
}

export default function Analytics() {
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-blue-600" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Disaster Analytics & Incident Intel
            </h1>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Temporal emergency trends, triage priority clustering, category distribution, and resource mobilization performance.
          </p>
        </div>

        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300 mono">
          {totalIncidents.toLocaleString()} Incident Points Analyzed
        </span>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mono">Incident Load</div>
          <div className="mt-1 text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">
            {totalIncidents.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400">Aggregated submissions</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="text-[11px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400 mono flex items-center gap-1">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>RED Priority Ratio</span>
          </div>
          <div className="mt-1 text-2xl font-bold font-mono text-red-600 dark:text-red-400">
            {totalIncidents > 0 ? Math.round((redCount / totalIncidents) * 100) : 0}%
          </div>
          <div className="text-[11px] text-slate-400">{redCount} critical distress calls</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mono flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Resolution Rate</span>
          </div>
          <div className="mt-1 text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
            {resolvedPct}%
          </div>
          <div className="text-[11px] text-slate-400">{resolvedCount} cases closed</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 mono flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            <span>Mean Response Delta</span>
          </div>
          <div className="mt-1 text-2xl font-bold font-mono text-blue-600 dark:text-blue-400">
            14.2m
          </div>
          <div className="text-[11px] text-slate-400">-3.8m faster than standard SLA</div>
        </div>
      </div>

      {/* Main Charts Grid */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Incidents by Type */}
        <Card title="Incidents by Hazard Category">
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
        <Card title="Triage Priority Distribution">
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
                  label={({ name, percent }: { name?: string; percent?: number }) => `${name ?? ''} ${(((percent ?? 0) * 100)).toFixed(0)}%`}
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
        <Card title="Incident Mitigation Status">
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
                  label={({ name, percent }: { name?: string; percent?: number }) => `${(name ?? '').replace('_', ' ')} ${(((percent ?? 0) * 100)).toFixed(0)}%`}
                >
                  {byStatus.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={
                        entry.name === 'pending'
                          ? '#f59e0b'
                          : entry.name === 'in_progress'
                          ? '#3b82f6'
                          : '#10b981'
                      }
                    />
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

        {/* Temporal Trends */}
        <Card title="Incident Submissions Over Time (Temporal Stream)">
          <div className="h-64 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.byTime} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="countGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="time" fontSize={11} tickLine={false} />
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
                <Area type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2.5} fill="url(#countGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  )
}
