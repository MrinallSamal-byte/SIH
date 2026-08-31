import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  FileText,
  Search,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Download,
  X
} from 'lucide-react'
import { listAgencies, listReports, listVolunteers, updateReport, unassignReport, resetMockDatabase } from '../../api/endpoints'
import { config } from '../../config'
import { emitRealtimeUpdate } from '../../lib/realtimeEventBus'
import { downloadCsv } from '../../lib/csv'
import { Field, Input, Select } from '../../components/common/Input'
import Button from '../../components/common/Button'
import Modal from '../../components/common/Modal'
import PriorityBadge from '../../components/common/PriorityBadge'
import Badge from '../../components/common/Badge'
import Loader from '../../components/common/Loader'
import { useRealtime } from '../../hooks/useRealtime'
import { useToast } from '../../components/common/Toast'
import { formatDateTime, haversineKm } from '../../lib/helpers'
import { useLanguage } from '../../lib/i18n'
import type { Agency, Report, Volunteer } from '../../types'

interface DispatchDraft {
  volunteerId: string
  agencyId: string
  status: Report['status']
  notes: string
}

interface ReportsPage {
  items: Report[]
  total: number
}

function truncateForCsv(value: string | undefined, max: number): string {
  if (!value) return ''
  return value.length > max ? `${value.slice(0, max - 1)}…` : value
}

export default function Reports() {
  const { t } = useLanguage()
  const { toast } = useToast()

  const statusLabel = useCallback(
    (status: string) =>
      status === 'pending'
        ? t('rp.filterPending', 'Pending Triage')
        : status === 'in_progress'
          ? t('rp.filterInProgress', 'In Progress')
          : t('rp.filterResolved', 'Resolved'),
    [t],
  )

  const [statusFilter, setStatusFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Report | null>(null)
  const [volunteers, setVolunteers] = useState<Volunteer[]>([])
  const [agencies, setAgencies] = useState<Agency[]>([])
  const [saving, setSaving] = useState(false)
  const [page, setPage] = useState(1)
  const pageSize = 20
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkRunning, setBulkRunning] = useState(false)
  const selectAllRef = useRef<HTMLInputElement | null>(null)

  const [draft, setDraft] = useState<DispatchDraft>({
    volunteerId: '',
    agencyId: '',
    status: 'in_progress',
    notes: '',
  })

  // Hook into real-time updates for reports (server-side pagination)
  const fetchReports = useCallback(() => {
    return listReports({
      status: statusFilter || undefined,
      priority: priorityFilter || undefined,
      type: typeFilter || undefined,
      q: query || undefined,
      page,
      pageSize,
    })
  }, [statusFilter, priorityFilter, typeFilter, query, page])

  const reportsPage = useRealtime<ReportsPage>(fetchReports, 4000)
  const reports = useMemo(() => reportsPage?.items ?? [], [reportsPage])

  // Refetch roster each time the dispatch modal opens so fresh availability
  // (and the current assignee, even if filtered out) is shown.
  useEffect(() => {
    if (!selected) return
    listVolunteers('available').then(setVolunteers)
    listAgencies().then(setAgencies)
  }, [selected])

  useEffect(() => {
    setPage(1)
    setSelectedIds(new Set())
  }, [statusFilter, priorityFilter, typeFilter, query])

  useEffect(() => {
    if (selected) {
      setDraft({
        volunteerId: selected.assignedVolunteerId || '',
        agencyId: selected.assignedAgencyId || '',
        status: selected.status,
        notes: selected.resolutionNotes || '',
      })
    }
  }, [selected])

  // Ranked volunteers by proximity and skill matching
  const rankedVolunteers = useMemo(() => {
    if (!selected) return volunteers
    return [...volunteers].sort((a, b) => {
      const aSkills = Array.isArray(a.skills) ? a.skills : []
      const bSkills = Array.isArray(b.skills) ? b.skills : []
      const aSkill = aSkills.includes(selected.type) ? 1 : 0
      const bSkill = bSkills.includes(selected.type) ? 1 : 0
      if (aSkill !== bSkill) return bSkill - aSkill

      if (selected.latitude && selected.longitude && a.latitude && a.longitude && b.latitude && b.longitude) {
        const distA = haversineKm({ lat: selected.latitude, lng: selected.longitude }, { lat: a.latitude, lng: a.longitude })
        const distB = haversineKm({ lat: selected.latitude, lng: selected.longitude }, { lat: b.latitude, lng: b.longitude })
        return distA - distB
      }
      return 0
    })
  }, [volunteers, selected])

  const executeDispatch = async (overrideStatus?: Report['status']) => {
    if (!selected) return
    setSaving(true)
    try {
      // Clearing a select means unassign on the server — the /assign route
      // only ever sets, never clears.
      if (!draft.volunteerId && selected.assignedVolunteerId) {
        await unassignReport(selected.id, 'volunteer')
      }
      if (!draft.agencyId && selected.assignedAgencyId) {
        await unassignReport(selected.id, 'agency')
      }
      await updateReport(selected.id, {
        assignedVolunteerId: draft.volunteerId || undefined,
        assignedAgencyId: draft.agencyId || undefined,
        status: overrideStatus || draft.status,
        resolutionNotes: draft.notes || undefined,
      })
      toast(t('rp.dispatchUpdated'), 'success')
      emitRealtimeUpdate('report_updated', selected.id)
      setSelected(null)
    } catch (err) {
      toast(err instanceof Error ? err.message : t('rp.dispatchFailed'), 'error')
    } finally {
      setSaving(false)
    }
  }

  // Server pagination — the backend owns the slice; total drives chip + bar.
  const totalCount = reportsPage?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

  const gotoPage = (next: number) => {
    setPage(Math.min(totalPages, Math.max(1, next)))
    emitRealtimeUpdate('report_updated')
  }

  // Inject the current assignee as a synthetic option so clearing vs keeping
  // is visible even when the roster fetch filters them out.
  const volunteerOptions = useMemo(() => {
    if (!selected?.assignedVolunteerId || volunteers.some((v) => v.id === selected.assignedVolunteerId)) {
      return rankedVolunteers
    }
    const current: Volunteer = {
      id: selected.assignedVolunteerId,
      name: `${selected.assignedVolunteerName ?? t('rp.currentAssignee', 'Current assignee')} (${t('rp.current', 'current')})`,
      skills: [],
      status: 'on_duty',
    }
    return [current, ...rankedVolunteers]
  }, [rankedVolunteers, selected, t])

  const agencyOptions = useMemo(() => {
    if (!selected?.assignedAgencyId || agencies.some((a) => a.id === selected.assignedAgencyId)) {
      return agencies
    }
    const current: Agency = {
      id: selected.assignedAgencyId,
      name: `${selected.assignedAgencyName ?? 'Current agency'} (${t('rp.current', 'current')})`,
      type: 'assigned',
    }
    return [current, ...agencies]
  }, [agencies, selected, t])

  const toggleRowSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const allPageSelected =
    reports.length > 0 && reports.every((r) => selectedIds.has(r.id))

  const toggleAllOnPage = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (allPageSelected) {
        reports.forEach((r) => next.delete(r.id))
      } else {
        reports.forEach((r) => next.add(r.id))
      }
      return next
    })
  }

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate =
        selectedIds.size > 0 && !allPageSelected && reports.some((r) => selectedIds.has(r.id))
    }
  }, [selectedIds, allPageSelected, reports])

  const runBulkStatusUpdate = async (status: Report['status']) => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0 || bulkRunning) return
    setBulkRunning(true)
    try {
      const results = await Promise.allSettled(ids.map((id) => updateReport(id, { status })))
      const succeeded = results.filter((res) => res.status === 'fulfilled').length
      const failed = results.length - succeeded
      if (failed > 0) {
        toast(
          `${succeeded} ${t('rp.bulkUpdated', 'incident(s) updated')} · ${failed} ${t('rp.bulkFailed', 'failed')}`,
          succeeded > 0 ? 'info' : 'error',
        )
      } else {
        toast(`${succeeded} ${t('rp.bulkUpdated', 'incident(s) updated')}`, 'success')
      }
      setSelectedIds(new Set())
      emitRealtimeUpdate('report_updated')
    } finally {
      setBulkRunning(false)
    }
  }

  const exportFilteredCsv = () => {
    if (!reports || reports.length === 0) return
    const stamp = new Date().toISOString().slice(0, 10)
    downloadCsv(`aapdasetu-reports-${stamp}.csv`, reports.map((r) => ({
      trackingId: r.trackingId,
      createdAt: formatDateTime(r.createdAt),
      type: r.type,
      priority: r.priorityLabel,
      priorityScore: r.priorityScore,
      status: r.status,
      reporter: r.reporterName ?? '',
      phone: r.reporterPhone ?? '',
      landmark:
        r.landmark ??
        (typeof r.latitude === 'number' && typeof r.longitude === 'number'
          ? `${r.latitude.toFixed(5)}, ${r.longitude.toFixed(5)}`
          : ''),
      assignedUnits: [r.assignedVolunteerName, r.assignedAgencyName].filter(Boolean).join('; '),
      description: truncateForCsv(r.description, 120),
    })))
    toast(t('rp.csvExported', 'CSV exported'), 'success')
  }

  if (!reportsPage) return <Loader />

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="h-6 w-6 text-slate-900 dark:text-slate-100" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {t('rp.title')}
            </h1>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300 mono">
              {totalCount.toLocaleString()} {t('rp.totalRecords')}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {t('rp.subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={exportFilteredCsv}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-white/[0.1] dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            <span>{t('rp.exportCsv', 'Export CSV')}</span>
          </button>
          {config.useMockOnly && (
            <button
              type="button"
              onClick={async () => {
                if (window.confirm(t('rp.resetConfirm'))) {
                  await resetMockDatabase()
                  toast(t('rp.dbReset'), 'success')
                }
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-white/[0.1] dark:bg-slate-800 dark:text-slate-200"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>{t('rp.resetRecords')} (demo data)</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:grid-cols-4">
        <Field label={t('rp.emergencyType')}>
          <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="">{t('rp.allEmergencyTypes')}</option>
            <option value="flood">{t('rp.typeFlood')}</option>
            <option value="medical">{t('rp.typeMedical')}</option>
            <option value="fire">{t('rp.typeFire')}</option>
            <option value="earthquake">{t('rp.typeEarthquake')}</option>
            <option value="accident">{t('rp.typeAccident')}</option>
            <option value="missing_person">{t('rp.typeMissing')}</option>
            <option value="other">{t('rp.typeOther')}</option>
          </Select>
        </Field>

        <Field label={t('rp.statusLabel')}>
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">{t('rp.allStatuses')}</option>
            <option value="pending">{t('rp.filterPending')}</option>
            <option value="in_progress">{t('rp.filterInProgress')}</option>
            <option value="resolved">{t('rp.filterResolved')}</option>
          </Select>
        </Field>

        <Field label={t('rp.priorityTier')}>
          <Select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
            <option value="">{t('rp.allPriorities')}</option>
            <option value="RED">{t('rp.priorityRed')}</option>
            <option value="YELLOW">{t('rp.priorityYellow')}</option>
            <option value="GREEN">{t('rp.priorityGreen')}</option>
          </Select>
        </Field>

        <Field label={t('rp.searchQuery')}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('rp.searchPlaceholder')}
              data-shortcut="search"
              className="w-full rounded-xl border border-slate-300 bg-white pl-8 pr-3 py-2 text-xs text-slate-900 outline-none focus:border-slate-900 dark:border-white/[0.1] dark:bg-slate-950 dark:text-slate-100"
            />
          </div>
        </Field>
      </div>

      {/* Incident Reports Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-slate-50 dark:bg-slate-800 text-xs uppercase text-slate-500 dark:text-slate-400 mono font-bold">
            <tr>
              <th className="w-10 px-4 py-3">
                <input
                  ref={selectAllRef}
                  type="checkbox"
                  checked={allPageSelected}
                  onChange={toggleAllOnPage}
                  aria-label={t('rp.selectAllPage', 'Select all on page')}
                  title={t('rp.selectAllPage', 'Select all on page')}
                  className="h-4 w-4 cursor-pointer accent-slate-900 dark:accent-slate-100"
                />
              </th>
              <th className="px-4 py-3">{t('rp.thTrackingId')}</th>
              <th className="px-4 py-3">{t('rp.thType')}</th>
              <th className="px-4 py-3">{t('rp.thPriorityScore')}</th>
              <th className="px-4 py-3">{t('rp.thStatus')}</th>
              <th className="px-4 py-3">{t('rp.thLocation')}</th>
              <th className="px-4 py-3">{t('rp.thReporter')}</th>
              <th className="px-4 py-3">{t('rp.thAssignedUnits')}</th>
              <th className="px-4 py-3">{t('rp.thReported')}</th>
              <th className="px-4 py-3 text-right">{t('rp.thDispatch')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {reports.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition">
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(r.id)}
                    onChange={() => toggleRowSelected(r.id)}
                    onClick={(e) => e.stopPropagation()}
                    aria-label={`${t('rp.selectRow', 'Select')} ${r.trackingId}`}
                    className="h-4 w-4 cursor-pointer accent-slate-900 dark:accent-slate-100"
                  />
                </td>
                <td className="px-4 py-3 font-mono text-xs font-bold text-slate-900 dark:text-slate-100">
                  <div className="flex items-center gap-1.5">
                    {r.source === 'sos' && <span className="h-2 w-2 rounded-full bg-red-600 animate-pulse" />}
                    <span>{r.trackingId}</span>
                  </div>
                </td>
                <td className="px-4 py-3 capitalize font-bold text-xs text-slate-800 dark:text-slate-200">
                  {r.type.replace('_', ' ')}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <PriorityBadge label={r.priorityLabel} />
                    <span className="mono text-xs font-bold text-slate-600 dark:text-slate-400">
                      {r.priorityScore}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3"><Badge value={r.status} label={statusLabel(r.status)} /></td>
                <td className="px-4 py-3 text-xs max-w-[200px] truncate text-slate-700 dark:text-slate-300">
                  {r.landmark ?? (r.latitude ? `${r.latitude.toFixed(4)}, ${r.longitude?.toFixed(4)}` : t('rp.gpsRecord'))}
                </td>
                <td className="px-4 py-3 text-xs">
                  <div className="font-semibold text-slate-800 dark:text-slate-200">{r.reporterName || t('rp.citizen')}</div>
                  <div className="mono text-[11px] text-slate-400">{r.reporterPhone || '—'}</div>
                </td>
                <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 max-w-[160px] truncate">
                  {r.assignedVolunteerName ? (
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{r.assignedVolunteerName}</span>
                  ) : r.assignedAgencyName ? (
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{r.assignedAgencyName}</span>
                  ) : (
                    <span className="text-amber-600 dark:text-amber-400 font-medium">{t('rp.unassigned')}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-[11px] text-slate-400 mono whitespace-nowrap">
                  {formatDateTime(r.createdAt)}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => setSelected(r)}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-bold text-slate-800 hover:bg-slate-100 dark:border-white/[0.1] dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
                  >
                    <span>{t('rp.dispatch')}</span>
                    <span>→</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {totalCount === 0 && (
          <div className="p-12 text-center text-sm text-slate-400">
            {t('rp.emptyTable')}
          </div>
        )}

        {/* Pagination Bar */}
        {totalCount > 0 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-xs text-slate-600 dark:border-slate-800 dark:text-slate-400">
            <div>
              {t('rp.showing')} <strong className="mono">{(page - 1) * pageSize + 1}</strong> {t('rp.to')}{' '}
              <strong className="mono">{Math.min(page * pageSize, totalCount)}</strong> {t('rp.of')}{' '}
              <strong className="mono">{totalCount.toLocaleString()}</strong> {t('rp.incidents')}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => gotoPage(page - 1)}
                disabled={page === 1}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 dark:border-white/[0.1] dark:bg-slate-800 dark:text-slate-300"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                <span>{t('rp.prev')}</span>
              </button>

              <span className="px-2 font-bold mono">
                {t('rp.page')} {page} / {totalPages}
              </span>

              <button
                type="button"
                onClick={() => gotoPage(page + 1)}
                disabled={page === totalPages}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 dark:border-white/[0.1] dark:bg-slate-800 dark:text-slate-300"
              >
                <span>{t('rp.next')}</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bulk Actions Floating Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-16 left-1/2 z-50 flex -translate-x-1/2 flex-wrap items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white/95 px-4 py-2.5 shadow-xl backdrop-blur dark:border-white/[0.1] dark:bg-slate-900/95">
          <span className="text-xs font-bold text-slate-700 mono dark:text-slate-200">
            {selectedIds.size} {t('rp.selected', 'selected')}
          </span>
          <span className="h-5 w-px bg-slate-200 dark:bg-slate-700" />
          <Button
            variant="secondary"
            size="sm"
            disabled={bulkRunning}
            onClick={() => runBulkStatusUpdate('in_progress')}
            className="font-bold whitespace-nowrap"
          >
            {t('rp.markInProgress', 'Mark In Progress')}
          </Button>
          <Button
            variant="primary"
            size="sm"
            disabled={bulkRunning}
            onClick={() => runBulkStatusUpdate('resolved')}
            className="font-bold whitespace-nowrap"
          >
            {bulkRunning ? t('rp.working', 'Working…') : t('rp.markResolved', 'Mark Resolved')}
          </Button>
          <button
            type="button"
            onClick={() => setSelectedIds(new Set())}
            disabled={bulkRunning}
            aria-label={t('rp.clearSelection', 'Clear selection')}
            title={t('rp.clearSelection', 'Clear selection')}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40 cursor-pointer dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Dispatch Modal */}
      {selected && (
        <Modal open title={t('rp.modalTitle')} onClose={() => setSelected(null)}>
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs dark:border-slate-800 dark:bg-slate-950">
              <div className="flex items-center justify-between">
                <span className="font-mono text-base font-bold text-slate-900 dark:text-slate-100">{selected.trackingId}</span>
                <PriorityBadge label={selected.priorityLabel} />
              </div>
              <p className="mt-2 text-slate-800 dark:text-slate-200 font-medium leading-relaxed">{selected.description}</p>
              <div className="mt-2 flex flex-wrap items-center gap-4 text-slate-500 border-t border-slate-200/60 pt-2 dark:border-slate-800">
                {selected.landmark && <div>{t('rp.landmarkLabel')}: <strong className="text-slate-700 dark:text-slate-300">{selected.landmark}</strong></div>}
                {selected.reporterPhone && <div>{t('rp.phoneLabel')}: <strong className="text-slate-700 dark:text-slate-300 mono">{selected.reporterPhone}</strong></div>}
                <div>{t('rp.typeLabel')}: <strong className="capitalize text-slate-700 dark:text-slate-300">{selected.type}</strong></div>
              </div>
            </div>

            <Field label={t('rp.assignVolunteer')}>
              <Select
                value={draft.volunteerId}
                onChange={(e) => setDraft((d) => ({ ...d, volunteerId: e.target.value }))}
              >
                <option value="">{t('rp.selectVolunteer')}</option>
                {volunteerOptions.map((v) => {
                  const dist = (selected.latitude && selected.longitude && v.latitude && v.longitude)
                    ? haversineKm({ lat: selected.latitude, lng: selected.longitude }, { lat: v.latitude, lng: v.longitude })
                    : null
                  return (
                    <option key={v.id} value={v.id}>
                      {v.name} {dist !== null ? `(${dist.toFixed(1)} ${t('rp.kmAway')})` : ''} — {t('rp.skills')}: {v.skills.join(', ') || t('rp.general')}
                    </option>
                  )
                })}
              </Select>
            </Field>

            <Field label={t('rp.assignAgency')}>
              <Select
                value={draft.agencyId}
                onChange={(e) => setDraft((d) => ({ ...d, agencyId: e.target.value }))}
              >
                <option value="">{t('rp.selectAgency')}</option>
                {agencyOptions.map((a) => (
                  <option key={a.id} value={a.id}>{a.name} ({a.type.toUpperCase()})</option>
                ))}
              </Select>
            </Field>

            <Field label={t('rp.updateStatus')}>
              <Select
                value={draft.status}
                onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value as Report['status'] }))}
              >
                <option value="pending">{t('rp.optPending')}</option>
                <option value="in_progress">{t('rp.optInProgress')}</option>
                <option value="resolved">{t('rp.optResolved')}</option>
              </Select>
            </Field>

            <Field label={t('rp.resolutionNotes')}>
              <Input
                value={draft.notes}
                onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
                placeholder={t('rp.notesPlaceholder')}
              />
            </Field>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
              <Button variant="secondary" onClick={() => setSelected(null)}>
                {t('rp.cancel')}
              </Button>
              <Button
                variant="primary"
                onClick={() => executeDispatch()}
                disabled={saving}
                className="font-bold"
              >
                {saving ? t('rp.saving') : t('rp.saveExecute')}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
