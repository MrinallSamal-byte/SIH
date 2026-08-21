import { useEffect, useState } from 'react'
import { createSafetyCheckin, listVolunteers, updateVolunteer } from '../../api/endpoints'
import { Field, Input } from '../../components/common/Input'
import Button from '../../components/common/Button'
import { useToast } from '../../components/common/Toast'
import { useGeoLocation } from '../../hooks/useLocation'
import { useLanguage } from '../../lib/i18n'
import type { Volunteer } from '../../types'

export default function CheckIn() {
  const { t } = useLanguage()
  const { toast } = useToast()
  const { coords } = useGeoLocation()
  const [volunteer, setVolunteer] = useState<Volunteer | null>(null)
  const [notes, setNotes] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    listVolunteers()
      .then((vols) => {
        const savedId = localStorage.getItem('aapdasetu_volunteer_session')
        const matched = vols.find((v) => v.id === savedId) || null
        setVolunteer(matched)
      })
      .catch(() => setVolunteer(null))
  }, [])

  const submit = async () => {
    setSending(true)
    try {
      const input: Parameters<typeof createSafetyCheckin>[0] = {
        fullName: volunteer?.name || 'Volunteer Responder',
        phone: volunteer?.phone,
        status: 'safe',
        notes,
        latitude: coords?.latitude,
        longitude: coords?.longitude,
      }
      await createSafetyCheckin(input)
      if (volunteer && volunteer.status !== 'available') {
        const updated = await updateVolunteer(volunteer.id, { status: 'available' })
        setVolunteer(updated)
      }
      toast(t('vc.checkedIn'), 'success')
      setNotes('')
    } catch (err) {
      toast(err instanceof Error ? err.message : t('vc.checkinFailed'), 'error')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="max-w-md">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">{t('vc.title')}</h1>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        {t('vc.subtitle')}
      </p>

      <div className="mt-4 space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        {volunteer && (
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs dark:border-slate-800 dark:bg-slate-950">
            <div className="font-bold text-slate-800 dark:text-slate-200">{t('vc.responderProfile')}: {volunteer.name}</div>
            <div className="text-slate-500">{volunteer.phone ?? t('vc.contactOnFile')}</div>
          </div>
        )}

        <Field label={t('vc.notesLabel')}>
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('vc.notesPlaceholder')} />
        </Field>
        <Button onClick={submit} disabled={sending} className="w-full font-bold cursor-pointer">
          {sending ? t('vc.checkingIn') : t('vc.checkInGo')}
        </Button>
      </div>
    </div>
  )
}
