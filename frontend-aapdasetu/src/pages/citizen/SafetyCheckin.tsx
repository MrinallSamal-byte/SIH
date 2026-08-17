import { useState, useEffect } from 'react'
import { createSafetyCheckin, listSafetyCheckins } from '../../api/endpoints'
import { Field, Input, Textarea } from '../../components/common/Input'
import Button from '../../components/common/Button'
import Badge from '../../components/common/Badge'
import Loader from '../../components/common/Loader'
import { useToast } from '../../components/common/Toast'
import { useLanguage } from '../../lib/i18n'
import { getCurrentPosition, formatDateTime, maskPhone } from '../../lib/helpers'
import type { CheckinStatus, SafetyCheckin } from '../../types'

type ActiveTab = 'checkin' | 'search'

export default function SafetyCheckinPage() {
  const { t } = useLanguage()
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
      setPhoneError(t('sos.phoneInvalidError'))
      toast(t('sos.phoneInvalidError'), 'error')
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
      toast(t('checkin.successTitle'))
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
      <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">{t('checkin.title')}</h1>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        {t('checkin.subtitle')}
      </p>

      {/* Tabs */}
      <div className="mt-4 flex gap-2">
        <Button
          variant={activeTab === 'checkin' ? 'primary' : 'outline'}
          onClick={() => setActiveTab('checkin')}
          className="cursor-pointer"
        >
          {t('checkin.tabCheckin')}
        </Button>
        <Button
          variant={activeTab === 'search' ? 'primary' : 'outline'}
          onClick={() => setActiveTab('search')}
          className="cursor-pointer"
        >
          {t('checkin.tabSearch')}
        </Button>
      </div>

      {activeTab === 'checkin' && (
        <>
          {confirm ? (
            <div className="mt-5 space-y-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center shadow-sm dark:border-emerald-900/50 dark:bg-emerald-950/40">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
                ✓ {t('checkin.successTitle')}
              </div>
              <h2 className="text-xl font-bold text-emerald-900 dark:text-emerald-100">
                {confirm.status === 'safe' ? t('checkin.statusSafe') : t('checkin.statusHelp')}
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                {t('checkin.successDesc')}
                {confirm.locationName && (
                  <span className="block mt-1 font-semibold">{t('common.location')}: {confirm.locationName}</span>
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
                  className="cursor-pointer"
                >
                  {t('report.newReportBtn')}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setActiveTab('search')}
                  className="cursor-pointer"
                >
                  {t('checkin.tabSearch')}
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-4 space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex gap-2">
                <Button
                  variant={status === 'safe' ? 'primary' : 'outline'}
                  className="flex-1 font-bold cursor-pointer"
                  onClick={() => setStatus('safe')}
                >
                  {t('checkin.statusSafe')}
                </Button>
                <Button
                  variant={status === 'need_assistance' ? 'danger' : 'outline'}
                  className="flex-1 font-bold cursor-pointer"
                  onClick={() => setStatus('need_assistance')}
                >
                  {t('checkin.statusHelp')}
                </Button>
              </div>

              <Field label={t('checkin.fullName')}>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  placeholder={t('checkin.fullNamePlaceholder')}
                />
              </Field>

              <div>
                <Field label={t('checkin.phone')}>
                  <Input
                    type="tel"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value)
                      if (phoneError) setPhoneError(null)
                    }}
                    required
                    placeholder={t('checkin.phonePlaceholder')}
                  />
                </Field>
                {phoneError && (
                  <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">{phoneError}</p>
                )}
              </div>

              <Field label={t('checkin.location')}>
                <Input
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  placeholder={t('checkin.locationPlaceholder')}
                />
              </Field>

              <Field label={t('checkin.notesLabel')}>
                <Textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t('checkin.notesPlaceholder')}
                />
              </Field>

              <Button
                className="w-full py-3 font-bold cursor-pointer"
                variant={status === 'safe' ? 'primary' : 'danger'}
                onClick={submit}
                disabled={sending || !fullName.trim() || !phone.trim()}
              >
                {sending ? t('common.loading') : t('checkin.submitBtn')}
              </Button>
            </div>
          )}
        </>
      )}

      {activeTab === 'search' && (
        <div className="mt-4 space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <Field label={t('checkin.tabSearch')}>
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('checkin.searchPlaceholder')}
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
                        {maskPhone(item.phone)}
                      </div>
                    </div>
                    <Badge value={item.status} />
                  </div>

                  {item.locationName && (
                    <div className="mt-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {item.locationName}
                    </div>
                  )}

                  {item.notes && (
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 italic">
                      "{item.notes}"
                    </p>
                  )}

                  <div className="mt-2 text-[11px] text-slate-400">
                    {t('checkin.postedAt')} {formatDateTime(item.createdAt)}
                  </div>
                </div>
              ))}

              {filteredCheckins.length === 0 && (
                <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  {t('checkin.noneFound')}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
