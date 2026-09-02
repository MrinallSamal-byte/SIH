import { useCallback, useMemo, useState } from 'react'
import { Search, Phone, Users } from 'lucide-react'
import { listVolunteers, updateVolunteer } from '../../api/endpoints'
import { Select } from '../../components/common/Input'
import Badge from '../../components/common/Badge'
import Loader from '../../components/common/Loader'
import { useRealtime } from '../../hooks/useRealtime'
import { useToast } from '../../components/common/Toast'
import { useLanguage } from '../../lib/i18n'
import { emitRealtimeUpdate } from '../../lib/realtimeEventBus'
import type { Volunteer } from '../../types'

type RosterVolunteer = Volunteer & { assignedTrackingId?: string }

const ALL_SKILLS = ['medical', 'search_rescue', 'driving', 'logistics'] as const

export default function Volunteers() {
  const { t } = useLanguage()
  const { toast } = useToast()
  const fetchVolunteers = useCallback(() => listVolunteers(), [])
  const volunteers = useRealtime<RosterVolunteer[]>(fetchVolunteers, 10000)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [skillFilter, setSkillFilter] = useState<string>('all')

  const update = async (id: string, patch: Partial<Volunteer>) => {
    try {
      await updateVolunteer(id, patch)
      emitRealtimeUpdate('volunteer_updated', id)
      toast(t('vl.volunteerUpdated'))
    } catch (err) {
      toast(err instanceof Error ? err.message : t('vl.volunteerUpdateFailed', 'Failed to update volunteer'), 'error')
    }
  }

  const filtered = useMemo(() => {
    if (!volunteers) return []
    return volunteers.filter((v) => {
      if (statusFilter !== 'all' && v.status !== statusFilter) return false
      if (skillFilter !== 'all' && !(v.skills ?? []).includes(skillFilter as typeof ALL_SKILLS[number])) return false
      if (search.trim()) {
        const q = search.toLowerCase().trim()
        const matchName = (v.name || '').toLowerCase().includes(q)
        const matchPhone = (v.phone || '').includes(q)
        if (!matchName && !matchPhone) return false
      }
      return true
    })
  }, [volunteers, statusFilter, skillFilter, search])

  if (!volunteers) return <Loader />

  const totalCount = volunteers.length
  const availableCount = volunteers.filter((v) => v.status === 'available').length
  const onDutyCount = volunteers.filter((v) => v.status === 'on_duty').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Users className="h-6 w-6 text-zinc-900 dark:text-zinc-100" />
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-slate-100">{t('vl.title')}</h1>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t('vl.skillsHint')}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-xs font-bold text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 mono shadow-2xs">
            {totalCount} {t('vl.totalRoster', 'Registered')}
          </span>
          <span className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-xs font-bold text-zinc-800 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 mono shadow-2xs flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span>{availableCount} {t('vl.statusAvailable', 'Available')}</span>
          </span>
          <span className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-xs font-bold text-zinc-800 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 mono shadow-2xs flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            <span>{onDutyCount} {t('vl.statusOnDuty', 'On Duty')}</span>
          </span>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-2xs dark:border-zinc-800 dark:bg-[#181818]">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('vl.searchPlaceholder', 'Search volunteers by name or phone...')}
            className="w-full rounded-xl border border-zinc-200 bg-white pl-10 pr-3.5 py-2 text-xs text-zinc-900 outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-slate-100"
          />
        </div>

        {/* Status & Skill Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 pt-3 dark:border-zinc-800/80">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-400 mono mr-1 uppercase">{t('vl.statusFilter', 'Status')}:</span>
            {[
              { id: 'all', label: 'All' },
              { id: 'available', label: t('vl.statusAvailable') },
              { id: 'on_duty', label: t('vl.statusOnDuty') },
              { id: 'offline', label: t('vl.statusOffline') },
            ].map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => setStatusFilter(st.id)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition cursor-pointer ${
                  statusFilter === st.id
                    ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-2xs'
                    : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-400 mono mr-1 uppercase">{t('vl.skillFilter', 'Skill')}:</span>
            <button
              type="button"
              onClick={() => setSkillFilter('all')}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition cursor-pointer ${
                skillFilter === 'all'
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-2xs'
                  : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300'
              }`}
            >
              All Skills
            </button>
            {ALL_SKILLS.map((sk) => (
              <button
                key={sk}
                type="button"
                onClick={() => setSkillFilter(sk)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition cursor-pointer ${
                  skillFilter === sk
                    ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-2xs'
                    : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300'
                }`}
              >
                {sk.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Volunteer Grid */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((v) => (
          <div
            key={v.id}
            className="flex flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xs transition hover:border-zinc-300 dark:border-zinc-800 dark:bg-[#181818] dark:hover:border-zinc-700"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-base font-bold text-zinc-900 dark:text-slate-100 truncate">{v.name}</div>
                  {v.phone ? (
                    <a
                      href={`tel:${v.phone}`}
                      className="mt-0.5 inline-flex items-center gap-1 text-xs font-mono text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200 hover:underline"
                    >
                      <Phone className="h-3 w-3" />
                      <span>{v.phone}</span>
                    </a>
                  ) : (
                    <div className="mt-0.5 text-xs text-slate-400">—</div>
                  )}
                </div>
                <Badge value={v.status} />
              </div>

              <div className="mt-3 flex flex-wrap gap-1">
                {(v.skills ?? []).map((s) => (
                  <span
                    key={s}
                    className="rounded-md bg-zinc-100 px-2 py-0.5 text-[10px] font-bold text-zinc-800 border border-zinc-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 mono uppercase"
                  >
                    {s.replace('_', ' ')}
                  </span>
                ))}
                {(!v.skills || v.skills.length === 0) && (
                  <span className="text-xs text-slate-400 dark:text-slate-500">{t('vl.noSkills')}</span>
                )}
              </div>
            </div>

            <div className="mt-4 border-t border-zinc-100 pt-3 dark:border-zinc-800/80 flex items-center justify-between gap-2">
              <Select
                value={v.status}
                onChange={(e) => update(v.id, { status: e.target.value as Volunteer['status'] })}
                className="w-auto py-1 text-xs"
              >
                <option value="available">{t('vl.statusAvailable')}</option>
                <option value="on_duty">{t('vl.statusOnDuty')}</option>
                <option value="offline">{t('vl.statusOffline')}</option>
              </Select>
              {v.assignedTrackingId && (
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mono truncate">
                  {t('vl.task')}: <strong className="text-zinc-800 dark:text-zinc-200">{v.assignedTrackingId}</strong>
                </div>
              )}
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="col-span-full rounded-2xl border border-dashed border-zinc-200 p-8 text-center text-xs text-slate-500 dark:border-zinc-800 dark:text-slate-400">
            {t('vl.noMatches', 'No volunteers match your search or filter criteria.')}
          </div>
        )}
      </div>
    </div>
  )
}
