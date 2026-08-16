import { useEffect, useState } from 'react'
import { createMissingPerson, listMissingPersons } from '../../api/endpoints'
import { Field, Input } from '../../components/common/Input'
import Button from '../../components/common/Button'
import Badge from '../../components/common/Badge'
import Loader from '../../components/common/Loader'
import { useToast } from '../../components/common/Toast'
import type { MissingPerson } from '../../types'

type Tab = 'registry' | 'report'

export default function MissingPersons() {
  const { toast } = useToast()
  const [tab, setTab] = useState<Tab>('registry')
  const [persons, setPersons] = useState<MissingPerson[] | null>(null)

  useEffect(() => {
    listMissingPersons().then(setPersons)
  }, [])

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold">Missing persons & forensic registry</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Report a missing loved one or search the public registry.</p>

      <div className="mt-4 flex gap-2">
        <Button variant={tab === 'registry' ? 'primary' : 'outline'} onClick={() => setTab('registry')}>
          Registry
        </Button>
        <Button variant={tab === 'report' ? 'danger' : 'outline'} onClick={() => setTab('report')}>
          Report missing
        </Button>
      </div>

      {tab === 'registry' && (persons === null ? <Loader /> : <Registry persons={persons} />)}
      {tab === 'report' && <ReportMissingForm onSubmitted={(p) => { setPersons((prev) => (prev ? [p, ...prev] : prev)); toast('Missing person report submitted') }} />}
    </div>
  )
}

function Registry({ persons }: { persons: MissingPerson[] }) {
  return (
    <div className="mt-4 space-y-3">
      {persons.map((p) => (
        <div key={p.id} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <div className="flex items-center justify-between">
            <div className="font-semibold">
              {p.name} {p.age !== undefined && <span className="text-sm text-slate-500 dark:text-slate-400">· age {p.age}</span>}
            </div>
            <Badge value={p.status} />
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Last seen: {p.lastSeenLocation ?? '—'} {p.lastSeenAt ? `at ${new Date(p.lastSeenAt).toLocaleString()}` : ''}
          </div>
          {p.clothes && <div className="text-xs text-slate-500 dark:text-slate-400">Clothes: {p.clothes}</div>}
          {p.contactPhone && <div className="mt-1 text-xs text-slate-400 dark:text-slate-500">Contact: {p.contactPhone}</div>}
        </div>
      ))}
      {persons.length === 0 && <div className="text-sm text-slate-400 dark:text-slate-500">No records yet.</div>}
    </div>
  )
}

function ReportMissingForm({ onSubmitted }: { onSubmitted: (p: MissingPerson) => void }) {
  const [name, setName] = useState('')
  const [age, setAge] = useState('')
  const [gender, setGender] = useState('')
  const [lastSeenLocation, setLastSeenLocation] = useState('')
  const [clothes, setClothes] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [sending, setSending] = useState(false)

  const submit = async () => {
    if (!name.trim() || !lastSeenLocation.trim()) return
    setSending(true)
    try {
      const person = await createMissingPerson({
        name,
        age: age ? Number(age) : undefined,
        gender,
        lastSeenLocation,
        clothes,
        contactPhone,
      })
      onSubmitted(person)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="mt-4 space-y-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 p-6">
      <Field label="Full name *">
        <Input value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Age">
          <Input type="number" value={age} onChange={(e) => setAge(e.target.value)} />
        </Field>
        <Field label="Gender">
          <Input value={gender} onChange={(e) => setGender(e.target.value)} />
        </Field>
      </div>
      <Field label="Last seen location *">
        <Input value={lastSeenLocation} onChange={(e) => setLastSeenLocation(e.target.value)} />
      </Field>
      <Field label="Clothing description">
        <Input value={clothes} onChange={(e) => setClothes(e.target.value)} />
      </Field>
      <Field label="Contact phone">
        <Input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
      </Field>
      <Button variant="danger" onClick={submit} disabled={sending || !name.trim() || !lastSeenLocation.trim()}>
        {sending ? 'Submitting…' : 'Report missing person'}
      </Button>
    </div>
  )
}
