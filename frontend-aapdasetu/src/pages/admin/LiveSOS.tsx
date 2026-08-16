import { useCallback, useEffect, useRef, useState } from 'react'
import { listReports, updateReport } from '../../api/endpoints'
import PriorityBadge from '../../components/common/PriorityBadge'
import Badge from '../../components/common/Badge'
import Button from '../../components/common/Button'
import Loader from '../../components/common/Loader'
import { useRealtime } from '../../hooks/useRealtime'
import { timeAgo, getNavigationUrl } from '../../lib/helpers'
import type { Report } from '../../types'

// Singleton Audio Context for reliable browser playback
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
  const reports = useRealtime<Report[]>(fetchReports, 4000)
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

    // Detect if any new RED report arrived
    const hasNewRedAlert = currentRedReports.some((r) => !knownRedIdsRef.current.has(r.id))
    if (hasNewRedAlert && audioEnabled) {
      playCriticalAlarm()
    }

    knownRedIdsRef.current = currentRedIds
  }, [reports, audioEnabled])

  const acknowledge = async (reportId: string) => {
    await updateReport(reportId, { status: 'in_progress' })
  }

  if (!reports) return <Loader />

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Live Emergency SOS Stream</h1>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-500" />
            Active Realtime Incident Queue ({reports.length} pending)
          </div>
        </div>

        <div className="flex items-center gap-3">
          {!audioEnabled ? (
            <Button variant="outline" size="sm" onClick={enableAudio} className="font-bold">
              🔊 Enable Siren Alert
            </Button>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Siren Active
            </span>
          )}
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {reports.map((r) => (
          <div
            key={r.id}
            className={`rounded-2xl border bg-white p-5 shadow-xs dark:bg-slate-900 ${
              r.priorityLabel === 'RED'
                ? 'border-red-500 ring-1 ring-red-500/20'
                : r.priorityLabel === 'YELLOW'
                ? 'border-amber-400'
                : 'border-emerald-500'
            }`}
          >
            <div className="flex flex-wrap items-center gap-2">
              <PriorityBadge label={r.priorityLabel} />
              <span className="font-mono text-xs font-bold text-slate-400 dark:text-slate-500">{r.trackingId}</span>
              <span className="text-sm font-bold capitalize">{r.type} Emergency</span>
              <Badge value={r.status} />
              <span className="ml-auto text-xs text-slate-400 dark:text-slate-500">{timeAgo(r.createdAt)}</span>
            </div>

            <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">{r.description}</p>
            
            <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
              {r.landmark && <div>Location: <strong>{r.landmark}</strong></div>}
              {r.reporterPhone && (
                <div>
                  Contact: <a href={`tel:${r.reporterPhone}`} className="text-blue-600 underline font-medium">{r.reporterPhone}</a>
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
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  >
                    View on Map
                  </a>
                )}
                {r.reporterPhone && (
                  <a
                    href={`tel:${r.reporterPhone}`}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-blue-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800"
                  >
                    Call Victim
                  </a>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" onClick={() => acknowledge(r.id)}>
                  Acknowledge & Triage
                </Button>
                <a
                  href={`#/admin/reports?search=${encodeURIComponent(r.trackingId)}`}
                  className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700"
                >
                  Dispatch Response →
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

