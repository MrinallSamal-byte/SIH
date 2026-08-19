import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Search,
  Clock,
  Phone,
  ShieldAlert,
  CheckCircle2,
  FileText,
  Navigation,
  RefreshCw
} from 'lucide-react'
import { getReport } from '../../api/endpoints'
import { Field } from '../../components/common/Input'
import Button from '../../components/common/Button'
import PriorityBadge from '../../components/common/PriorityBadge'
import LeafletMap, { type MapMarker, type MapPolyline } from '../../components/map/LeafletMap'
import { formatDateTime, haversineKm, getNavigationUrl } from '../../lib/helpers'
import { useLanguage } from '../../lib/i18n'
import type { Report } from '../../types'

export default function ReportTracker() {
  const { t } = useLanguage()
  const [searchParams, setSearchParams] = useSearchParams()
  const [trackingId, setTrackingId] = useState(() => searchParams.get('id') || '')
  const [loading, setLoading] = useState(false)
  const [report, setReport] = useState<Report | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [recentTracked, setRecentTracked] = useState<string[]>([])
  const lastSearchedRef = useRef<string>('')

  // Load recent tracked reports from localStorage
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('aapdasetu_tracked_reports') || '[]') as string[]
      setRecentTracked(stored)
    } catch {
      // Storage unavailable
    }
  }, [])

  const lookup = useCallback(
    async (idToSearch?: string) => {
      const id = (idToSearch !== undefined ? idToSearch : trackingId).trim()
      if (!id) return

      setLoading(true)
      setError(null)
      try {
        const res = await getReport(id)
        setReport(res)
        lastSearchedRef.current = res.trackingId

        // Save to recent tracked
        try {
          const stored = JSON.parse(localStorage.getItem('aapdasetu_tracked_reports') || '[]') as string[]
          if (!stored.includes(res.trackingId)) {
            const updated = [res.trackingId, ...stored].slice(0, 8)
            localStorage.setItem('aapdasetu_tracked_reports', JSON.stringify(updated))
            setRecentTracked(updated)
          }
        } catch {
          // Storage unavailable
        }

        // Update URL query param without triggering re-render loop
        if (searchParams.get('id') !== res.trackingId) {
          setSearchParams({ id: res.trackingId }, { replace: true })
        }
      } catch {
        setError(`Incident "${id}" not found. Please verify the tracking ID code.`)
        setReport(null)
      } finally {
        setLoading(false)
      }
    },
    [trackingId, searchParams, setSearchParams]
  )

  // Auto-search on mount or when query param changes from external navigation
  const queryParamId = searchParams.get('id')?.trim() || ''
  useEffect(() => {
    if (queryParamId && queryParamId !== lastSearchedRef.current) {
      setTrackingId(queryParamId)
      lookup(queryParamId)
    }
  }, [queryParamId, lookup])

  // Auto-refresh polling every 5 seconds when incident is active
  useEffect(() => {
    if (!autoRefresh || !report || report.status === 'resolved') return

    const interval = setInterval(() => {
      if (report.trackingId) {
        getReport(report.trackingId)
          .then((updated) => setReport(updated))
          .catch(() => {})
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [autoRefresh, report])

  const currentStepIdx = report ? (report.status === 'resolved' ? 2 : report.status === 'in_progress' ? 1 : 0) : -1

  // Live Map Coordinates & Markers
  const hasCoords = Boolean(report?.latitude && report?.longitude)
  const incidentPoint = hasCoords ? { lat: report!.latitude!, lng: report!.longitude! } : { lat: 22.5726, lng: 88.3639 }

  // Synthetic responder telemetry for visual real-time approach when in_progress
  const responderPoint = (hasCoords && report?.status === 'in_progress')
    ? { lat: report!.latitude! + 0.007, lng: report!.longitude! + 0.006 }
    : null

  const distanceKm = (hasCoords && responderPoint)
    ? haversineKm(incidentPoint, responderPoint)
    : null

  const estimatedEtaMins = distanceKm ? Math.max(2, Math.round((distanceKm / 25) * 60)) : null

  const mapMarkers: MapMarker[] = []
  if (hasCoords) {
    mapMarkers.push({
      id: 'incident',
      position: incidentPoint,
      title: `Incident: ${report?.type.toUpperCase()}`,
      subtitle: report?.landmark ?? 'Victim Location',
      color: '#dc2626',
      isSos: true,
    })
  }

  if (responderPoint) {
    mapMarkers.push({
      id: 'responder',
      position: responderPoint,
      title: `Rescue Unit: ${report?.assignedVolunteerName ?? 'Field Responder'}`,
      subtitle: `En Route — ETA ~${estimatedEtaMins} mins`,
      color: '#2563eb',
    })
  }

  const mapPolylines: MapPolyline[] = []
  if (hasCoords && responderPoint) {
    mapPolylines.push({
      id: 'route',
      points: [responderPoint, incidentPoint],
      color: '#3b82f6',
      dashed: true,
      label: `Rescue Route (~${distanceKm?.toFixed(1)} km)`,
    })
  }

  const statusSteps = [
    { key: 'pending', title: t('track.step1Title'), desc: t('track.step1Desc') },
    { key: 'in_progress', title: t('track.step2Title'), desc: t('track.step2Desc') },
    { key: 'resolved', title: t('track.step3Title'), desc: t('track.step3Desc') },
  ]

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="h-6 w-6 text-slate-900 dark:text-slate-100" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">{t('track.pageTitle')}</h1>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {t('track.pageSubtitle')}
          </p>
        </div>
        <div className="hidden sm:block">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300 mono">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            {t('common.live')}
          </span>
        </div>
      </div>

      {/* Tracking ID Search Bar */}
      <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            lookup()
          }}
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
        >
          <div className="flex-1">
            <Field label={t('track.quickTitle')}>
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  value={trackingId}
                  onChange={(e) => setTrackingId(e.target.value.toUpperCase())}
                  placeholder={t('track.inputPlaceholder')}
                  autoFocus
                  className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3.5 py-2.5 text-sm font-mono outline-none focus:border-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-300"
                />
              </div>
            </Field>
          </div>
          <Button
            type="submit"
            onClick={() => lookup()}
            disabled={!trackingId.trim() || loading}
            className="h-10 shrink-0 font-bold"
          >
            {loading ? t('common.loading') : t('track.lookupBtn')}
          </Button>
        </form>

        {/* Recent Tracked Chips */}
        {recentTracked.length > 0 && (
          <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mono">
              {t('track.recentTitle')}:
            </span>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {recentTracked.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setTrackingId(id)
                    lookup(id)
                  }}
                  className={`rounded-lg px-2.5 py-1 font-mono text-xs font-semibold transition ${
                    trackingId === id
                      ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                      : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  {id}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {loading && (
        <div className="mt-6 space-y-4">
          <div className="skeleton-shimmer h-28 rounded-2xl border border-slate-200 dark:border-slate-800" />
          <div className="skeleton-shimmer h-64 rounded-2xl border border-slate-200 dark:border-slate-800" />
        </div>
      )}

      {error && (
        <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-300">
          <div className="font-bold flex items-center gap-1.5">
            <ShieldAlert className="h-4 w-4" />
            <span>{error}</span>
          </div>
          <p className="mt-1 text-xs text-red-600 dark:text-red-400">
            {t('track.notFound')}
          </p>
        </div>
      )}

      {/* Incident Details Card */}
      {report && !loading && (
        <div className="mt-6 space-y-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          {/* Header */}
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mono">{t('track.quickTitle')}</span>
                {report.status !== 'resolved' && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200 dark:border-emerald-900/50 dark:bg-emerald-950/60 dark:text-emerald-300 mono">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                    {t('common.live')}
                  </span>
                )}
              </div>
              <div className="font-mono text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 mt-0.5">
                {report.trackingId}
              </div>
              <div className="mt-1 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                <Clock className="h-3 w-3" />
                <span>{formatDateTime(report.createdAt)}</span>
              </div>
            </div>

            <div className="flex flex-col items-end gap-2">
              <PriorityBadge label={report.priorityLabel} />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => lookup(report.trackingId)}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>{t('report.gpsRetry')}</span>
                </button>
                <label className="flex cursor-pointer items-center gap-1.5 text-xs text-slate-500">
                  <input
                    type="checkbox"
                    checked={autoRefresh}
                    onChange={(e) => setAutoRefresh(e.target.checked)}
                    className="rounded text-slate-900"
                  />
                  <span>{t('common.live')}</span>
                </label>
              </div>
            </div>
          </div>

          {/* Interactive Live Responder & Incident Map */}
          {hasCoords && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mono">
                <span>{t('track.liveTelemetry')}</span>
                {responderPoint && distanceKm && (
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                    {t('track.eta')}: ~{estimatedEtaMins} mins (~{distanceKm.toFixed(1)} km)
                  </span>
                )}
              </div>
              <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-inner dark:border-slate-800">
                <LeafletMap
                  center={incidentPoint}
                  zoom={14}
                  markers={mapMarkers}
                  polylines={mapPolylines}
                  height="260px"
                  autoFit={Boolean(responderPoint)}
                />
              </div>
            </div>
          )}

          {/* Multi-Stage Timeline */}
          <div>
            <div className="mb-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mono">
              {t('track.timeline')}
            </div>
            <div className="space-y-4">
              {statusSteps.map((step, idx) => {
                const isPassed = idx <= currentStepIdx
                const isCurrent = idx === currentStepIdx
                return (
                  <div key={step.key} className="flex items-start gap-3">
                    <div className="flex flex-col items-center">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition ${
                          isPassed
                            ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                            : 'border border-slate-300 bg-slate-100 text-slate-400 dark:border-slate-700 dark:bg-slate-800'
                        }`}
                      >
                        {isPassed ? <CheckCircle2 className="h-4 w-4" /> : <span className="mono">{idx + 1}</span>}
                      </div>
                      {idx < statusSteps.length - 1 && (
                        <div
                          className={`my-1 h-8 w-0.5 ${
                            idx < currentStepIdx ? 'bg-slate-900 dark:bg-slate-100' : 'bg-slate-200 dark:bg-slate-800'
                          }`}
                        />
                      )}
                    </div>

                    <div className="flex-1 pb-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-sm font-bold ${
                            isCurrent
                              ? 'text-slate-900 dark:text-slate-100'
                              : isPassed
                              ? 'text-slate-700 dark:text-slate-300'
                              : 'text-slate-400'
                          }`}
                        >
                          {step.title}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{step.desc}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Incident Info Breakdown */}
          <div className="space-y-2 rounded-xl border border-slate-100 bg-slate-50 p-4 text-xs dark:border-slate-800 dark:bg-slate-950">
            <InfoRow label={t('report.categoryLabel')} value={report.type.toUpperCase()} />
            <InfoRow label={t('common.landmark')} value={report.landmark ?? 'GPS Coordinates Recorded'} />
            {report.latitude && report.longitude && (
              <InfoRow
                label="GPS"
                value={`${report.latitude.toFixed(4)}°N, ${report.longitude.toFixed(4)}°E`}
              />
            )}
            <InfoRow label={t('report.descLabel')} value={report.description ?? '—'} />
            <InfoRow label={t('report.phoneLabel')} value={report.reporterPhone ?? '—'} />
            <InfoRow label={t('track.assignedAgency')} value={report.assignedAgencyName ?? 'NDRF / SDRF Command'} />
            <InfoRow label={t('track.assignedVolunteer')} value={report.assignedVolunteerName ?? 'Volunteer Team In-Queue'} />
            {report.resolutionNotes && (
              <InfoRow label="Resolution & Safety Notes" value={report.resolutionNotes} highlight />
            )}
          </div>

          {/* Direct Responder / Command Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-slate-100">{t('helpline.tag')}</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                {t('helpline.desc')}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {hasCoords && (
                <a
                  href={getNavigationUrl(report.latitude!, report.longitude!)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
                >
                  <Navigation className="h-3.5 w-3.5" />
                  <span>{t('common.directions')}</span>
                </a>
              )}
              <a
                href="tel:112"
                className="inline-flex items-center gap-1 rounded-xl bg-red-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-red-700"
              >
                <Phone className="h-3.5 w-3.5" />
                <span>Call 112</span>
              </a>
              <a
                href="tel:1070"
                className="inline-flex items-center gap-1 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-800 shadow-xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <Phone className="h-3.5 w-3.5" />
                <span>Call 1070</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function InfoRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between border-b border-slate-200/60 pb-1.5 last:border-none last:pb-0 dark:border-slate-800">
      <span className="text-slate-500 dark:text-slate-400">{label}:</span>
      <span
        className={`max-w-[65%] text-right font-medium ${
          highlight ? 'font-bold text-emerald-600 dark:text-emerald-400' : 'text-slate-800 dark:text-slate-200'
        }`}
      >
        {value}
      </span>
    </div>
  )
}
