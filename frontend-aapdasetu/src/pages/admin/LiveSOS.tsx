import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Siren,
  Volume2,
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
import LeafletMap, { type MapMarker } from '../../components/map/LeafletMap'
import { useRealtime } from '../../hooks/useRealtime'
import { timeAgo, getNavigationUrl } from '../../lib/helpers'
import type { GeoPoint, Report } from '../../types'

// Singleton Audio Context for alarm siren
let globalAudioCtx: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!globalAudioCtx) {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (AudioCtx) globalAudioCtx = new AudioCtx()
  }
  if (globalAudioCtx && globalAudioCtx.state === 'suspended') {
    globalAudioCtx.resume().catch(() => {})
  }
  return globalAudioCtx
}

function playCriticalAlarm() {
  const ctx = getAudioContext()
  if (!ctx || ctx.state !== 'running') return

  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sawtooth'
  osc.connect(gain)
  gain.connect(ctx.destination)

  osc.frequency.setValueAtTime(880, ctx.currentTime)
  osc.frequency.setValueAtTime(1200, ctx.currentTime + 0.15)
  osc.frequency.setValueAtTime(880, ctx.currentTime + 0.3)

  gain.gain.setValueAtTime(0.3, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6)

  osc.start(ctx.currentTime)
  osc.stop(ctx.currentTime + 0.6)
}

export default function LiveSOS() {
  const fetchReports = useCallback(() => listReports({ status: 'pending' }), [])
  const reports = useRealtime<Report[]>(fetchReports, 3000)
  const [audioEnabled, setAudioEnabled] = useState(false)
  const knownRedIdsRef = useRef<Set<string>>(new Set())
  const isFirstLoadRef = useRef(true)

  const enableAudio = () => {
    const ctx = getAudioContext()
    if (ctx) {
      ctx.resume().then(() => setAudioEnabled(true)).catch(() => {})
    }
  }

  useEffect(() => {
    if (!reports) return

    const currentRedReports = reports.filter((r) => r.priorityLabel === 'RED')
    const currentRedIds = new Set(currentRedReports.map((r) => r.id))

    if (isFirstLoadRef.current) {
      knownRedIdsRef.current = currentRedIds
      isFirstLoadRef.current = false
      return
    }

    const hasNewRedAlert = currentRedReports.some((r) => !knownRedIdsRef.current.has(r.id))
    if (hasNewRedAlert && audioEnabled) {
      playCriticalAlarm()
    }

    knownRedIdsRef.current = currentRedIds
  }, [reports, audioEnabled])

  const acknowledge = async (reportId: string) => {
    await updateReport(reportId, { status: 'in_progress' })
  }

  // Live Map markers for pending SOS signals
  const markers = useMemo<MapMarker[]>(() => {
    if (!reports) return []
    return reports
      .filter((r) => r.latitude && r.longitude)
      .map((r) => ({
        id: r.id,
        position: { lat: r.latitude!, lng: r.longitude! },
        title: `SOS: ${r.type.toUpperCase()} (${r.trackingId})`,
        subtitle: `${r.description ?? ''} - Reported ${timeAgo(r.createdAt)}`,
        color: r.priorityLabel === 'RED' ? '#dc2626' : '#f59e0b',
        isSos: true,
      }))
  }, [reports])

  const mapCenter: GeoPoint = useMemo(() => {
    if (markers.length > 0) return markers[0].position
    return { lat: 22.5726, lng: 88.3639 }
  }, [markers])

  if (!reports) return <Loader />

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Siren className="h-6 w-6 text-red-600 animate-pulse" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Live Emergency SOS Stream
            </h1>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1">
            <span className="inline-block h-2 w-2 rounded-full bg-red-500 animate-ping" />
            <span>Active Realtime Distress Queue ({reports.length} pending incidents)</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {!audioEnabled ? (
            <Button variant="outline" size="sm" onClick={enableAudio} className="font-bold flex items-center gap-1.5">
              <Volume2 className="h-4 w-4 text-slate-700 dark:text-slate-300" />
              <span>Enable Audio Siren</span>
            </Button>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 shadow-xs">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Siren Active</span>
            </span>
          )}
        </div>
      </div>

      {/* Realistic Tactical Satellite Map */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mono">
          <span>Active Distress Map ({markers.length} Geolocated Incidents)</span>
          <span className="text-[11px] text-slate-400">Layer switcher active (Satellite / Terrain / Streets)</span>
        </div>
        <div className="h-72 rounded-2xl overflow-hidden shadow-xs border border-slate-200 dark:border-slate-800">
          <LeafletMap
            center={mapCenter}
            markers={markers}
            height="100%"
            autoFit={markers.length > 0}
          />
        </div>
      </div>

      {/* Pending SOS Incident Stream */}
      <div className="space-y-3">
        {reports.map((r) => (
          <div
            key={r.id}
            className={`rounded-2xl border bg-white p-5 shadow-xs transition dark:bg-slate-900 ${
              r.priorityLabel === 'RED'
                ? 'border-l-4 border-l-red-600 border-slate-200 dark:border-slate-800'
                : 'border-l-4 border-l-amber-500 border-slate-200 dark:border-slate-800'
            }`}
          >
            <div className="flex flex-wrap items-center gap-2">
              <PriorityBadge label={r.priorityLabel} />
              <span className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100">{r.trackingId}</span>
              <span className="text-xs font-bold capitalize text-slate-800 dark:text-slate-200">{r.type} Emergency</span>
              <Badge value={r.status} />
              <span className="ml-auto text-xs text-slate-400 mono">{timeAgo(r.createdAt)}</span>
            </div>

            <p className="mt-2 text-sm text-slate-800 dark:text-slate-200 font-medium leading-relaxed">{r.description}</p>
            
            <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
              {r.landmark && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-slate-400" />
                  <span>Location: <strong className="text-slate-700 dark:text-slate-300">{r.landmark}</strong></span>
                </div>
              )}
              {r.reporterPhone && (
                <div className="flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5 text-slate-400" />
                  <span>Contact: <a href={`tel:${r.reporterPhone}`} className="text-slate-900 dark:text-slate-100 underline font-mono font-bold hover:text-emerald-600">{r.reporterPhone}</a></span>
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
                    className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
                  >
                    <Navigation className="h-3.5 w-3.5" />
                    <span>Map Directions</span>
                  </a>
                )}
                {r.reporterPhone && (
                  <a
                    href={`tel:${r.reporterPhone}`}
                    className="inline-flex items-center gap-1 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 dark:border-emerald-900/50 dark:bg-emerald-950/50 dark:text-emerald-300 cursor-pointer"
                  >
                    <Phone className="h-3.5 w-3.5" />
                    <span>Call Victim</span>
                  </a>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" onClick={() => acknowledge(r.id)} className="font-bold">
                  Acknowledge & Triage
                </Button>
                <a
                  href={`#/admin/reports`}
                  className="inline-flex items-center gap-1 rounded-xl bg-slate-900 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
                >
                  <span>Dispatch Unit</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          </div>
        ))}

        {reports.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 p-12 text-center text-sm text-slate-400 dark:border-slate-800">
            No pending emergency SOS alerts in queue. Command Center operational.
          </div>
        )}
      </div>
    </div>
  )
}
