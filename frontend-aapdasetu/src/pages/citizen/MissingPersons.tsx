import { useEffect, useState } from 'react'
import { createMissingPerson, listMissingPersons } from '../../api/endpoints'
import { Field, Input } from '../../components/common/Input'
import Button from '../../components/common/Button'
import Badge from '../../components/common/Badge'
import Loader from '../../components/common/Loader'
import { useToast } from '../../components/common/Toast'
import type { MissingPerson } from '../../types'

type Tab = 'registry' | 'report'
type StatusFilter = 'all' | 'open' | 'matched' | 'resolved'

export default function MissingPersons() {
  const { toast } = useToast()
  const [tab, setTab] = useState<Tab>('registry')
  const [persons, setPersons] = useState<MissingPerson[] | null>(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<StatusFilter>('all')

  useEffect(() => {
    listMissingPersons().then(setPersons).catch(() => setPersons([]))
  }, [])

  const filteredPersons = (persons ?? []).filter((p) => {
    const matchesFilter = filter === 'all' || p.status === filter
    if (!matchesFilter) return false
    if (!search.trim()) return true
    const q = search.toLowerCase().trim()
    return (
      p.name.toLowerCase().includes(q) ||
      (p.lastSeenLocation && p.lastSeenLocation.toLowerCase().includes(q)) ||
      (p.clothes && p.clothes.toLowerCase().includes(q))
    )
  })

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
        Missing Persons & Forensic Registry
      </h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Search public missing reports or register a missing loved one with rescue teams and shelters.
      </p>

      <div className="mt-4 flex gap-2">
        <Button variant={tab === 'registry' ? 'primary' : 'outline'} onClick={() => setTab('registry')}>
          📋 Public Registry ({persons?.length ?? 0})
        </Button>
        <Button variant={tab === 'report' ? 'danger' : 'outline'} onClick={() => setTab('report')}>
          🚨 Report Missing Person
        </Button>
      </div>

      {tab === 'registry' && (
        <div className="mt-4 space-y-4">
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center dark:border-slate-800 dark:bg-slate-900">
            <div className="flex-1">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, location, clothing…"
              />
            </div>
            <div className="flex flex-wrap gap-1">
              {(['all', 'open', 'matched', 'resolved'] as StatusFilter[]).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setFilter(st)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold uppercase transition ${
                    filter === st
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {persons === null ? (
            <div className="flex justify-center py-6">
              <Loader />
            </div>
          ) : (
            <div className="space-y-3">
              {filteredPersons.map((p) => (
                <div
                  key={p.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-base font-bold text-slate-900 dark:text-slate-100">
                        {p.name}
                        {p.age !== undefined && (
                          <span className="ml-2 text-xs font-normal text-slate-500 dark:text-slate-400">
                            (Age: {p.age})
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        Gender: <strong>{p.gender || 'Not specified'}</strong>
                      </div>
                    </div>
                    <Badge value={p.status} />
                  </div>

                  <div className="mt-3 space-y-1 text-xs text-slate-600 dark:text-slate-300">
                    <div>
                      📍 Last Seen Location: <strong>{p.lastSeenLocation ?? 'Unknown'}</strong>
                    </div>
                    {p.lastSeenAt && (
                      <div>
                        🕒 Last Seen Time: {new Date(p.lastSeenAt).toLocaleString()}
                      </div>
                    )}
                    {p.clothes && (
                      <div>
                        👕 Clothing: <span className="italic">{p.clothes}</span>
                      </div>
                    )}
                  </div>

                  {p.contactPhone && (
                    <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
                      <span className="text-xs text-slate-500">Contact: {p.contactPhone}</span>
                      <a
                        href={`tel:${p.contactPhone}`}
                        className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-blue-700"
                      >
                        📞 Call Family
                      </a>
                    </div>
                  )}
                </div>
              ))}

              {filteredPersons.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  No missing person records matched your search.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {tab === 'report' && (
        <ReportMissingForm
          onSubmitted={(p) => {
            setPersons((prev) => (prev ? [p, ...prev] : [p]))
            setTab('registry')
            toast('Missing person registered in system')
          }}
        />
      )}
    </div>
  )
}

function ReportMissingForm({ onSubmitted }: { onSubmitted: (p: MissingPerson) => void }) {
  const { toast } = useToast()
  const [name, setName] = useState('')
  const [age, setAge] = useState('')
  const [gender, setGender] = useState('male')
  const [lastSeenLocation, setLastSeenLocation] = useState('')
  const [clothes, setClothes] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [sending, setSending] = useState(false)

  const submit = async () => {
    if (!name.trim()) {
      toast('Please enter the missing person name', 'error')
      return
    }
    if (!lastSeenLocation.trim()) {
      toast('Please specify the last seen location', 'error')
      return
    }
    if (!contactPhone.trim() || contactPhone.replace(/\D/g, '').length < 10) {
      toast('Please provide a valid 10-digit contact phone number', 'error')
      return
    }

    setSending(true)
    try {
      const person = await createMissingPerson({
        name: name.trim(),
        age: age ? Number(age) : undefined,
        gender,
        lastSeenLocation: lastSeenLocation.trim(),
        clothes: clothes.trim() || undefined,
        contactPhone: contactPhone.trim(),
      })
      onSubmitted(person)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Submission failed', 'error')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="mt-4 space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <Field label="Missing Person Full Name *">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name of missing person" required />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Age">
          <Input type="number" value={age} onChange={(e) => setAge(e.target.value)} placeholder="e.g. 35" />
        </Field>
        <Field label="Gender">
          <select
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          >
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </Field>
      </div>

      <Field label="Last Seen Location / Landmark *">
        <Input
          value={lastSeenLocation}
          onChange={(e) => setLastSeenLocation(e.target.value)}
          placeholder="e.g. Near Salt Lake Karunamoyee Bus Stand"
          required
        />
      </Field>

      <Field label="Clothing & Physical Description">
        <Input
          value={clothes}
          onChange={(e) => setClothes(e.target.value)}
          placeholder="e.g. Blue shirt, black jeans, wears spectacles"
        />
      </Field>

      <Field label="Your Contact Phone (to report sightings) *">
        <Input
          type="tel"
          value={contactPhone}
          onChange={(e) => setContactPhone(e.target.value)}
          placeholder="10-digit mobile number"
          required
        />
      </Field>

      <Button
        variant="danger"
        onClick={submit}
        disabled={sending || !name.trim() || !lastSeenLocation.trim() || !contactPhone.trim()}
        className="w-full py-3 font-bold"
      >
        {sending ? 'Submitting Report…' : 'Register Missing Person'}
      </Button>
    </div>
  )
}
