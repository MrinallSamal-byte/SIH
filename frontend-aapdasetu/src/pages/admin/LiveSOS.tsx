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
import PriorityBadge from '../../components/common/PriorityBadge'
import Badge from '../../components/common/Badge'
import Button from '../../components/common/Button'
import Loader from '../../components/common/Loader'
import LeafletMap, { type MapMarker, type MapPopupAction } from '../../components/map/LeafletMap'
import { useRealtime } from '../../hooks/useRealtime'
import { emitRealtimeUpdate } from '../../lib/realtimeEventBus'
import { timeAgo, getNavigationUrl } from '../../lib/helpers'
import { useLanguage } from '../../lib/i18n'
import { useToast } from '../../components/common/Toast'
import type { GeoPoint, Report } from '../../types'

const SIREN_ENABLED_KEY = 'aapdasetu_siren_enabled'
const FLASH_TAB_TITLE = '🔴 RED SOS — AapdaSetu'
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
    return { lat: 22.5726, lng: 88.3639 }
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
            <Button variant="outline" size="sm" onClick={armSiren} className="font-bold flex items-center gap-1.5">
              <Volume2 className="h-4 w-4 text-slate-700 dark:text-slate-300" />
              <span>{t('ls.enableAudioSiren')}</span>
            </Button>
          ) : (
            <>
              {hasGesture ? (
                <button
                  type="button"
                  onClick={disarmSiren}
                  title={t('ls.disableSirenHint', 'Click to disable siren')}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 shadow-sm cursor-pointer"
                >
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
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
                  className="inline-flex items-center gap-1.5 rounded-xl bg-amber-100 px-3 py-1.5 text-xs font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300 shadow-sm cursor-pointer"
                >
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  <span>{t('ls.armedMutedUntilInteraction', 'Armed — muted until interaction')}</span>
                </button>
              )}

              <Button variant="outline" size="sm" onClick={testSiren} title={t('ls.testSirenHint', 'Play one siren cycle')} className="font-bold flex items-center gap-1.5">
                <Play className="h-3.5 w-3.5 text-slate-700 dark:text-slate-300" />
                <span>{t('ls.testSiren', 'Test')}</span>
              </Button>

              {muted && !loopActive && (
                <span className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  <VolumeX className="h-3.5 w-3.5" />
                  <span>{t('ls.mutedUntilNextRed', 'Muted until next RED')}</span>
                </span>
              )}

              {loopActive && (
                <Button variant="danger" size="sm" onClick={muteSiren} className="font-bold flex items-center gap-1.5 animate-pulse">
                  <VolumeX className="h-3.5 w-3.5" />
                  <span>{t('ls.muteSiren', 'Silence')}</span>
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Realistic Tactical Satellite Map */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mono">
          <span>{t('ls.activeDistressMap')} ({markers.length} {t('ls.geolocatedIncidents')})</span>
          <span className="text-[11px] text-slate-400">{t('ls.layerSwitcherHint')}</span>
        </div>
        <div className="h-72 rounded-2xl overflow-hidden shadow-sm border border-slate-200 dark:border-slate-800">
          <LeafletMap
            center={mapCenter}
            markers={markers}
            height="100%"
            autoFit={markers.length > 0}
            selectedId={selectedId}
          />
        </div>
      </div>

      {/* Pending SOS Incident Stream */}
      <div className="space-y-3">
        {reports.map((r) => (
          <div
            key={r.id}
            onMouseEnter={() => setSelectedId(r.id)}
            onClick={() => setSelectedId(r.id)}
            className={`rounded-2xl border bg-white p-5 shadow-sm transition cursor-pointer dark:bg-slate-900 ${
              selectedId === r.id ? 'ring-2 ring-red-500/60' : ''
            } ${
              r.priorityLabel === 'RED'
                ? 'border-l-4 border-l-red-600 border-slate-200 dark:border-slate-800'
                : 'border-l-4 border-l-amber-500 border-slate-200 dark:border-slate-800'
            }`}
          >
            <div className="flex flex-wrap items-center gap-2">
              <PriorityBadge label={r.priorityLabel} />
              <span className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100">{r.trackingId}</span>
              <span className="text-xs font-bold capitalize text-slate-800 dark:text-slate-200">{r.type} {t('ls.emergency')}</span>
              <Badge value={r.status} label={statusLabel(r.status)} />
              <span className="ml-auto text-xs text-slate-400 mono">{timeAgo(r.createdAt)}</span>
            </div>

            <p className="mt-2 text-sm text-slate-800 dark:text-slate-200 font-medium leading-relaxed">{r.description}</p>

            <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
              {r.landmark && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-slate-400" />
                  <span>{t('ls.location')}: <strong className="text-slate-700 dark:text-slate-300">{r.landmark}</strong></span>
                </div>
              )}
              {r.reporterPhone && (
                <div className="flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5 text-slate-400" />
                  <span>{t('ls.contact')}: <a href={`tel:${r.reporterPhone}`} className="text-slate-900 dark:text-slate-100 underline font-mono font-bold hover:text-emerald-600">{r.reporterPhone}</a></span>
                </div>
              )}
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
              <div className="flex gap-2">
                {r.latitude && r.longitude && (
                  <a
                    href={getNavigationUrl(r.latitude, r.longitude)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-white/[0.1] dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
                  >
                    <Navigation className="h-3.5 w-3.5" />
                    <span>{t('ls.mapDirections')}</span>
                  </a>
                )}
                {r.reporterPhone && (
                  <a
                    href={`tel:${r.reporterPhone}`}
                    className="inline-flex items-center gap-1 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 dark:border-emerald-900/50 dark:bg-emerald-950/50 dark:text-emerald-300 cursor-pointer"
                  >
                    <Phone className="h-3.5 w-3.5" />
                    <span>{t('ls.callVictim')}</span>
                  </a>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" onClick={() => acknowledge(r.id)} className="font-bold">
                  {t('ls.acknowledgeTriage')}
                </Button>
                <Link
                  to="/admin/reports"
                  className="inline-flex items-center gap-1 rounded-xl bg-slate-900 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white cursor-pointer"
                >
                  <span>{t('ls.dispatchUnit')}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>
        ))}

        {reports.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 p-12 text-center text-sm text-slate-400 dark:border-slate-800">
            {t('ls.emptyQueue')}
          </div>
        )}
      </div>
    </div>
  )
}
