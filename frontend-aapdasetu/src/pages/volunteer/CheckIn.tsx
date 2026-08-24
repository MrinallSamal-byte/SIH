import { useEffect, useState } from 'react'
import { createSafetyCheckin, setVolunteerStatus, volunteerMe } from '../../api/endpoints'
import { Field, Input } from '../../components/common/Input'
import Button from '../../components/common/Button'
import { useToast } from '../../components/common/Toast'
import { useGeoLocation } from '../../hooks/useLocation'
import { useLanguage } from '../../lib/i18n'

const CHECKIN_COOLDOWN_MS = 5 * 60 * 1000

type VolunteerProfile = Awaited<ReturnType<typeof volunteerMe>> & { status?: string }

export default function CheckIn() {
  const { t } = useLanguage()
  const { toast } = useToast()
  const { coords, status: geoStatus, isFallback } = useGeoLocation()
  const [volunteer, setVolunteer] = useState<VolunteerProfile | null>(null)
  const [notes, setNotes] = useState('')
  const [sending, setSending] = useState(false)
  const [lastSuccessAt, setLastSuccessAt] = useState(0)

  // ponytail: duplicate-prevention cooldown — re-enable the button when it expires
  useEffect(() => {
    if (!lastSuccessAt) return
    const remaining = lastSuccessAt + CHECKIN_COOLDOWN_MS - Date.now()
    if (remaining <= 0) {
      setLastSuccessAt(0)
      return
    }
    const id = window.setTimeout(() => setLastSuccessAt(0), remaining)
    return () => window.clearTimeout(id)
  }, [lastSuccessAt])

  useEffect(() => {
    volunteerMe()
      .then(setVolunteer)
      .catch(() => setVolunteer(null))
  }, [])

  // ponytail: only send real GPS coords; IP/default fallbacks are not consented location
  const shareLocation = geoStatus === 'granted' && !isFallback

  const submit = async () => {
    setSending(true)
    try {
      const input: Parameters<typeof createSafetyCheckin>[0] = {
        fullName: volunteer?.name || 'Volunteer Responder',
        phone: volunteer?.phone,
        status: 'safe',
        notes,
        latitude: shareLocation ? coords?.latitude : undefined,
        longitude: shareLocation ? coords?.longitude : undefined,
      }
      await createSafetyCheckin(input)
      try {
        if (volunteer?.status && volunteer.status !== 'available') {
          await setVolunteerStatus('available')
          setVolunteer({ ...volunteer, status: 'available' })
        }
      } catch {
        // ponytail: status reset is best-effort; check-in already succeeded
      }
      setLastSuccessAt(Date.now())
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

      <div className="mt-4 space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {volunteer && (
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs dark:border-slate-800 dark:bg-slate-950">
            <div className="font-bold text-slate-800 dark:text-slate-200">{t('vc.responderProfile')}: {volunteer.name}</div>
            <div className="text-slate-500">{volunteer.phone ?? t('vc.contactOnFile')}</div>
          </div>
        )}

        <Field label={t('vc.notesLabel')}>
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('vc.notesPlaceholder')} />
        </Field>
        <Button
          onClick={submit}
          disabled={sending || Date.now() < lastSuccessAt + CHECKIN_COOLDOWN_MS}
          className="w-full font-bold cursor-pointer"
        >
          {sending ? t('vc.checkingIn') : t('vc.checkInGo')}
        </Button>
        {!shareLocation && (
          <p className="text-xs text-slate-400 dark:text-slate-500">Location not shared</p>
        )}
      </div>
    </div>
  )
}
