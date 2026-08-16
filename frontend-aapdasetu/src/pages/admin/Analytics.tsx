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
import { getAnalytics } from '../../api/endpoints'
import Card from '../../components/common/Card'
import Loader from '../../components/common/Loader'
import { useRealtime } from '../../hooks/useRealtime'
import type { AnalyticsData } from '../../types'

const PRIORITY_COLORS: Record<string, string> = { RED: '#dc2626', YELLOW: '#f59e0b', GREEN: '#10b981' }

function toChartData(record: Record<string, number>) {
  return Object.entries(record).map(([name, value]) => ({ name, value }))
}

export default function Analytics() {
  const fetchAnalytics = useCallback(() => getAnalytics(), [])
  const data = useRealtime<AnalyticsData>(fetchAnalytics, 15000)

  if (!data) return <Loader />

  const byType = toChartData(data.byType)
  const byPriority = toChartData(data.byPriority)
  const byStatus = toChartData(data.byStatus)

  return (
    <div>
      <h1 className="text-2xl font-bold">Crisis analytics</h1>
      <p className="mt-1 text-sm text-slate-500">Incident trends, priority distribution, and response timelines.</p>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <Card title="Incidents by type">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byType}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={11} />
                <YAxis allowDecimals={false} fontSize={11} />
                <Tooltip />
                <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Priority distribution">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={byPriority} dataKey="value" nameKey="name" outerRadius={80} label>
                  {byPriority.map((entry) => (
                    <Cell key={entry.name} fill={PRIORITY_COLORS[entry.name] ?? '#94a3b8'} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Response status">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={byStatus} dataKey="value" nameKey="name" outerRadius={80} label>
                  {byStatus.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={entry.name === 'pending' ? '#f59e0b' : entry.name === 'in_progress' ? '#3b82f6' : '#10b981'}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Reports over time">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.byTime}>
                <defs>
                  <linearGradient id="countGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" fontSize={11} />
                <YAxis allowDecimals={false} fontSize={11} />
                <Tooltip />
                <Area type="monotone" dataKey="count" stroke="#3b82f6" fill="url(#countGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  )
}
