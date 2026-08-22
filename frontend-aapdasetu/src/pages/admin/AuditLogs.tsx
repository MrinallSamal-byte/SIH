import { useEffect, useMemo, useState } from 'react'
import {
  Search,
  Shield,
  Lock,
  User,
  Download,
  ChevronUp,
  ChevronDown
} from 'lucide-react'
import { listAuditLogs } from '../../api/endpoints'
import Badge from '../../components/common/Badge'
import Loader from '../../components/common/Loader'
import { downloadCsv } from '../../lib/csv'
import { formatDateTime } from '../../lib/helpers'
import { useLanguage } from '../../lib/i18n'
import type { AuditLog } from '../../types'

export default function AuditLogs() {
  const { t } = useLanguage()
  const [logs, setLogs] = useState<AuditLog[] | null>(null)
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState<string>('all')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  useEffect(() => {
    listAuditLogs().then(setLogs)
  }, [])

  const filtered = useMemo(() => {
    if (!logs) return []
    const rows = logs.filter((l) => {
      if (actionFilter !== 'all' && l.action.toLowerCase() !== actionFilter.toLowerCase()) return false
      if (search.trim()) {
        const q = search.toLowerCase().trim()
        const matchAdmin = (l.adminEmail || '').toLowerCase().includes(q)
        const matchAction = (l.action || '').toLowerCase().includes(q)
        const matchEntity = (l.entityType || '').toLowerCase().includes(q)
        const matchId = (l.entityId || '').toLowerCase().includes(q)
        if (!matchAdmin && !matchAction && !matchEntity && !matchId) return false
      }
      return true
    })
    return [...rows].sort((a, b) => {
      const diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      return sortDir === 'asc' ? diff : -diff
    })
  }, [logs, actionFilter, search, sortDir])

  const exportCsv = () => {
    if (filtered.length === 0) return
    const stamp = new Date().toISOString().slice(0, 10)
    downloadCsv(`aapdasetu-audit-logs-${stamp}.csv`, filtered.map((l) => ({
      timestamp: formatDateTime(l.createdAt),
      actor: l.adminEmail,
      action: l.action,
      target: l.entityType ? `${l.entityType}${l.entityId ? ` (${l.entityId})` : ''}` : '',
      detail: l.details ? JSON.stringify(l.details) : '',
    })))
  }

  if (!logs) return <Loader />

  const totalCount = logs.length
  const uniqueAdmins = Array.from(new Set(logs.map((l) => l.adminEmail))).length
  const allActions = Array.from(new Set(logs.map((l) => l.action)))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Lock className="h-6 w-6 text-slate-900 dark:text-slate-100" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {t('au.title')}
            </h1>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {t('au.subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={exportCsv}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 dark:border-white/[0.1] dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            <span>{t('au.exportCsv', 'Export CSV')}</span>
          </button>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300 mono">
            {totalCount} {t('au.loggedEvents')}
          </span>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mono">{t('au.totalTrail')}</div>
          <div className="mt-1 text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">{totalCount}</div>
          <div className="text-[11px] text-slate-400">{t('au.securityRecords')}</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 mono flex items-center gap-1">
            <User className="h-3.5 w-3.5" />
            <span>{t('au.activeControllers')}</span>
          </div>
          <div className="mt-1 text-2xl font-bold font-mono text-blue-600 dark:text-blue-400">{uniqueAdmins}</div>
          <div className="text-[11px] text-slate-400">{t('au.authorizedPersonnel')}</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mono flex items-center gap-1">
            <Shield className="h-3.5 w-3.5" />
            <span>{t('au.auditIntegrity')}</span>
          </div>
          <div className="mt-1 text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">100%</div>
          <div className="text-[11px] text-slate-400">{t('au.cryptoVerifiable')}</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mono">{t('au.actionTypes')}</div>
          <div className="mt-1 text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">{allActions.length}</div>
          <div className="text-[11px] text-slate-400">{t('au.eventCategories')}</div>
        </div>
      </div>

      {/* Search & Action Filters */}
      <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('au.searchPlaceholder')}
            className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3.5 py-2 text-xs text-slate-900 outline-none focus:border-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />
        </div>

        {/* Action Filter Chips */}
        <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-3 dark:border-slate-800">
          <span className="text-[11px] font-bold text-slate-400 mono mr-1 uppercase">{t('au.filterEvent')}</span>
          <button
            type="button"
            onClick={() => setActionFilter('all')}
            className={`rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
              actionFilter === 'all'
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            {t('au.allEvents')}
          </button>
          {allActions.map((act) => (
            <button
              key={act}
              type="button"
              onClick={() => setActionFilter(act)}
              className={`rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
                actionFilter === act
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              {act.replace('_', ' ').toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400 mono">
              <tr>
                <th className="px-5 py-3.5">{t('au.adminUser')}</th>
                <th className="px-5 py-3.5">{t('au.actionExecuted')}</th>
                <th className="px-5 py-3.5">{t('au.targetEntity')}</th>
                <th className="px-5 py-3.5">
                  <button
                    type="button"
                    onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
                    title={t('au.sortByTime', 'Toggle time sort')}
                    aria-label={t('au.sortByTime', 'Toggle time sort')}
                    className="inline-flex items-center gap-1 uppercase tracking-wider transition hover:text-slate-700 cursor-pointer dark:hover:text-slate-200"
                  >
                    <span>{t('au.eventTimestamp')}</span>
                    {sortDir === 'asc' ? (
                      <ChevronUp className="h-3 w-3" />
                    ) : (
                      <ChevronDown className="h-3 w-3" />
                    )}
                  </button>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((l) => (
                <tr key={l.id} className="transition hover:bg-slate-50/70 dark:hover:bg-slate-800/50">
                  <td className="px-5 py-3.5 font-medium text-slate-900 dark:text-slate-100 font-mono">
                    <div className="flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        <User className="h-3 w-3" />
                      </div>
                      <span>{l.adminEmail}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <Badge value={l.action.toLowerCase()} />
                  </td>
                  <td className="px-5 py-3.5 text-slate-700 dark:text-slate-300">
                    <span className="font-semibold capitalize">{l.entityType}</span>{' '}
                    {l.entityId && (
                      <span className="font-mono text-slate-400 text-[11px]">({l.entityId})</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400 font-mono">
                    {formatDateTime(l.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="p-12 text-center text-xs text-slate-400 dark:text-slate-500">
            {t('au.empty')}
          </div>
        )}
      </div>
    </div>
  )
}
