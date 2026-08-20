import { useEffect, useState } from 'react'
import { listMissingPersons, updateMissingPerson } from '../../api/endpoints'
import { Select } from '../../components/common/Input'
import Button from '../../components/common/Button'
import Badge from '../../components/common/Badge'
import Loader from '../../components/common/Loader'
import { useToast } from '../../components/common/Toast'
import type { MissingPerson } from '../../types'

export default function MissingPersons() {
  const { toast } = useToast()
  const [persons, setPersons] = useState<MissingPerson[] | null>(null)

  useEffect(() => {
    listMissingPersons().then(setPersons)
  }, [])

  const update = async (id: string, patch: Partial<MissingPerson>) => {
    await updateMissingPerson(id, patch)
    setPersons((prev) => (prev ? prev.map((p) => (p.id === id ? { ...p, ...patch } : p)) : prev))
    toast('Record updated')
  }

  if (!persons) return <Loader />

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Missing persons registry</h1>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Case management and match tracking.</p>

      <div className="mt-4 space-y-3">
        {persons.map((p) => (
          <div key={p.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold">{p.name}</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">{p.age !== undefined ? `age ${p.age}` : ''} · {p.gender ?? ''}</span>
              <Badge value={p.status} />
              <span className="ml-auto">
                <Select
                  value={p.status}
                  onChange={(e) => update(p.id, { status: e.target.value as MissingPerson['status'] })}
                  className="w-auto py-1 text-xs"
                >
                  <option value="open">open</option>
                  <option value="matched">matched</option>
                  <option value="resolved">resolved</option>
                </Select>
              </span>
            </div>
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Last seen: {p.lastSeenLocation ?? '—'}
              {p.clothes ? ` · Clothes: ${p.clothes}` : ''}
            </div>
            <Button variant="outline" className="mt-2" onClick={() => update(p.id, { status: 'matched' })}>
              Mark matched
            </Button>
          </div>
        ))}
        {persons.length === 0 && <div className="text-sm text-slate-400 dark:text-slate-500">No records.</div>}
      </div>
    </div>
  )
}
