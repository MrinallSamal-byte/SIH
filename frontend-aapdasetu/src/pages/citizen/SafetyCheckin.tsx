import { useState } from 'react'
import { createSafetyCheckin } from '../../api/endpoints'
import { Field, Input, Textarea } from '../../components/common/Input'
import Button from '../../components/common/Button'
import { useToast } from '../../components/common/Toast'
import { getCurrentPosition } from '../../lib/helpers'
import type { CheckinStatus, SafetyCheckin } from '../../types'

export default function SafetyCheckin() {
  const { toast } = useToast()
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [locationName, setLocationName] = useState('')
  const [notes, setNotes] = useState('')
  const [status, setStatus] = useState<CheckinStatus>('safe')
  const [sending, setSending] = useState(false)
  const [confirm, setConfirm] = useState<SafetyCheckin | null>(null)

  const submit = async () => {
    setSending(true)
    try {
      const input: Omit<SafetyCheckin, 'id' | 'createdAt'> = {
        fullName,
        phone,
        status,
        locationName,
        notes,
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
      toast('Safety status recorded')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Check-in failed', 'error')
    } finally {
      setSending(false)
    }
  }

  if (confirm) {
    return (
      <div className="mx-auto max-w-md rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center">
        <div className="text-xs font-bold uppercase tracking-widest text-emerald-700">
          {confirm.status === 'safe' ? 'Status: SAFE' : 'Status: ASSISTANCE'}
        </div>
        <h1 className="mt-2 text-xl font-bold">{confirm.status === 'safe' ? 'You are marked SAFE' : 'Assistance request received'}</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Family and responders can now see your status. {confirm.locationName && `Location: ${confirm.locationName}`}
        </p>
        <Button className="mt-4" variant="secondary" onClick={() => setConfirm(null)}>
          Check in again
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-2xl font-bold">Safety check-in</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Let family and responders know you are safe or need assistance.</p>

      <div className="mt-4 space-y-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6">
        <div className="flex gap-2">
          <Button
            variant={status === 'safe' ? 'primary' : 'outline'}
            className="flex-1"
            onClick={() => setStatus('safe')}
          >
            I am safe
          </Button>
          <Button
            variant={status === 'need_assistance' ? 'danger' : 'outline'}
            className="flex-1"
            onClick={() => setStatus('need_assistance')}
          >
            Need assistance
          </Button>
        </div>
        <Field label="Full name *">
          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required placeholder="Your full name" />
        </Field>
        <Field label="Phone *">
          <Input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            placeholder="10-digit mobile number"
          />
        </Field>
        <Field label="Current location (name)">
          <Input value={locationName} onChange={(e) => setLocationName(e.target.value)} />
        </Field>
        <Field label="Notes (optional)">
          <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
        <Button
          className="w-full"
          variant={status === 'safe' ? 'primary' : 'danger'}
          onClick={submit}
          disabled={sending || !fullName.trim() || !phone.trim()}
        >
          {sending ? 'Sending…' : 'Submit check-in'}
        </Button>
        {(!fullName.trim() || !phone.trim()) && (
          <p className="text-center text-xs text-red-600 dark:text-red-400">Full name and phone are required.</p>
        )}
      </div>
    </div>
  )
}
