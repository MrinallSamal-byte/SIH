import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Search,
  Phone,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Eye,
  Image as ImageIcon,
  XCircle,
  GitCompareArrows
} from 'lucide-react'
import { listMissingPersons, listMissingMatches, reviewMissingMatch, updateMissingPerson } from '../../api/endpoints'
import type { MissingPerson } from '../../types'
import type { MissingMatch } from '../../api/endpoints'
import { Select } from '../../components/common/Input'
import Button from '../../components/common/Button'
import Badge from '../../components/common/Badge'
import Loader from '../../components/common/Loader'
import Modal from '../../components/common/Modal'
import { useRealtime } from '../../hooks/useRealtime'
import { useToast } from '../../components/common/Toast'
import { formatDateTime } from '../../lib/helpers'
import { useLanguage } from '../../lib/i18n'

export default function MissingPersons() {
  const { t } = useLanguage()
  const { toast } = useToast()
  const fetchPersons = useCallback(() => listMissingPersons(), [])
  const persons = useRealtime<MissingPerson[]>(fetchPersons, 6000)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null)

  // AI sighting matches awaiting operator review
  const [matches, setMatches] = useState<MissingMatch[] | null>(null)
  const [reviewingId, setReviewingId] = useState<string | null>(null)

  const refreshMatches = useCallback(() => {
    listMissingMatches().then(setMatches).catch(() => setMatches([]))
  }, [])

  useEffect(() => {
    refreshMatches()
  }, [refreshMatches])

  const reviewMatch = async (match: MissingMatch, decision: 'confirmed' | 'rejected') => {
    setReviewingId(match.id)
    try {
      await reviewMissingMatch(match.id, decision)
      toast(`${t('mp_admin.matchReviewed', 'Match reviewed')}: ${decision}`, 'success')
      refreshMatches()
    } catch (err) {
      toast(err instanceof Error ? err.message : t('mp_admin.matchReviewFailed', 'Failed to review match'), 'error')
    } finally {
      setReviewingId(null)
    }
  }

  const update = async (id: string, patch: Partial<MissingPerson>) => {
    try {
      await updateMissingPerson(id, patch)
      toast(`${t('mp_admin.statusUpdated')}: ${patch.status?.toUpperCase()}`, 'success')
    } catch {
      toast(t('mp_admin.updateFailed'), 'error')
    }
  }

  const filtered = useMemo(() => {
    if (!persons) return []
    return persons.filter((p) => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false
      if (search.trim()) {
        const q = search.toLowerCase().trim()
        const matchName = (p.name || '').toLowerCase().includes(q)
        const matchLocation = (p.lastSeenLocation || '').toLowerCase().includes(q)
        const matchClothes = (p.clothes || '').toLowerCase().includes(q)
        const matchPhone = (p.contactPhone || '').includes(q)
        if (!matchName && !matchLocation && !matchClothes && !matchPhone) return false
      }
      return true
    })
  }, [persons, statusFilter, search])

  if (!persons) return <Loader />

  const totalCount = persons.length
  const openCount = persons.filter((p) => p.status === 'open').length
  const matchedCount = persons.filter((p) => p.status === 'matched').length
  const resolvedCount = persons.filter((p) => p.status === 'resolved').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Search className="h-6 w-6 text-slate-900 dark:text-slate-100" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {t('mp_admin.title')}
            </h1>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {t('mp_admin.subtitle')}
          </p>
        </div>

        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300 mono">
          {totalCount} {t('mp_admin.totalCases')}
        </span>
      </div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mono">{t('mp_admin.totalCases')}</div>
          <div className="mt-1 text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">{totalCount}</div>
          <div className="text-[11px] text-slate-400">{t('mp_admin.registeredBulletins')}</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="text-[11px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400 mono flex items-center gap-1">
            <AlertCircle className="h-3.5 w-3.5" />
            <span>{t('mp_admin.activeSearches')}</span>
          </div>
          <div className="mt-1 text-2xl font-bold font-mono text-red-600 dark:text-red-400">{openCount}</div>
          <div className="text-[11px] text-slate-400">{t('mp_admin.investigationPending')}</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 mono flex items-center gap-1">
            <Eye className="h-3.5 w-3.5" />
            <span>{t('mp_admin.sightingsMatched')}</span>
          </div>
          <div className="mt-1 text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">{matchedCount}</div>
          <div className="text-[11px] text-slate-400">{t('mp_admin.identityMatchIdentified')}</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mono flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>{t('mp_admin.reunitedSafe')}</span>
          </div>
          <div className="mt-1 text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">{resolvedCount}</div>
          <div className="text-[11px] text-slate-400">{t('mp_admin.caseClosedSuccess')}</div>
        </div>
      </div>

      {/* Search & Status Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('mp_admin.searchPlaceholder')}
            className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3.5 py-2 text-xs text-slate-900 outline-none focus:border-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {(['all', 'open', 'matched', 'resolved'] as const).map((st) => (
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
              {st === 'all' ? t('mp_admin.statusAll') : st === 'open' ? t('mp_admin.statusOpen') : st === 'matched' ? t('mp_admin.statusMatched') : t('mp_admin.statusResolved')}
            </button>
          ))}
        </div>
      </div>

      {/* Case Cards Grid */}
      <div className="grid gap-3.5 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((p) => (
          <div
            key={p.id}
            className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
          >
            <div>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  {p.photoUrl ? (
                    <button
                      type="button"
                      onClick={() => setPreviewPhoto(p.photoUrl!)}
                      className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer group"
                    >
                      <img src={p.photoUrl} alt={p.name} className="h-full w-full object-cover group-hover:scale-105 transition" />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                        <Eye className="h-4 w-4 text-white" />
                      </div>
                    </button>
                  ) : (
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-400 dark:bg-slate-800">
                      <ImageIcon className="h-6 w-6" />
                    </div>
                  )}

                  <div>
                    <div className="font-bold text-base text-slate-900 dark:text-slate-100">{p.name}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {p.age !== undefined ? `${t('mp_admin.age')} ${p.age}` : t('mp_admin.ageUnknown')} · <span className="capitalize">{p.gender || t('mp_admin.genderNotSpecified')}</span>
                    </div>
                  </div>
                </div>

                <Badge value={p.status} />
              </div>

              {/* Sighting & Description Metadata */}
              <div className="mt-4 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                <div className="flex items-start gap-1.5">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-red-500 mt-0.5" />
                  <span>{t('mp_admin.lastSeen')}: <strong>{p.lastSeenLocation || t('mp_admin.locationUnspecified')}</strong></span>
                </div>
                {p.clothes && (
                  <div className="text-slate-500 dark:text-slate-400 text-[11px]">
                    {t('mp_admin.wearing')}: <span className="italic">{p.clothes}</span>
                  </div>
                )}
                {p.contactPhone && (
                  <div className="flex items-center gap-1.5 pt-1">
                    <Phone className="h-3.5 w-3.5 text-emerald-600" />
                    <span>{t('mp_admin.guardianContact')}: <a href={`tel:${p.contactPhone}`} className="font-mono font-bold text-slate-900 dark:text-slate-100 underline hover:text-emerald-600">{p.contactPhone}</a></span>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Status Changers */}
            <div className="mt-5 flex items-center justify-between gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
              <div className="flex-1">
                <Select
                  value={p.status}
                  onChange={(e) => update(p.id, { status: e.target.value as MissingPerson['status'] })}
                  className="w-full py-1 text-xs font-bold"
                >
                  <option value="open">{t('mp_admin.optOpen')}</option>
                  <option value="matched">{t('mp_admin.optMatched')}</option>
                  <option value="resolved">{t('mp_admin.optResolved')}</option>
                </Select>
              </div>

              {p.contactPhone && (
                <a
                  href={`tel:${p.contactPhone}`}
                  className="inline-flex items-center gap-1 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300 transition"
                >
                  <Phone className="h-3.5 w-3.5" />
                  <span>{t('mp_admin.btnCall')}</span>
                </a>
              )}
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="col-span-full rounded-2xl border border-dashed border-slate-300 p-12 text-center text-xs text-slate-400 dark:border-slate-800">
            {t('mp_admin.noCases')}
          </div>
        )}
      </div>

      {/* Pending Match Review Queue */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3.5 dark:border-slate-800">
          <GitCompareArrows className="h-4 w-4 text-amber-600" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mono">
            {t('mp_admin.pendingMatches', 'Pending match reviews')} ({matches?.length ?? 0})
          </span>
        </div>

        {matches !== null && matches.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 font-bold uppercase tracking-wider text-slate-500 mono text-[10px] dark:border-slate-800 dark:bg-slate-950">
                <tr>
                  <th className="px-5 py-3">{t('mp_admin.namePair', 'Name pair')}</th>
                  <th className="px-5 py-3">{t('mp_admin.score', 'Score')}</th>
                  <th className="px-5 py-3">{t('au.eventTimestamp', 'Timestamp')}</th>
                  <th className="px-5 py-3 text-right">Review</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {matches.map((m) => (
                  <tr key={m.id} className="transition hover:bg-slate-50/70 dark:hover:bg-slate-800/50">
                    <td className="px-5 py-3.5 font-semibold text-slate-900 dark:text-slate-100">
                      {m.missingPersonName || '—'} <span className="text-slate-400">↔</span> {m.matchedPersonName || '—'}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-slate-700 dark:text-slate-300">
                      {m.score === null ? '—' : m.score}
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400 font-mono">
                      {formatDateTime(m.createdAt)}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => reviewMatch(m, 'confirmed')}
                          disabled={reviewingId === m.id}
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          {t('mp_admin.confirmMatch', 'Confirm')}
                        </button>
                        <button
                          type="button"
                          onClick={() => reviewMatch(m, 'rejected')}
                          disabled={reviewingId === m.id}
                          className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-bold text-red-600 hover:bg-red-100 disabled:opacity-50 cursor-pointer dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
                        >
                          <XCircle className="h-3 w-3" />
                          {t('mp_admin.rejectMatch', 'Reject')}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {matches !== null && matches.length === 0 && (
          <div className="p-8 text-center text-xs text-slate-400 dark:text-slate-500">
            {t('mp_admin.noPendingMatches', 'No pending AI matches')}
          </div>
        )}
      </div>

      {/* Photo Preview Modal */}
      {previewPhoto && (
        <Modal open title={t('mp_admin.modalPhotoTitle')} onClose={() => setPreviewPhoto(null)}>
          <div className="flex flex-col items-center">
            <img src={previewPhoto} alt={t('missing.previewAlt', 'Preview')} className="max-h-96 w-auto rounded-xl object-contain shadow-md" />
            <Button variant="secondary" className="mt-4" onClick={() => setPreviewPhoto(null)}>
              {t('mp_admin.btnClosePreview')}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  )
}
