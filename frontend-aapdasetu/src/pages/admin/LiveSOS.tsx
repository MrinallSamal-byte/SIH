import { useCallback, useRef } from 'react'
import { listReports } from '../../api/endpoints'
import PriorityBadge from '../../components/common/PriorityBadge'
import Badge from '../../components/common/Badge'
import Loader from '../../components/common/Loader'
import { useRealtime } from '../../hooks/useRealtime'
import { timeAgo } from '../../lib/helpers'
import type { Report } from '../../types'

// Plays a short alarm beep when a NEW RED report arrives.
function useRedAlarm(seen: Set<string>) {
  const lastCount = useRef(seen.size)
  if (seen.size > lastCount.current) {
    lastCount.current = seen.size
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.2, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6)
    osc.start()
    osc.stop(ctx.currentTime + 0.6)
  }
}

export default function LiveSOS() {
  const fetchReports = useCallback(() => listReports({ status: 'pending' }), [])
  const reports = useRealtime<Report[]>(fetchReports, 4000)

  const redIds = new Set((reports ?? []).filter((r) => r.priorityLabel === 'RED').map((r) => r.id))
  useRedAlarm(redIds)

  if (!reports) return <Loader />

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Live SOS stream</h1>
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-red-500" />
          Realtime · polls GET /api/reports every 4s (WebSocket swap in useRealtime.ts)
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {reports.map((r) => (
          <div
            key={r.id}
            className={`rounded-xl border-l-4 bg-white dark:bg-slate-800 p-4 shadow-sm ${
              r.priorityLabel === 'RED' ? 'border-red-500' : r.priorityLabel === 'YELLOW' ? 'border-amber-400' : 'border-emerald-500'
            }`}
          >
            <div className="flex flex-wrap items-center gap-2">
              <PriorityBadge label={r.priorityLabel} />
              <span className="font-mono text-xs text-slate-400 dark:text-slate-500">{r.trackingId}</span>
              <span className="text-sm font-semibold capitalize">{r.type}</span>
              <Badge value={r.status} />
              <span className="ml-auto text-xs text-slate-400 dark:text-slate-500">{timeAgo(r.createdAt)}</span>
            </div>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{r.description}</p>
            {r.landmark && <div className="text-xs text-slate-400 dark:text-slate-500">Location: {r.landmark}</div>}
          </div>
        ))}
        {reports.length === 0 && <div className="text-sm text-slate-400 dark:text-slate-500">No pending SOS alerts.</div>}
      </div>
    </div>
  )
}
