import { useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  Siren,
  FileText,
  Building,
  Users,
  Clock,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Megaphone,
  Radio,
  CheckCircle2
} from 'lucide-react'
import { getOverviewKPIs, listReports, updateReport } from '../../api/endpoints'
import PriorityBadge from '../../components/common/PriorityBadge'
import Loader from '../../components/common/Loader'
import { useRealtime } from '../../hooks/useRealtime'
import { useToast } from '../../components/common/Toast'
import { timeAgo } from '../../lib/helpers'
import type { OverviewKPIs, Report } from '../../types'

export default function Overview() {
  const { toast } = useToast()
  const fetchKpis = useCallback(() => getOverviewKPIs(), [])
  const kpis = useRealtime<OverviewKPIs>(fetchKpis, 6000)

  const fetchRecentPending = useCallback(() => listReports({ status: 'pending' }), [])
  const pendingReports = useRealtime<Report[]>(fetchRecentPending, 5000)

  const handleAcknowledge = async (id: string) => {
    try {
      await updateReport(id, { status: 'in_progress' })
      toast('Incident acknowledged and moved to triage queue.', 'success')
    } catch {
      toast('Failed to acknowledge report', 'error')
    }
  }

  if (!kpis) return <Loader />

  const cards = [
    {
      label: 'Active RED Alerts',
      value: kpis.activeRedAlerts,
      color: 'text-red-600 dark:text-red-400',
      bg: 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900/50',
      icon: Siren,
      to: '/admin/live-sos',
      desc: 'Critical distress cases requiring immediate unit dispatch',
    },
    {
      label: 'Total Incident Reports',
      value: kpis.totalReports.toLocaleString(),
      color: 'text-slate-900 dark:text-slate-100',
      bg: 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800',
      icon: FileText,
      to: '/admin/reports',
      desc: 'Total geotagged incidents across disaster sectors',
    },
    {
      label: 'Open Relief Shelters',
      value: kpis.openShelters,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/50',
      icon: Building,
      to: '/admin/shelters',
      desc: 'Relief camps currently admitting displaced citizens',
    },
    {
      label: 'Volunteer Force Ready',
      value: kpis.availableVolunteers,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900/50',
      icon: Users,
      to: '/admin/volunteers',
      desc: 'Trained first-aid & rescue volunteers available',
    },
    {
      label: 'Avg Response Time',
      value: `${kpis.avgResponseTimeMins}m`,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/50',
      icon: Clock,
      to: '/admin/analytics',
      desc: 'Time from distress SOS trigger to first unit arrival',
    },
    {
      label: 'Pending Resolution',
      value: kpis.openCases,
      color: 'text-purple-600 dark:text-purple-400',
      bg: 'bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-900/50',
      icon: AlertTriangle,
      to: '/admin/reports',
      desc: 'Open cases being actively mitigated by field teams',
    },
  ]

  const quickActions = [
    {
      title: 'Live SOS Stream',
      desc: 'Realtime distress beacon queue with audio sirens & directions',
      to: '/admin/live-sos',
      icon: Siren,
      badge: `${kpis.activeRedAlerts} Active`,
      accent: 'border-red-300 hover:border-red-500 bg-red-50/50 dark:bg-red-950/20 text-red-700 dark:text-red-300',
    },
    {
      title: 'Incident Triage & Dispatch',
      desc: 'Assign nearest volunteers and multi-agency units by proximity',
      to: '/admin/reports',
      icon: FileText,
      badge: 'Proximity Match',
      accent: 'border-blue-300 hover:border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300',
    },
    {
      title: 'Damage Claims & AI Vision',
      desc: 'Review ResNet-50 graded structural damage compensation claims',
      to: '/admin/damage',
      icon: ShieldCheck,
      badge: 'SDRF Grants',
      accent: 'border-emerald-300 hover:border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300',
    },
    {
      title: 'Emergency Broadcaster',
      desc: 'Push multi-channel alerts across SMS, WhatsApp & web ticker',
      to: '/admin/alerts',
      icon: Megaphone,
      badge: 'Multi-Channel',
      accent: 'border-amber-300 hover:border-amber-500 bg-amber-50/50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Radio className="h-6 w-6 text-red-600 animate-pulse" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Disaster Command Center & Live Gauge
            </h1>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Realtime situational awareness, multi-agency response telemetry, and tactical resource allocation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 shadow-2xs">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>NDRF Telemetry Synchronized</span>
          </span>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {cards.map((c) => {
          const Icon = c.icon
          return (
            <Link
              key={c.label}
              to={c.to}
              className={`rounded-2xl border p-4 shadow-xs transition hover:shadow-md hover:scale-[1.02] flex flex-col justify-between ${c.bg}`}
            >
              <div className="flex items-center justify-between">
                <Icon className={`h-4 w-4 ${c.color}`} />
                <span className="text-[10px] text-slate-400 font-bold uppercase mono">Live</span>
              </div>
              <div className="my-2">
                <div className={`text-2xl sm:text-3xl font-extrabold font-mono tracking-tight ${c.color}`}>
                  {c.value}
                </div>
                <div className="text-[11px] font-bold text-slate-700 dark:text-slate-200 leading-snug">
                  {c.label}
                </div>
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2">
                {c.desc}
              </div>
            </Link>
          )
        })}
      </div>

      {/* Operational Dial & Response Pulse Section */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Crisis Dial Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider mono">
                Crisis Severity Gauge
              </h2>
              <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded-full ${
                kpis.crisisScore >= 80 ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300' :
                kpis.crisisScore >= 50 ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
              }`}>
                {kpis.crisisScore >= 80 ? 'CRITICAL LEVEL' : kpis.crisisScore >= 50 ? 'ELEVATED RISK' : 'STABLE RISK'}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Composite index computed from active RED alerts, pending rescue requests, and flood water levels.
            </p>
          </div>

          <div className="my-4 flex items-center justify-center gap-6">
            <div className="relative flex h-36 w-36 items-center justify-center rounded-full border-4 border-slate-100 dark:border-slate-800 shadow-inner">
              <div
                className="absolute inset-0 rounded-full transition-all duration-1000"
                style={{
                  background: `conic-gradient(${
                    kpis.crisisScore >= 80 ? '#dc2626' : kpis.crisisScore >= 50 ? '#f59e0b' : '#10b981'
                  } ${kpis.crisisScore * 3.6}deg, transparent 0deg)`,
                }}
              />
              <div className="flex flex-col items-center justify-center rounded-full bg-white h-28 w-28 text-center dark:bg-slate-900 shadow-md">
                <span className="text-3xl font-black font-mono text-slate-900 dark:text-slate-100">
                  {kpis.crisisScore}
                </span>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mono">/ 100 PTS</span>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-red-600" />
                <span className="font-medium text-slate-700 dark:text-slate-300">RED: &gt;80 Critical</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                <span className="font-medium text-slate-700 dark:text-slate-300">YELLOW: 50-80 Alert</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <span className="font-medium text-slate-700 dark:text-slate-300">GREEN: &lt;50 Normal</span>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-3 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
            Updated live every 6s via National Incident Command telemetry.
          </div>
        </div>

        {/* Live Response Pulse */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider mono">
              Response Readiness Pulse
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Real-time resource deployment vs active incident load.
            </p>
          </div>

          <div className="space-y-4 my-2 text-xs">
            <Bar
              label="Incidents Handled & Mobilized"
              value={kpis.totalReports - kpis.openCases}
              max={Math.max(kpis.totalReports, 1)}
              color="bg-emerald-600"
            />
            <Bar
              label="Open / Pending Triage"
              value={kpis.openCases}
              max={Math.max(kpis.totalReports, 1)}
              color="bg-blue-600"
            />
            <Bar
              label="Critical RED Distress Active"
              value={kpis.activeRedAlerts}
              max={Math.max(kpis.totalReports, 1)}
              color="bg-red-600"
            />
            <Bar
              label="Shelter Beds Available"
              value={Math.round(kpis.openShelters * 240)}
              max={Math.max(kpis.openShelters * 350, 1000)}
              color="bg-purple-600"
            />
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800 text-[11px]">
            <span className="text-slate-500">Volunteers: <strong className="text-slate-800 dark:text-slate-200">{kpis.availableVolunteers} Ready</strong></span>
            <Link to="/admin/analytics" className="font-bold text-slate-900 dark:text-slate-100 hover:underline inline-flex items-center gap-1">
              <span>View Full Intel</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* Quick Dispatch Hub */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider mono">
              Command Quick Launch
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Instant operations shortcuts for emergency controllers.
            </p>
          </div>

          <div className="space-y-2 my-2">
            {quickActions.map((act) => {
              const Icon = act.icon
              return (
                <Link
                  key={act.title}
                  to={act.to}
                  className={`flex items-center justify-between rounded-xl border p-2.5 transition hover:scale-[1.01] ${act.accent}`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="h-4 w-4 shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-none">
                        {act.title}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                        {act.desc}
                      </div>
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full bg-white dark:bg-slate-900 px-2 py-0.5 text-[9px] font-bold shadow-2xs mono">
                    {act.badge}
                  </span>
                </Link>
              )
            })}
          </div>

          <div className="border-t border-slate-100 pt-3 dark:border-slate-800 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Official Helpline: <strong>112</strong></span>
            <span>SDRF Command: <strong>1070</strong></span>
          </div>
        </div>
      </div>

      {/* Live Pending SOS Stream Table */}
      {pendingReports && pendingReports.length > 0 && (
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Siren className="h-4.5 w-4.5 text-red-600 animate-pulse" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider mono">
                Pending SOS Distress Stream ({pendingReports.length} Unassigned Incidents)
              </h2>
            </div>
            <Link
              to="/admin/live-sos"
              className="inline-flex items-center gap-1 text-xs font-bold text-red-600 hover:underline dark:text-red-400"
            >
              <span>Open Tactical Stream Map</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="space-y-2">
            {pendingReports.slice(0, 5).map((r) => (
              <div
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-950 transition hover:bg-slate-100/70 dark:hover:bg-slate-900"
              >
                <div className="flex flex-wrap items-center gap-2.5">
                  <PriorityBadge label={r.priorityLabel} />
                  <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">{r.trackingId}</span>
                  <span className="text-xs font-bold capitalize text-slate-700 dark:text-slate-300">{r.type} Emergency</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-xs sm:max-w-md">{r.description}</span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400 mono">{timeAgo(r.createdAt)}</span>
                  <button
                    type="button"
                    onClick={() => handleAcknowledge(r.id)}
                    className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white cursor-pointer"
                  >
                    <CheckCircle2 className="h-3 w-3" />
                    <span>Acknowledge</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function Bar({ label, value, max, color = 'bg-slate-900' }: { label: string; value: number; max: number; color?: string }) {
  const pct = Math.min(100, Math.max(0, Math.round((value / max) * 100)))
  return (
    <div>
      <div className="flex justify-between text-xs text-slate-600 dark:text-slate-300 font-medium mb-1">
        <span>{label}</span>
        <span className="font-mono font-bold">{value.toLocaleString()} ({pct}%)</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
