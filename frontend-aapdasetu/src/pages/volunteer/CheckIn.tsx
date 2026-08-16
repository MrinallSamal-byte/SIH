import { useEffect, useState } from 'react'
import { createSafetyCheckin, listVolunteers, updateVolunteer } from '../../api/endpoints'
import { Field, Input } from '../../components/common/Input'
import Button from '../../components/common/Button'
import { useToast } from '../../components/common/Toast'
import { getCurrentPosition } from '../../lib/helpers'
import type { Volunteer } from '../../types'

export default function CheckIn() {
  const { toast } = useToast()
  const [volunteer, setVolunteer] = useState<Volunteer | null>(null)
  const [notes, setNotes] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    listVolunteers().then((v) => setVolunteer(v[0] ?? null))
  }, [])

  const submit = async () => {
    setSending(true)
    try {
      const input: Parameters<typeof createSafetyCheckin>[0] = {
        fullName: volunteer?.name,
        phone: volunteer?.phone,
        status: 'safe',
        notes,
      }
      try {
        const pos = await getCurrentPosition()
        input.latitude = pos.coords.latitude
        input.longitude = pos.coords.longitude
      } catch {
        // optional
      }
      await createSafetyCheckin(input)
      if (volunteer && volunteer.status !== 'available') {
        await updateVolunteer(volunteer.id, { status: 'available' })
      }
      toast('Checked in as safe & marked available')
      setNotes('')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Check-in failed', 'error')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="max-w-md">
      <h1 className="text-2xl font-bold">Volunteer check-in</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Record your safe status (written to <code>safety_checkins</code>) and mark yourself available for dispatch.
      </p>

      <div className="mt-4 space-y-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-6">
        <Field label="Notes (optional)">
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. reached Sector V camp" />
        </Field>
        <Button onClick={submit} disabled={sending}>
          {sending ? 'Checking in…' : 'Check in & go available'}
        </Button>
      </div>
    </div>
  )
}
