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
    listVolunteers().then((vols) => {
      const savedId = localStorage.getItem('aapdasetu_volunteer_session')
      const matched = vols.find((v) => v.id === savedId) || vols[0] || null
      setVolunteer(matched)
    })
  }, [])

  const submit = async () => {
    setSending(true)
    try {
      const input: Parameters<typeof createSafetyCheckin>[0] = {
        fullName: volunteer?.name || 'Volunteer Responder',
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
        const updated = await updateVolunteer(volunteer.id, { status: 'available' })
        setVolunteer(updated)
      }
      toast('Checked in as safe & marked available', 'success')
      setNotes('')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Check-in failed', 'error')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="max-w-md">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Volunteer Check-In</h1>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        Record your safe status and mark yourself available for active missions.
      </p>

      <div className="mt-4 space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        {volunteer && (
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs dark:border-slate-800 dark:bg-slate-950">
            <div className="font-bold text-slate-800 dark:text-slate-200">Responder Profile: {volunteer.name}</div>
            <div className="text-slate-500">{volunteer.phone ?? 'Contact on file'}</div>
          </div>
        )}

        <Field label="Check-in Notes / Current Field Location">
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. reached Sector V camp safely" />
        </Field>
        <Button onClick={submit} disabled={sending} className="w-full font-bold cursor-pointer">
          {sending ? 'Checking in…' : 'Check In & Go Available'}
        </Button>
      </div>
    </div>
  )
}
