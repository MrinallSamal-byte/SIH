import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Siren,
  Volume2,
  VolumeX,
  Play,
  Phone,
  Navigation,
  ArrowRight,
  MapPin
} from 'lucide-react'
import { listReports, updateReport } from '../../api/endpoints'
import Loader from '../../components/common/Loader'
import LeafletMap, { type MapMarker, type MapPopupAction } from '../../components/map/LeafletMap'
import { useRealtime } from '../../hooks/useRealtime'
import { emitRealtimeUpdate } from '../../lib/realtimeEventBus'
import { timeAgo, getNavigationUrl } from '../../lib/helpers'
import { useLanguage } from '../../lib/i18n'
import { useToast } from '../../components/common/Toast'
import type { GeoPoint, Report } from '../../types'

const SIREN_ENABLED_KEY = 'aapdasetu_siren_enabled'
const FLASH_TAB_TITLE = '[CRITICAL] RED SOS — AapdaSetu'
const MODULE_LOAD_TITLE = typeof document !== 'undefined' ? document.title : 'AapdaSetu'

// Browser Notification() fires from module scope (outside React), so the stored
// language is read directly from localStorage — mirrors ErrorBoundary's pattern.
const NOTIFY_STRINGS = {
  en: { notifTitle: 'RED SOS — AapdaSetu', locationUnavailable: 'Location unavailable' },
  hi: { notifTitle: 'लाल संकट SOS — AapdaSetu', locationUnavailable: 'स्थान अनुपलब्ध' },
  bn: { notifTitle: 'লাল সংকট SOS — AapdaSetu', locationUnavailable: 'অবস্থান অনুপলব্ধ' },
  or: { notifTitle: 'ଲାଲ୍ ସଙ୍କଟ SOS — AapdaSetu', locationUnavailable: 'ଅବସ୍ଥିତି ଅନୁପଲବ୍ଧ' },
} as const

type NotifyLang = keyof typeof NOTIFY_STRINGS

function readStoredLanguage(): NotifyLang {
  try {
    const stored = localStorage.getItem('aapdasetu_lang')
    if (stored === 'hi' || stored === 'bn' || stored === 'or') return stored
  } catch {
    // Storage unavailable — fall back to English
  }
  return 'en'
}

/** Original tab title, evaluated once at bundle load and guarded so a remount
 * can never capture our own flashed title back as the "original". */
function getBaseTabTitle(): string {
  if (MODULE_LOAD_TITLE && !MODULE_LOAD_TITLE.includes('RED SOS')) return MODULE_LOAD_TITLE
  return 'AapdaSetu'
}

class SirenEngine {
  private ctx: AudioContext | null = null
  private timer: number | null = null
  private active = false

  prime(): void {
    this.ensureContext()
  }

  get isRunning(): boolean {
    return this.active
  }

  start(): void {
    if (this.active) return
    const ctx = this.ensureContext()
    if (!ctx) return
    this.active = true
    if (ctx.state === 'running') {
      this.beginLoop()
      return
    }
    // Autoplay policy: the context only leaves 'suspended' after a real user
    // gesture — begin the loop when resume settles; until then the engine is
    // honestly not audible (isRunning true, but no timer/no sound).
    void ctx
      .resume()
      .then(() => {
        if (this.active && this.ctx?.state === 'running') this.beginLoop()
      })
      .catch(() => {})
  }

  stop(): void {
    this.active = false
    if (this.timer !== null) {
      window.clearInterval(this.timer)
      this.timer = null
    }
  }

  burst(): void {
    const ctx = this.ensureContext()
    if (!ctx || ctx.state !== 'running') return
    this.playTwoToneCycle()
  }

  private beginLoop(): void {
    if (!this.active || this.timer !== null) return
    this.playTwoToneCycle()
    this.timer = window.setInterval(() => this.playTwoToneCycle(), 1200)
  }

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null
    if (!this.ctx) {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (Ctor) this.ctx = new Ctor()
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {})
    }
    return this.ctx
  }

  private playTwoToneCycle(): void {
    const ctx = this.ctx
    if (!ctx || ctx.state !== 'running') return
    this.playTone(ctx, 880, 0)
    this.playTone(ctx, 440, 0.6)
  }

  private playTone(ctx: AudioContext, freq: number, offset: number): void {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'square'
    osc.frequency.setValueAtTime(freq, ctx.currentTime + offset)
    const startAt = ctx.currentTime + offset
    gain.gain.setValueAtTime(0.0001, startAt)
    gain.gain.exponentialRampToValueAtTime(0.25, startAt + 0.04)
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.58)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(startAt)
    osc.stop(startAt + 0.6)
  }
}

const sirenEngine = new SirenEngine()

function readStoredSirenEnabled(): boolean {
  try {
    return localStorage.getItem(SIREN_ENABLED_KEY) === 'true'
  } catch {
    return false
  }
}

function storeSirenEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(SIREN_ENABLED_KEY, enabled ? 'true' : 'false')
  } catch {
    // Storage unavailable — siren still works for this session
  }
}

function requestNotificationPermissionOnce(): void {
  if (typeof window === 'undefined' || !('Notification' in window)) return
  try {
    if (Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {})
    }
  } catch {
    // Notification API unavailable or blocked
  }
}

function notifyNewRedIncidents(items: Report[]): void {
  if (typeof window === 'undefined' || !('Notification' in window)) return
  if (Notification.permission !== 'granted') return
  const s = NOTIFY_STRINGS[readStoredLanguage()]
  for (const r of items) {
    try {
      const where =
        r.landmark ||
        (typeof r.latitude === 'number' && typeof r.longitude === 'number'
          ? `${r.latitude.toFixed(3)}, ${r.longitude.toFixed(3)}`
          : s.locationUnavailable)
      new Notification(s.notifTitle, {
        body: `${(r.type ?? 'emergency').replace('_', ' ').toUpperCase()} • ${where} • ${r.trackingId}`,
        tag: r.id,
      })
    } catch {
      // Notification constructor can throw on some platforms
    }
  }
}

export default function LiveSOS() {
  const { t } = useLanguage()
  const { toast } = useToast()
  // pageSize 200 (backend max): the default first-50 page made SOS #51+
  // invisible in a mass-casualty event even though the header showed the
  // true total — those incidents could never be acknowledged from here.
  const fetchReports = useCallback(() => listReports({ status: 'pending', pageSize: 200 }), [])
  const reportsPage = useRealtime<{ items: Report[]; total: number }>(fetchReports, 3000)
  const reports = reportsPage?.items ?? []

  const statusLabel = useCallback(
    (status: string) =>
      status === 'pending'
        ? t('rp.filterPending', 'Pending Triage')
        : status === 'in_progress'
          ? t('rp.filterInProgress', 'In Progress')
          : t('rp.filterResolved', 'Resolved'),
    [t],
  )

  const [sirenArmed, setSirenArmed] = useState<boolean>(readStoredSirenEnabled)
  const [hasGesture, setHasGesture] = useState(false)
  const [muted, setMuted] = useState(false)
  const [loopActive, setLoopActive] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const knownRedIdsRef = useRef<Set<string>>(new Set())
  const isFirstLoadRef = useRef(true)

  // Autoplay policies require a real user gesture before audio can play.
  // Every operator click routes through here so the AudioContext resume
  // happens inside a gesture-trusted call stack.
  const markInteraction = useCallback(() => {
    setHasGesture(true)
    sirenEngine.prime()
  }, [])

  useEffect(() => {
    setLoopActive(sirenEngine.isRunning)
    // Never leave the siren loop running after the operator leaves the page.
    return () => sirenEngine.stop()
  }, [])

  const acknowledge = useCallback(
    async (reportId: string) => {
      markInteraction()
      try {
        await updateReport(reportId, { status: 'in_progress' })
        // Only silence the siren once the acknowledge actually stuck.
        sirenEngine.stop()
        setLoopActive(false)
        emitRealtimeUpdate('report_updated', reportId)
      } catch (err) {
        toast(err instanceof Error ? err.message : t('ls.ackFailed', 'Failed to acknowledge incident'), 'error')
      }
    },
    [markInteraction, toast, t],
  )

  useEffect(() => {
    if (!reports) return

    const currentRedReports = reports.filter((r) => r.priorityLabel === 'RED')
    const currentRedIds = new Set(currentRedReports.map((r) => r.id))

    if (isFirstLoadRef.current) {
      knownRedIdsRef.current = currentRedIds
      isFirstLoadRef.current = false
      if (currentRedReports.length > 0 && sirenArmed && hasGesture) {
        setMuted(false)
        sirenEngine.start()
        notifyNewRedIncidents(currentRedReports)
      }
      return
    }

    const netNewReds = reports.filter(
      (r) => r.priorityLabel === 'RED' && !knownRedIdsRef.current.has(r.id),
    )

    knownRedIdsRef.current = currentRedIds

    if (netNewReds.length > 0 && sirenArmed) {
      setMuted(false)
      notifyNewRedIncidents(netNewReds)
      // No sound before a user gesture: with a stored "enabled" pref the siren
      // stays armed-but-silent until the operator interacts with the page.
      if (hasGesture) {
        sirenEngine.start()
        setLoopActive(true)
      }
    }
  }, [reports, sirenArmed, hasGesture])

  const unackedRedCount = reports?.filter((r) => r.priorityLabel === 'RED').length ?? 0

  useEffect(() => {
    const base = getBaseTabTitle()
    if (unackedRedCount <= 0) {
      document.title = base
      return
    }
    document.title = FLASH_TAB_TITLE
    let flip = false
    const id = window.setInterval(() => {
      flip = !flip
      document.title = flip ? base : FLASH_TAB_TITLE
    }, 1500)
    return () => {
      window.clearInterval(id)
      document.title = base
    }
  }, [unackedRedCount])

  const armSiren = () => {
    markInteraction()
    setSirenArmed(true)
    storeSirenEnabled(true)
    setMuted(false)
    requestNotificationPermissionOnce()
  }

  const disarmSiren = () => {
    markInteraction()
    setSirenArmed(false)
    storeSirenEnabled(false)
    sirenEngine.stop()
    setLoopActive(false)
  }

  const muteSiren = () => {
    markInteraction()
    setMuted(true)
    sirenEngine.stop()
    setLoopActive(false)
  }

  const testSiren = () => {
    markInteraction()
    sirenEngine.burst()
  }

  // Live Map markers for pending SOS signals
  const markers = useMemo<MapMarker[]>(() => {
    if (!reports) return []
    return reports
      .filter((r) => typeof r.latitude === 'number' && typeof r.longitude === 'number' && !isNaN(r.latitude) && !isNaN(r.longitude))
      .map((r) => {
        const actions: MapPopupAction[] = [
          {
            label: t('ls.popupAcknowledge', 'Acknowledge'),
            onClick: () => acknowledge(r.id),
          },
        ]
        actions.push({
          label: t('ls.popupNavigate', 'Navigate'),
          onClick: () =>
            window.open(getNavigationUrl(r.latitude!, r.longitude!), '_blank', 'noopener,noreferrer'),
        })
        return {
          id: r.id,
          position: { lat: r.latitude!, lng: r.longitude! },
          title: `${t('ls.sos')} ${(r.type ?? 'emergency').toUpperCase()} (${r.trackingId})`,
          subtitle: `${r.description ?? ''} - ${t('ls.reportedAgo', 'Reported {t}').replace('{t}', timeAgo(r.createdAt))}`,
          color: r.priorityLabel === 'RED' ? '#dc2626' : '#f59e0b',
          isSos: true,
          popupActions: actions,
        }
      })
  }, [reports, t, acknowledge])

  const mapCenter: GeoPoint = useMemo(() => {
    if (markers.length > 0) return markers[0].position
    return { lat: 26.1445, lng: 91.7362 }
  }, [markers])

  if (!reportsPage) return <Loader />

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Siren className="h-6 w-6 text-red-600 animate-pulse" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {t('ls.title')}
            </h1>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1">
            <span className="inline-block h-2 w-2 rounded-full bg-red-500 animate-ping" />
            <span>{t('ls.activeDistressQueue')} ({(reportsPage.total ?? reports.length).toLocaleString()} {t('ls.pendingIncidents')})</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!sirenArmed ? (
            <button
              type="button"
              onClick={armSiren}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-800 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700 cursor-pointer transition-colors shadow-2xs"
            >
              <Volume2 className="h-4 w-4 text-zinc-500" />
              <span>{t('ls.enableAudioSiren')}</span>
            </button>
          ) : (
            <>
              {hasGesture ? (
                <button
                  type="button"
                  onClick={disarmSiren}
                  title={t('ls.disableSirenHint', 'Click to disable siren')}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-zinc-800 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 shadow-2xs cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-700/80 transition-colors"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>{t('ls.sirenActive')}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={markInteraction}
                  title={t(
                    'ls.armedMutedHint',
                    'Armed — audio stays muted until you interact with the page',
                  )}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-zinc-800 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 shadow-2xs cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-700/80 transition-colors"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  <span>{t('ls.armedMutedUntilInteraction', 'Armed — muted until interaction')}</span>
                </button>
              )}

              <button
                type="button"
                onClick={testSiren}
                title={t('ls.testSirenHint', 'Play one siren cycle')}
                className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 cursor-pointer transition-colors"
              >
                <Play className="h-3 w-3 text-zinc-500" />
                <span>{t('ls.testSiren', 'Test')}</span>
              </button>

              {muted && !loopActive && (
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-xs font-medium text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800/60 dark:text-zinc-400 mono">
                  <VolumeX className="h-3 w-3" />
                  <span>{t('ls.mutedUntilNextRed', 'Muted until next RED')}</span>
                </span>
              )}

              {loopActive && (
                <button
                  type="button"
                  onClick={muteSiren}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-red-700 cursor-pointer animate-pulse transition-colors"
                >
                  <VolumeX className="h-3 w-3" />
                  <span>{t('ls.muteSiren', 'Silence')}</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Realistic Tactical Satellite Map */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mono">
          <span>{t('ls.activeDistressMap')} ({markers.length} {t('ls.geolocatedIncidents')})</span>
          <span className="text-[10px] text-zinc-400">{t('ls.layerSwitcherHint')}</span>
        </div>
        <div className="h-72 sm:h-96 lg:h-[400px] rounded-xl overflow-hidden shadow-2xs border border-zinc-200 dark:border-zinc-800">
          <LeafletMap
            center={mapCenter}
            markers={markers}
            height="100%"
            autoFit={markers.length > 0}
            selectedId={selectedId}
          />
        </div>
      </div>

      {/* Monochromatic Live SOS Distress Queue */}
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-2xs dark:border-zinc-800 dark:bg-[#151515]">
        <div className="flex items-center justify-between border-b border-zinc-200 bg-zinc-50/70 px-4 py-2.5 dark:border-zinc-800 dark:bg-[#1a1a1a]/80">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-red-600 animate-pulse" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mono">
              {t('ls.activeDistressQueue', 'Live Distress Queue')}
            </span>
            <span className="rounded bg-zinc-200/70 px-1.5 py-0.2 text-[10px] font-bold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 mono">
              {reports.length}
            </span>
          </div>
          <span className="text-[10px] text-zinc-400 dark:text-zinc-500 mono">
            Click incident row to focus on map
          </span>
        </div>

        <div className="divide-y divide-zinc-200/70 dark:divide-zinc-800/80">
          {reports.map((r) => {
            const isSelected = selectedId === r.id
            const isRed = r.priorityLabel === 'RED'

            return (
              <div
                key={r.id}
                onMouseEnter={() => setSelectedId(r.id)}
                onClick={() => setSelectedId(r.id)}
                className={`relative p-4 transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-zinc-50/90 dark:bg-zinc-900/80'
                    : 'hover:bg-zinc-50/50 dark:hover:bg-zinc-900/40'
                }`}
              >
                {isSelected && (
                  <span className="absolute left-0 top-0 bottom-0 w-1 bg-zinc-900 dark:bg-white" />
                )}

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider mono ${
                        isRed
                          ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                          : 'bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200'
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${isRed ? 'bg-red-500 animate-pulse' : 'bg-amber-500'}`} />
                      <span>{r.priorityLabel}</span>
                    </span>

                    <span className="font-mono text-xs font-bold text-zinc-900 dark:text-zinc-100">
                      {r.trackingId}
                    </span>

                    <span className="text-xs font-semibold capitalize text-zinc-700 dark:text-zinc-300">
                      {r.type} {t('ls.emergency', 'Emergency')}
                    </span>

                    <span className="rounded border border-zinc-200 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-600 dark:border-zinc-800 dark:text-zinc-400 mono">
                      {statusLabel(r.status)}
                    </span>
                  </div>

                  <span className="text-[11px] text-zinc-400 dark:text-zinc-500 mono">
                    {timeAgo(r.createdAt)}
                  </span>
                </div>

                <p className="mt-2 text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed font-normal">
                  {r.description}
                </p>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-zinc-100 dark:border-zinc-800/60">
                  <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400">
                    {r.landmark && (
                      <span className="flex items-center gap-1 text-[11px]">
                        <MapPin className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                        <span className="font-medium text-zinc-700 dark:text-zinc-300">{r.landmark}</span>
                      </span>
                    )}
                    {r.reporterPhone && (
                      <span className="flex items-center gap-1 text-[11px]">
                        <Phone className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                        <a
                          href={`tel:${r.reporterPhone}`}
                          onClick={(e) => e.stopPropagation()}
                          className="font-mono font-semibold text-zinc-700 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-white underline underline-offset-2"
                        >
                          {r.reporterPhone}
                        </a>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 ml-auto">
                    {r.latitude && r.longitude && (
                      <a
                        href={getNavigationUrl(r.latitude, r.longitude)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 rounded border border-zinc-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 cursor-pointer transition-colors"
                      >
                        <Navigation className="h-3 w-3 text-zinc-400" />
                        <span>{t('ls.mapDirections', 'Directions')}</span>
                      </a>
                    )}

                    {r.reporterPhone && (
                      <a
                        href={`tel:${r.reporterPhone}`}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 rounded border border-zinc-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 cursor-pointer transition-colors"
                      >
                        <Phone className="h-3 w-3 text-zinc-400" />
                        <span>{t('ls.callVictim', 'Call')}</span>
                      </a>
                    )}

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        acknowledge(r.id)
                      }}
                      className="rounded border border-zinc-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 cursor-pointer transition-colors"
                    >
                      {t('ls.acknowledgeTriage', 'Acknowledge')}
                    </button>

                    <Link
                      to="/admin/reports"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 rounded bg-zinc-900 px-3 py-1 text-[11px] font-bold text-white shadow-2xs hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100 cursor-pointer transition-colors"
                    >
                      <span>{t('ls.dispatchUnit', 'Dispatch')}</span>
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              </div>
            )
          })}

          {reports.length === 0 && (
            <div className="p-12 text-center text-xs text-zinc-400 dark:text-zinc-500">
              {t('ls.emptyQueue', 'No active SOS distress signals in the queue.')}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
