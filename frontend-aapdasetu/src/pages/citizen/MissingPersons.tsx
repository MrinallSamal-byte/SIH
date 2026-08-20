import { useEffect, useState, useRef } from 'react'
import {
  Users,
  Search,
  Phone,
  MapPin,
  User,
  Image as ImageIcon,
  X
} from 'lucide-react'
import { createMissingPerson, listMissingPersons } from '../../api/endpoints'
import { Field, Input } from '../../components/common/Input'
import Button from '../../components/common/Button'
import Badge from '../../components/common/Badge'
import Loader from '../../components/common/Loader'
import { useToast } from '../../components/common/Toast'
import { useLanguage } from '../../lib/i18n'
import { compressImage, maskPhone } from '../../lib/helpers'
import type { MissingPerson } from '../../types'

type Tab = 'registry' | 'report'
type StatusFilter = 'all' | 'open' | 'matched' | 'resolved'

export default function MissingPersons() {
  const { t } = useLanguage()
  const [tab, setTab] = useState<Tab>('registry')
  const [persons, setPersons] = useState<MissingPerson[] | null>(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<StatusFilter>('all')
  const [enlargedPhoto, setEnlargedPhoto] = useState<string | null>(null)

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
      <div className="flex items-center gap-2 mb-1">
        <Users className="h-6 w-6 text-slate-900 dark:text-slate-100" />
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          {t('missing.title')}
        </h1>
      </div>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        {t('missing.subtitle')}
      </p>

      <div className="mt-4 flex gap-2">
        <Button variant={tab === 'registry' ? 'primary' : 'outline'} onClick={() => setTab('registry')}>
          {t('missing.tabRegistry')} ({persons?.length ?? 0})
        </Button>
        <Button variant={tab === 'report' ? 'danger' : 'outline'} onClick={() => setTab('report')}>
          {t('missing.tabReport')}
        </Button>
      </div>

      {tab === 'registry' && (
        <div className="mt-4 space-y-4">
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:flex-row sm:items-center dark:border-slate-800 dark:bg-slate-900">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('missing.searchPlaceholder')}
                className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3.5 py-2 text-sm outline-none focus:border-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-300"
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
                      ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
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
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="flex items-start gap-4">
                    {/* Photo thumbnail */}
                    {p.photoUrl ? (
                      <button
                        type="button"
                        onClick={() => setEnlargedPhoto(p.photoUrl ?? null)}
                        className="group relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800"
                      >
                        <img src={p.photoUrl} alt={p.name} className="h-full w-full object-cover transition" />
                        <span className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition group-hover:opacity-100 text-[10px] font-bold text-white">
                          View
                        </span>
                      </button>
                    ) : (
                      <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
                        <User className="h-8 w-8" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-base font-bold text-slate-900 dark:text-slate-100">
                            {p.name}
                            {p.age !== undefined && (
                              <span className="ml-2 text-xs font-normal text-slate-500 dark:text-slate-400 mono">
                                (Age: {p.age})
                              </span>
                            )}
                          </div>
                          <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                            Gender: <strong className="capitalize">{p.gender || 'Not specified'}</strong>
                          </div>
                        </div>
                        <Badge value={p.status} />
                      </div>

                      <div className="mt-2 space-y-1 text-xs text-slate-600 dark:text-slate-300">
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 text-slate-400" />
                          <span>{t('missing.lastSeen')}: <strong>{p.lastSeenLocation ?? 'Unknown'}</strong></span>
                        </div>
                        {p.clothes && (
                          <div className="text-slate-500 italic">
                            {t('missing.clothes')}: {p.clothes}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {p.contactPhone && (
                    <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
                      <span className="text-xs text-slate-500 mono">{t('missing.contact')}: {maskPhone(p.contactPhone)}</span>
                      <a
                        href={`tel:${p.contactPhone}`}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1 text-xs font-bold text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
                      >
                        <Phone className="h-3 w-3" />
                        <span>{t('missing.callLead')}</span>
                      </a>
                    </div>
                  )}
                </div>
              ))}

              {filteredPersons.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-300 p-12 text-center text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
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
          }}
        />
      )}

      {/* Enlarged Photo Modal */}
      {enlargedPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setEnlargedPhoto(null)}
        >
          <div className="relative max-w-lg overflow-hidden rounded-2xl bg-white p-3 dark:bg-slate-900 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <img src={enlargedPhoto} alt="Enlarged visual ID" className="max-h-[80vh] w-full rounded-xl object-contain" />
            <button
              type="button"
              onClick={() => setEnlargedPhoto(null)}
              className="mt-3 w-full rounded-xl bg-slate-100 py-2 text-xs font-bold text-slate-800 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"
            >
              Close Preview
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function ReportMissingForm({ onSubmitted }: { onSubmitted: (p: MissingPerson) => void }) {
  const { t } = useLanguage()
  const { toast } = useToast()
  const [name, setName] = useState('')
  const [age, setAge] = useState('')
  const [gender, setGender] = useState('male')
  const [lastSeenLocation, setLastSeenLocation] = useState('')
  const [clothes, setClothes] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null)
  const [compressing, setCompressing] = useState(false)
  const [sending, setSending] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setCompressing(true)
    try {
      const compressed = await compressImage(file, 800, 0.75)
      setPhotoDataUrl(compressed)
      toast('Photo attached and optimized for disaster upload')
    } catch {
      toast('Could not process photo', 'error')
    } finally {
      setCompressing(false)
    }
  }

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
      const parsedAge = age.trim() ? parseInt(age.trim(), 10) : undefined
      const validAge = parsedAge !== undefined && !isNaN(parsedAge) && parsedAge >= 0 ? parsedAge : undefined

      const person = await createMissingPerson({
        name: name.trim(),
        age: validAge,
        gender,
        lastSeenLocation: lastSeenLocation.trim(),
        clothes: clothes.trim() || undefined,
        contactPhone: contactPhone.trim(),
        photoUrl: photoDataUrl || undefined,
      })
      toast('Missing person registered in system')
      onSubmitted(person)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Submission failed', 'error')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="mt-4 space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
      <Field label={`${t('missing.personName')} *`}>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('missing.personName')} required />
      </Field>

      {/* Photo Upload with preview */}
      <div>
        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
          {t('missing.uploadPhoto')}
        </label>
        <div className="flex items-center gap-3">
          {photoDataUrl ? (
            <div className="relative h-16 w-16 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
              <img src={photoDataUrl} alt="Preview" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => setPhotoDataUrl(null)}
                className="absolute right-0 top-0 rounded-bl bg-red-600 p-0.5 text-[9px] text-white"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-slate-400 dark:border-slate-700 dark:bg-slate-800">
              <ImageIcon className="h-6 w-6" />
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoSelect}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={compressing}
            onClick={() => fileInputRef.current?.click()}
          >
            {compressing ? 'Optimizing…' : photoDataUrl ? 'Change Photo' : t('missing.uploadPhoto')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label={t('missing.age')}>
          <Input type="number" min="0" max="120" value={age} onChange={(e) => setAge(e.target.value)} placeholder="e.g. 35" />
        </Field>
        <Field label={t('missing.gender')}>
          <select
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          >
            <option value="male">{t('missing.male')}</option>
            <option value="female">{t('missing.female')}</option>
            <option value="other">{t('missing.other')}</option>
          </select>
        </Field>
      </div>

      <Field label={`${t('missing.lastSeen')} *`}>
        <Input
          value={lastSeenLocation}
          onChange={(e) => setLastSeenLocation(e.target.value)}
          placeholder="e.g. Near Salt Lake Karunamoyee Bus Stand"
          required
        />
      </Field>

      <Field label={t('missing.clothes')}>
        <Input
          value={clothes}
          onChange={(e) => setClothes(e.target.value)}
          placeholder="e.g. Blue shirt, black jeans, wears spectacles"
        />
      </Field>

      <Field label={`${t('missing.contact')} *`}>
        <Input
          type="tel"
          value={contactPhone}
          onChange={(e) => setContactPhone(e.target.value)}
          placeholder={t('report.phonePlaceholder')}
          required
        />
      </Field>

      <Button
        variant="danger"
        onClick={submit}
        disabled={sending || !name.trim() || !lastSeenLocation.trim() || !contactPhone.trim()}
        className="w-full py-3 font-bold"
      >
        {sending ? t('common.loading') : t('missing.submitReport')}
      </Button>
    </div>
  )
}
