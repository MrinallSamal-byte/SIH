import { useCallback, useState } from 'react'
import { listShelters, updateShelter } from '../../api/endpoints'
import Badge from '../../components/common/Badge'
import Loader from '../../components/common/Loader'
import { useRealtime } from '../../hooks/useRealtime'
import { useToast } from '../../components/common/Toast'
import type { Shelter } from '../../types'

export default function Shelters() {
  const { toast } = useToast()
  const fetchShelters = useCallback(() => listShelters(), [])
  const shelters = useRealtime<Shelter[]>(fetchShelters, 10000)
  const [occupancy, setOccupancy] = useState<Record<string, string>>({})

  const save = async (s: Shelter) => {
    const value = Number(occupancy[s.id])
    if (Number.isNaN(value)) return
    const next = await updateShelter(s.id, {
      occupancy: value,
      status: value >= s.capacity ? 'full' : 'open',
    })
    setOccupancy((prev) => ({ ...prev, [s.id]: '' }))
    toast(`${next.name} updated to ${value}/${s.capacity}`)
  }

  if (!shelters) return <Loader />

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Relief shelters & capacity</h1>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Update occupancy numbers and operational status.</p>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {shelters.map((s) => {
          const pct = s.capacity ? Math.round((s.occupancy / s.capacity) * 100) : 0
          return (
            <div key={s.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">{s.name}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{s.address}</div>
                </div>
                <Badge value={s.status} />
              </div>
              <div className="mt-2">
                <div className="flex justify-between text-xs">
                  <span>Occupancy {s.occupancy}/{s.capacity}</span>
                  <span>{pct}%</span>
                </div>
                <div className="mt-1 h-2 rounded bg-slate-100">
                  <div className={`h-2 rounded ${pct >= 90 ? 'bg-red-500' : pct >= 60 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {s.facilities.map((f) => (
                  <span key={f} className="rounded bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600 dark:text-slate-300">{f.replace('_', ' ')}</span>
                ))}
              </div>
              <div className="mt-3 flex gap-2">
                <input
                  type="number"
                  placeholder={`Set occupancy (0–${s.capacity})`}
                  value={occupancy[s.id] ?? ''}
                  onChange={(e) => setOccupancy((prev) => ({ ...prev, [s.id]: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                />
                <button
                  onClick={() => save(s)}
                  className="shrink-0 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  Save
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
