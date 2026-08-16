import { useState, useEffect } from 'react'
import { createSafetyCheckin, listSafetyCheckins } from '../../api/endpoints'
import { Field, Input, Textarea } from '../../components/common/Input'
import Button from '../../components/common/Button'
import Badge from '../../components/common/Badge'
import Loader from '../../components/common/Loader'
import { useToast } from '../../components/common/Toast'
import { getCurrentPosition, formatDateTime } from '../../lib/helpers'
import type { CheckinStatus, SafetyCheckin } from '../../types'

type ActiveTab = 'checkin' | 'search'

export default function SafetyCheckinPage() {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<ActiveTab>('checkin')

  // Checkin form state
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [locationName, setLocationName] = useState('')
  const [notes, setNotes] = useState('')
  const [status, setStatus] = useState<CheckinStatus>('safe')
  const [sending, setSending] = useState(false)
  const [confirm, setConfirm] = useState<SafetyCheckin | null>(null)
  const [phoneError, setPhoneError] = useState<string | null>(null)

  // Search family state
  const [searchQuery, setSearchQuery] = useState('')
  const [allCheckins, setAllCheckins] = useState<SafetyCheckin[] | null>(null)
  const [loadingCheckins, setLoadingCheckins] = useState(false)

  const loadCheckins = () => {
    setLoadingCheckins(true)
    listSafetyCheckins()
      .then((data) => setAllCheckins(data))
      .catch(() => setAllCheckins([]))
      .finally(() => setLoadingCheckins(false))
  }

  useEffect(() => {
    if (activeTab === 'search') {
      loadCheckins()
    }
  }, [activeTab])

  const validatePhone = (raw: string) => {
    const clean = raw.replace(/\D/g, '')
    return clean.length >= 10 && clean.length <= 15
  }

  const submit = async () => {
    if (!fullName.trim()) {
      toast('Please enter your full name', 'error')
      return
    }

    if (!phone.trim() || !validatePhone(phone.trim())) {
      setPhoneError('Please enter a valid 10-digit mobile number.')
      toast('Valid phone number is required', 'error')
      return
    }

    setPhoneError(null)
    setSending(true)
    try {
      const input: Omit<SafetyCheckin, 'id' | 'createdAt'> = {
        fullName: fullName.trim(),
        phone: phone.trim(),
        status,
        locationName: locationName.trim() || undefined,
        notes: notes.trim() || undefined,
      }
      try {
        const pos = await getCurrentPosition()
        input.latitude = pos.coords.latitude
        input.longitude = pos.coords.longitude
      } catch {
        // optional
      }
      const saved = await createSafetyCheckin(input)
      setConfirm(saved)
      toast('Safety status recorded successfully')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Check-in failed', 'error')
    } finally {
      setSending(false)
    }
  }

  const filteredCheckins = (allCheckins ?? []).filter((c) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase().trim()
    return (
      (c.fullName ?? '').toLowerCase().includes(q) ||
      (c.phone && c.phone.includes(q)) ||
      (c.locationName && c.locationName.toLowerCase().includes(q))
    )
  })


  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Disaster Safety Check-in</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Let family, relatives, and disaster authorities know your current status and location.
      </p>

      {/* Tabs */}
      <div className="mt-4 flex gap-2">
        <Button
          variant={activeTab === 'checkin' ? 'primary' : 'outline'}
          onClick={() => setActiveTab('checkin')}
        >
          ✍️ My Safety Check-in
        </Button>
        <Button
          variant={activeTab === 'search' ? 'primary' : 'outline'}
          onClick={() => setActiveTab('search')}
        >
          🔍 Search Family / Friends
        </Button>
      </div>

      {activeTab === 'checkin' && (
        <>
          {confirm ? (
            <div className="mt-5 space-y-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center shadow-sm dark:border-emerald-900/50 dark:bg-emerald-950/40">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
                ✓ Status Recorded
              </div>
              <h2 className="text-xl font-black text-emerald-900 dark:text-emerald-100">
                {confirm.status === 'safe' ? 'You are Marked as SAFE' : 'Assistance Request Logged'}
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Your family, relatives, and rescue teams can now verify your status in the public registry.
                {confirm.locationName && (
                  <span className="block mt-1 font-semibold">📍 Location: {confirm.locationName}</span>
                )}
              </p>

              <div className="flex justify-center gap-2 pt-2">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setConfirm(null)
                    setFullName('')
                    setPhone('')
                    setLocationName('')
                    setNotes('')
                  }}
                >
                  New Check-in
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setActiveTab('search')}
                >
                  View Public Registry
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-4 space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex gap-2">
                <Button
                  variant={status === 'safe' ? 'primary' : 'outline'}
                  className="flex-1 font-bold"
                  onClick={() => setStatus('safe')}
                >
                  🟢 I am Safe
                </Button>
                <Button
                  variant={status === 'need_assistance' ? 'danger' : 'outline'}
                  className="flex-1 font-bold"
                  onClick={() => setStatus('need_assistance')}
                >
                  🚨 Need Assistance
                </Button>
              </div>

              <Field label="Your Full Name *">
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  placeholder="e.g. Ramesh Chandra Sen"
                />
              </Field>

              <div>
                <Field label="Mobile Number (for family lookup) *">
                  <Input
                    type="tel"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value)
                      if (phoneError) setPhoneError(null)
                    }}
                    required
                    placeholder="10-digit mobile number"
                  />
                </Field>
                {phoneError && (
                  <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">{phoneError}</p>
                )}
              </div>

              <Field label="Current Location / Shelter Name">
                <Input
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  placeholder="e.g. Salt Lake Sector V Shelter or At Home"
                />
              </Field>

              <Field label="Additional Message / Notes for Family (optional)">
                <Textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. With 3 family members, power is on, have food/water."
                />
              </Field>

              <Button
                className="w-full py-3 font-bold"
                variant={status === 'safe' ? 'primary' : 'danger'}
                onClick={submit}
                disabled={sending || !fullName.trim() || !phone.trim()}
              >
                {sending ? 'Recording Check-in…' : 'Submit Safety Check-in'}
              </Button>
            </div>
          )}
        </>
      )}

      {activeTab === 'search' && (
        <div className="mt-4 space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <Field label="Search by Name, Phone Number, or Location">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Type name or 10-digit phone number…"
                autoFocus
              />
            </Field>
          </div>

          {loadingCheckins && (
            <div className="flex justify-center py-6">
              <Loader />
            </div>
          )}

          {!loadingCheckins && (
            <div className="space-y-3">
              {filteredCheckins.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-base font-bold text-slate-900 dark:text-slate-100">
                        {item.fullName}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        📞 {item.phone ?? 'Contact on file'}
                      </div>
                    </div>
                    <Badge value={item.status} />
                  </div>

                  {item.locationName && (
                    <div className="mt-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                      📍 {item.locationName}
                    </div>
                  )}

                  {item.notes && (
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 italic">
                      "{item.notes}"
                    </p>
                  )}

                  <div className="mt-2 text-[11px] text-slate-400">
                    Checked in {formatDateTime(item.createdAt)}
                  </div>
                </div>
              ))}

              {filteredCheckins.length === 0 && (
                <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  No check-in records matched your search query.
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
