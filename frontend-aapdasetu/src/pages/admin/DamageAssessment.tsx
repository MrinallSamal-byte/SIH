import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  FileSpreadsheet,
  XCircle,
  Search,
  RefreshCw,
  Image as ImageIcon,
  Flag
} from 'lucide-react'
import { listDamageAssessments, flagDamageAssessment, type DamageRow } from '../../api/endpoints'
import { useToast } from '../../components/common/Toast'
import { useLanguage } from '../../lib/i18n'
import { subscribeRealtimeUpdates, emitRealtimeUpdate } from '../../lib/realtimeEventBus'

const CLASSIFICATIONS: DamageRow['classification'][] = [
  'MINOR_DAMAGE',
  'MAJOR_STRUCTURAL_DAMAGE',
  'FULLY_DESTROYED',
]

function statusTone(status: string): string {
  if (status === 'approved') return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
  if (status === 'needs_review') return 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
  if (status.startsWith('flagged')) return 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400'
  return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
}

export default function DamageAssessment() {
  const { t } = useLanguage()
  const { toast } = useToast()

  const [items, setItems] = useState<DamageRow[]>([])
  const [classificationFilter, setClassificationFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedReport, setSelectedReport] = useState<DamageRow | null>(null)
  const [photoBroken, setPhotoBroken] = useState(false)

  const loadData = useCallback(async () => {
    try {
      const data = await listDamageAssessments()
      setItems(data)
    } catch {
      toast(t('dm.loadFailed'), 'error')
    }
  }, [toast, t])

  useEffect(() => {
    loadData()
    // Subscribe to 0ms realtime broadcasts from citizen uploads
    const unsub = subscribeRealtimeUpdates((event) => {
      if (event.type === 'damage_assessed' || event.type === 'damage_updated' || event.type === 'data_reset') {
        loadData()
      }
    })
    return () => unsub()
  }, [loadData])

  // Filtered dataset
  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (!item) return false
      if (classificationFilter !== 'all' && item.classification !== classificationFilter) return false
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const match =
          item.id.toLowerCase().includes(q) ||
          (item.imageHash || '').toLowerCase().includes(q) ||
          (item.classification || '').toLowerCase().includes(q) ||
          (item.status || '').toLowerCase().includes(q)
        if (!match) return false
      }
      return true
    })
  }, [items, classificationFilter, searchQuery])

  // Total KPIs
  const totalReportsCount = items.length
  const totalDestroyed = items.filter((i) => i.classification === 'FULLY_DESTROYED').length
  const totalMajor = items.filter((i) => i.classification === 'MAJOR_STRUCTURAL_DAMAGE').length
  const totalCompensationInr = items.reduce((acc, curr) => acc + curr.compensation, 0)

  const handleFlag = async (row: DamageRow) => {
    if (!window.confirm(t('dm.flagConfirm', `Flag claim ${row.id} as suspect?`))) return
    try {
      const updated = await flagDamageAssessment(row.id)
      setItems((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
      if (selectedReport?.id === row.id) setSelectedReport(updated)
      emitRealtimeUpdate('damage_updated', updated.id)
      toast(`${t('dm.statusUpdated')}: ${updated.status}`)
    } catch {
      toast(t('dm.statusUpdateFailed'), 'error')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-600 text-white shadow-md">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                {t('dm.title')}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('dm.subtitle')}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadData}
            className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-white/[0.1] dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>{t('dm.sync')}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mono">
            {t('dm.totalAssessedClaims')}
          </div>
          <div className="mt-1 text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">
            {totalReportsCount}
          </div>
          <div className="text-[11px] text-slate-400">{t('dm.claimsTableTitle')}</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mono">
            FULLY_DESTROYED
          </div>
          <div className="mt-1 text-2xl font-bold font-mono text-red-600 dark:text-red-400">
            {totalDestroyed}
          </div>
          <div className="text-[11px] text-slate-400">{t('dm.severityScale90')}</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mono">
            MAJOR_STRUCTURAL_DAMAGE
          </div>
          <div className="mt-1 text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">
            {totalMajor}
          </div>
          <div className="text-[11px] text-slate-400">{t('dm.gradeLabel')}</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mono">
            {t('dm.sdrfReliefLoss')}
          </div>
          <div className="mt-1 text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 truncate">
            ₹{totalCompensationInr.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-slate-400">{t('dm.automatedReliefMath')}</div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('dm.searchPlaceholder')}
            className="w-full rounded-xl border border-slate-300 bg-slate-50 pl-10 pr-4 py-2 text-xs font-medium text-slate-900 outline-none transition focus:border-slate-900 focus:bg-white dark:border-white/[0.1] dark:bg-slate-800 dark:text-slate-100 dark:focus:border-slate-300"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mono mr-1">
            {t('dm.gradeLabel')}
          </span>
          {[
            { id: 'all', label: t('dm.allGrades') },
            ...CLASSIFICATIONS.map((c) => ({ id: c, label: c })),
          ].map((cls) => (
            <button
              key={cls.id}
              onClick={() => setClassificationFilter(cls.id)}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-colors cursor-pointer ${
                classificationFilter === cls.id
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              {cls.label}
            </button>
          ))}
        </div>
      </div>

      {/* Submissions Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-200 px-5 py-3.5 dark:border-slate-800 flex items-center justify-between">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mono">
            {t('dm.claimsTableTitle')} ({filtered.length})
          </div>
          <span className="text-[11px] text-slate-400">{t('dm.clickRowToInspect')}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 font-bold uppercase tracking-wider text-slate-500 mono text-[10px] dark:border-slate-800 dark:bg-slate-950">
              <tr>
                <th className="px-4 py-3">{t('dm.thClaimId')}</th>
                <th className="px-4 py-3">{t('dm.thGrade')}</th>
                <th className="px-4 py-3 text-center">{t('dm.modalAiConfidence', 'Confidence')}</th>
                <th className="px-4 py-3">{t('dm.thSdrfRelief')}</th>
                <th className="px-4 py-3">{t('dm.thStatusAction')}</th>
                <th className="px-4 py-3 text-right">Flag</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {filtered.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => {
                    setSelectedReport(item)
                    setPhotoBroken(false)
                  }}
                  className={`transition-colors cursor-pointer ${
                    selectedReport?.id === item.id
                      ? 'bg-slate-100/90 dark:bg-slate-800/90'
                      : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                  }`}
                >
                  {/* Claim ID */}
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <div className="font-mono font-bold text-slate-900 dark:text-slate-100">
                      {item.id}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </td>

                  {/* Classification */}
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <span className="inline-flex rounded-md bg-slate-100 px-2 py-1 font-mono text-[10px] font-bold text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-white/[0.1]">
                      {item.classification}
                    </span>
                    {item.duplicate && (
                      <span className="ml-1.5 inline-flex rounded-md bg-amber-100 px-2 py-1 text-[10px] font-bold text-amber-700 dark:bg-amber-950/60 dark:text-amber-400">
                        duplicate
                      </span>
                    )}
                  </td>

                  {/* Confidence */}
                  <td className="px-4 py-3.5 text-center whitespace-nowrap font-mono font-bold text-slate-700 dark:text-slate-300">
                    {item.confidence === null ? '—' : `${item.confidence}%`}
                  </td>

                  {/* Compensation */}
                  <td className="px-4 py-3.5 whitespace-nowrap font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    ₹{item.compensation.toLocaleString('en-IN')}
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <span className={`inline-flex rounded-md px-2 py-1 font-mono text-[10px] font-bold ${statusTone(item.status)}`}>
                      {item.status}
                    </span>
                  </td>

                  {/* Flag action */}
                  <td className="px-4 py-3.5 whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleFlag(item)}
                      disabled={item.status.startsWith('flagged')}
                      className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold cursor-pointer transition-colors ${
                        item.status.startsWith('flagged')
                          ? 'bg-red-600 text-white'
                          : 'border border-slate-300 bg-white text-slate-700 hover:bg-red-50 hover:text-red-700 dark:border-white/[0.1] dark:bg-slate-800 dark:text-slate-300'
                      } disabled:cursor-default`}
                    >
                      <Flag className="h-3 w-3" />
                      {t('dm.btnFlag')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="p-12 text-center text-xs text-slate-400 dark:text-slate-500">
            {t('dm.noClaimsMatched')}
          </div>
        )}
      </div>

      {/* Photo Inspection Modal */}
      {selectedReport && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
          onClick={() => setSelectedReport(null)}
        >
          <div
            className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-800">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mono">
                  {t('dm.modalTelemetry')}
                </span>
                <div className="font-mono text-lg font-bold text-slate-900 dark:text-slate-100">
                  {selectedReport.id}
                </div>
              </div>
              <button
                onClick={() => setSelectedReport(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 cursor-pointer"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {/* Photo preview — falls back to a placeholder box when unavailable */}
              {selectedReport.photoUrl && !photoBroken ? (
                <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-white/[0.1] max-h-56 bg-slate-950">
                  <img
                    src={selectedReport.photoUrl}
                    alt={t('dm.photoAlt', 'Damage photo')}
                    className="w-full h-full object-cover"
                    onError={() => setPhotoBroken(true)}
                  />
                </div>
              ) : (
                <div className="flex max-h-56 min-h-32 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-slate-400 dark:border-white/[0.1] dark:bg-slate-950">
                  <ImageIcon className="h-8 w-8" />
                  <span className="text-xs font-semibold">{t('dm.photoUnavailable', 'Photo unavailable')}</span>
                </div>
              )}

              {/* Metrics Grid */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 dark:border-slate-800 dark:bg-slate-950">
                  <div className="text-[10px] uppercase font-bold text-slate-400 mono">{t('dm.modalClass')}</div>
                  <div className="mt-1 font-mono text-[11px] font-bold text-slate-900 dark:text-slate-100">
                    {selectedReport.classification}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 dark:border-slate-800 dark:bg-slate-950">
                  <div className="text-[10px] uppercase font-bold text-slate-400 mono">{t('dm.modalAiConfidence', 'Confidence')}</div>
                  <div className="font-mono text-base font-bold text-slate-900 dark:text-slate-100">
                    {selectedReport.confidence === null ? '—' : `${selectedReport.confidence}%`}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 dark:border-slate-800 dark:bg-slate-950">
                  <div className="text-[10px] uppercase font-bold text-slate-400 mono">{t('dm.modalRelief')}</div>
                  <div className="font-mono text-base font-bold text-emerald-600 dark:text-emerald-400">
                    ₹{selectedReport.compensation.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>

              {/* Details List */}
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">{t('dm.thStatusAction')}</span>
                  <span className={`rounded-md px-2 py-0.5 font-mono text-[10px] font-bold ${statusTone(selectedReport.status)}`}>
                    {selectedReport.status}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">Duplicate</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {selectedReport.duplicate ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">Image hash</span>
                  <span className="font-mono text-[11px] font-semibold text-slate-900 dark:text-slate-100 truncate max-w-[16rem]">
                    {selectedReport.imageHash || '—'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">{t('au.eventTimestamp', 'Timestamp')}</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {new Date(selectedReport.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Review action — backend only exposes flag, no approve route */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  onClick={() => handleFlag(selectedReport)}
                  className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-bold text-red-700 hover:bg-red-100 dark:border-red-900 dark:bg-red-950/60 dark:text-red-300 cursor-pointer"
                >
                  {t('dm.btnFlagInspection')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
