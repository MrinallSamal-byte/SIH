import { useCallback, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Users,
  Search,
  Phone,
  Shield,
  CheckCircle2,
  Clock,
  Flame,
  Truck,
  HeartPulse,
  Compass
} from 'lucide-react'
import { listVolunteers, updateVolunteer } from '../../api/endpoints'
import { Select } from '../../components/common/Input'
import Badge from '../../components/common/Badge'
import Loader from '../../components/common/Loader'
import { useRealtime } from '../../hooks/useRealtime'
import { useToast } from '../../components/common/Toast'
import type { Volunteer } from '../../types'

const SKILL_ICONS: Record<string, typeof HeartPulse> = {
  medical: HeartPulse,
  search_rescue: Compass,
  driving: Truck,
  logistics: Shield,
  firefighting: Flame,
}

export default function Volunteers() {
  const { toast } = useToast()
  const fetchVolunteers = useCallback(() => listVolunteers(), [])
  const volunteers = useRealtime<Volunteer[]>(fetchVolunteers, 5000)

  const [search, setSearch] = useState('')
  const [skillFilter, setSkillFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const update = async (id: string, patch: Partial<Volunteer>) => {
    try {
      await updateVolunteer(id, patch)
      toast(`Volunteer duty status updated to: ${patch.status?.toUpperCase()}`, 'success')
    } catch {
      toast('Failed to update volunteer', 'error')
    }
  }

  const filtered = useMemo(() => {
    if (!volunteers) return []
    return volunteers.filter((v) => {
      if (statusFilter !== 'all' && v.status !== statusFilter) return false
      if (skillFilter !== 'all' && !v.skills.includes(skillFilter)) return false
      if (search.trim()) {
        const q = search.toLowerCase().trim()
        const matchName = (v.name || '').toLowerCase().includes(q)
        const matchPhone = (v.phone || '').includes(q)
        const matchSkills = v.skills.some((s) => s.toLowerCase().includes(q))
        if (!matchName && !matchPhone && !matchSkills) return false
      }
      return true
    })
  }, [volunteers, statusFilter, skillFilter, search])

  if (!volunteers) return <Loader />

  const totalCount = volunteers.length
  const availableCount = volunteers.filter((v) => v.status === 'available').length
  const onDutyCount = volunteers.filter((v) => v.status === 'on_duty').length
  const offlineCount = volunteers.filter((v) => v.status === 'offline').length

  const allSkills = Array.from(new Set(volunteers.flatMap((v) => v.skills)))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Users className="h-6 w-6 text-slate-900 dark:text-slate-100" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Volunteer Force & Field Dispatch
            </h1>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Realtime roster of registered responders, certified skills, proximity deployment, and duty status.
          </p>
        </div>

        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300 mono">
          {totalCount} Total Responders
        </span>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mono">Total Force</div>
          <div className="mt-1 text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">{totalCount}</div>
          <div className="text-[11px] text-slate-400">Registered personnel</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mono flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Available Now</span>
          </div>
          <div className="mt-1 text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">{availableCount}</div>
          <div className="text-[11px] text-slate-400">Ready for instant dispatch</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 mono flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            <span>On Active Duty</span>
          </div>
          <div className="mt-1 text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">{onDutyCount}</div>
          <div className="text-[11px] text-slate-400">Currently executing missions</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mono">Standby / Off-Duty</div>
          <div className="mt-1 text-2xl font-bold font-mono text-slate-600 dark:text-slate-400">{offlineCount}</div>
          <div className="text-[11px] text-slate-400">Rest cycle active</div>
        </div>
      </div>

      {/* Search & Skill Filter Toolbar */}
      <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search volunteers by name, phone, or skill set…"
              className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3.5 py-2 text-xs text-slate-900 outline-none focus:border-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {(['all', 'available', 'on_duty', 'offline'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold capitalize transition cursor-pointer ${
                  statusFilter === st
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                }`}
              >
                {st.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Skill Filter Chips */}
        <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-3 dark:border-slate-800">
          <span className="text-[11px] font-bold text-slate-400 mono mr-1 uppercase">Filter Skill:</span>
          <button
            type="button"
            onClick={() => setSkillFilter('all')}
            className={`rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
              skillFilter === 'all'
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            All Skills
          </button>
          {allSkills.map((s) => {
            const Icon = SKILL_ICONS[s] || Shield
            return (
              <button
                key={s}
                type="button"
                onClick={() => setSkillFilter(s)}
                className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
                  skillFilter === s
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                <Icon className="h-3 w-3" />
                <span>{s.replace('_', ' ').toUpperCase()}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Volunteer Grid */}
      <div className="grid gap-3.5 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((v) => {
          const initials = v.name
            .split(' ')
            .map((n) => n[0])
            .slice(0, 2)
            .join('')
            .toUpperCase()

          return (
            <div
              key={v.id}
              className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white font-bold font-mono text-sm dark:bg-slate-100 dark:text-slate-900 shadow-2xs">
                      {initials || 'VO'}
                    </div>
                    <div>
                      <div className="font-bold text-sm text-slate-900 dark:text-slate-100">{v.name}</div>
                      {v.phone && (
                        <a
                          href={`tel:${v.phone}`}
                          className="text-xs text-slate-500 hover:text-emerald-600 dark:text-slate-400 flex items-center gap-1 mt-0.5"
                        >
                          <Phone className="h-3 w-3" />
                          <span className="font-mono">{v.phone}</span>
                        </a>
                      )}
                    </div>
                  </div>

                  <Badge value={v.status} />
                </div>

                {/* Registered Skills */}
                <div className="mt-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mono">
                    Certified Skills:
                  </span>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {v.skills.map((s) => {
                      const Icon = SKILL_ICONS[s] || Shield
                      return (
                        <span
                          key={s}
                          className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-800 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 mono uppercase"
                        >
                          <Icon className="h-2.5 w-2.5" />
                          <span>{s.replace('_', ' ')}</span>
                        </span>
                      )
                    })}
                    {v.skills.length === 0 && (
                      <span className="text-xs text-slate-400">General First Responder</span>
                    )}
                  </div>
                </div>

                {/* Assigned Active Mission */}
                {v.assignedReportId && (
                  <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50/70 p-2 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200 flex items-center justify-between">
                    <span>Task ID: <strong className="font-mono">{v.assignedReportId}</strong></span>
                    <Link to="/admin/reports" className="underline font-bold">Inspect</Link>
                  </div>
                )}
              </div>

              {/* Status Selector & Call Button */}
              <div className="mt-5 flex items-center justify-between gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                <div className="flex-1">
                  <Select
                    value={v.status}
                    onChange={(e) => update(v.id, { status: e.target.value as Volunteer['status'] })}
                    className="w-full py-1 text-xs font-bold"
                  >
                    <option value="available">Mark Available</option>
                    <option value="on_duty">Mark On Duty</option>
                    <option value="offline">Mark Offline</option>
                  </Select>
                </div>

                {v.phone && (
                  <a
                    href={`tel:${v.phone}`}
                    className="inline-flex items-center gap-1 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300 transition"
                  >
                    <Phone className="h-3.5 w-3.5" />
                    <span>Call</span>
                  </a>
                )}
              </div>
            </div>
          )
        })}

        {filtered.length === 0 && (
          <div className="col-span-full rounded-2xl border border-dashed border-slate-300 p-12 text-center text-xs text-slate-400 dark:border-slate-800">
            No volunteers matched your search query or skill filter.
          </div>
        )}
      </div>
    </div>
  )
}
