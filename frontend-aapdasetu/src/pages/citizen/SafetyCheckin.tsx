import { useState, useEffect } from 'react'
import {
  ShieldCheck,
  MapPin,
  CheckCircle2,
  Search,
  AlertTriangle
} from 'lucide-react'
import { createSafetyCheckin, listSafetyCheckins } from '../../api/endpoints'
import { Field, Input, Textarea } from '../../components/common/Input'
import Button from '../../components/common/Button'
import Badge from '../../components/common/Badge'
import Loader from '../../components/common/Loader'
import { useToast } from '../../components/common/Toast'
import { useLanguage } from '../../lib/i18n'
import { formatDateTime, maskPhone } from '../../lib/helpers'
import { useGeoLocation } from '../../hooks/useLocation'
import type { CheckinStatus, SafetyCheckin } from '../../types'

type ActiveTab = 'checkin' | 'search'

export default function SafetyCheckinPage() {
  const { t } = useLanguage()
  const { toast } = useToast()
  const { coords, status: geoStatus, isFallback } = useGeoLocation()
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
    // Indian mobile numbers, with optional 0/91 trunk prefixes.
    const clean = raw.replace(/\D/g, '')
    return /^(?:0|91)?[6-9]\d{9}$/.test(clean)
  }

  const submit = async () => {
    if (!fullName.trim()) {
      toast(t('checkin.errName'), 'error')
      return
    }

    if (!phone.trim() || !validatePhone(phone.trim())) {
      setPhoneError(t('checkin.errPhoneDisplay'))
      toast(t('checkin.errPhoneToast'), 'error')
      return
    }
    if (!locationName.trim()) {
      toast(t('checkin.errLocation'), 'error')
      return
    }

    setPhoneError(null)
    setSending(true)
    try {
      // Provenance gate: attach coordinates only from a granted, non-fallback
      // fix — never the fabricated default/IP estimate.
      const hasVerifiedCoords = geoStatus === 'granted' && !isFallback
      const input: Omit<SafetyCheckin, 'id' | 'createdAt'> = {
        fullName: fullName.trim().slice(0, 100),
        phone: phone.replace(/\D/g, ''),
        status,
        locationName: locationName.trim().slice(0, 200) || undefined,
        notes: notes.trim().slice(0, 500) || undefined,
        latitude: hasVerifiedCoords ? coords?.latitude : undefined,
        longitude: hasVerifiedCoords ? coords?.longitude : undefined,
      }
      const saved = await createSafetyCheckin(input)
      setConfirm(saved)
      toast(t('checkin.recordedToast'))
    } catch (err) {
      toast(err instanceof Error ? err.message : t('common.submissionFailed'), 'error')
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
      <div className="flex items-center gap-2 mb-1">
        <ShieldCheck className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-800 dark:text-slate-300">
          {t('checkin.title')}
        </h1>
      </div>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        {t('checkin.subtitle')}
      </p>

      {/* Tabs */}
      <div className="mt-4 flex gap-2">
        <Button
          variant={activeTab === 'checkin' ? 'primary' : 'outline'}
          onClick={() => setActiveTab('checkin')}
        >
          {t('checkin.myCheckin')}
        </Button>
        <Button
          variant={activeTab === 'search' ? 'primary' : 'outline'}
          onClick={() => setActiveTab('search')}
        >
          {t('checkin.searchFamily')}
        </Button>
      </div>

      {activeTab === 'checkin' && (
        <>
          {confirm ? (
            <div className="mt-5 space-y-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center shadow-sm dark:border-emerald-900/50 dark:bg-emerald-950/40">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-300" />
                <span>{t('checkin.statusRecorded')}</span>
              </div>
              <h2 className="text-xl font-bold text-emerald-900 dark:text-emerald-100">
                {confirm.status === 'safe' ? t('checkin.markedSafe') : t('checkin.needHelp')}
              </h2>
              <p className="text-xs text-zinc-500 dark:text-slate-300 leading-relaxed">
                {t('checkin.recordDesc')}
                {confirm.locationName && (
                  <span className="block mt-1 font-semibold">{t('common.landmark')}: {confirm.locationName}</span>
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
                  {t('checkin.newCheckin')}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setActiveTab('search')}
                >
                  {t('checkin.viewRegistry')}
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-4 space-y-4 rounded-2xl border border-zinc-200/80 bg-white p-4 sm:p-6 shadow-sm dark:border-white/[0.08] dark:bg-[#1a1a1a]">
              <div className="flex gap-2">
                <Button
                  variant={status === 'safe' ? 'primary' : 'outline'}
                  className="flex-1 font-bold"
                  onClick={() => setStatus('safe')}
                >
                  {t('checkin.imSafe')}
                </Button>
                <Button
                  variant={status === 'need_assistance' ? 'danger' : 'outline'}
                  className="flex-1 font-bold"
                  onClick={() => setStatus('need_assistance')}
                >
                  {t('checkin.needHelp')}
                </Button>
              </div>

              <Field label={`${t('checkin.fullName')} *`}>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  maxLength={100}
                  placeholder={t('checkin.namePlaceholder')}
                />
              </Field>

              <div>
                <Field label={`${t('checkin.phone')} *`}>
                  <Input
                    type="tel"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value)
                      if (phoneError) setPhoneError(null)
                    }}
                    required
                    placeholder={t('report.phonePlaceholder')}
                  />
                </Field>
                {phoneError && (
                  <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">{phoneError}</p>
                )}
              </div>

              <Field label={`${t('checkin.locationName')} *`}>
                <Input
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  placeholder={t('checkin.locationPlaceholder')}
                  required
                />
              </Field>

              <Field label={t('checkin.message')}>
                <Textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t('checkin.messagePlaceholder')}
                />
              </Field>

              {!(geoStatus === 'granted' && !isFallback) && (
                <div className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>{t('report.locationUnverified')}</span>
                </div>
              )}

              <Button
                className="w-full py-3 font-bold"
                variant={status === 'safe' ? 'primary' : 'danger'}
                onClick={submit}
                disabled={sending || !fullName.trim() || !phone.trim() || !locationName.trim()}
              >
                {sending ? t('common.loading') : t('checkin.submitCheckin')}
              </Button>
            </div>
          )}
        </>
      )}

      {activeTab === 'search' && (
        <div className="mt-4 space-y-4">
          <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm dark:border-white/[0.08] dark:bg-[#1a1a1a]">
            <Field label={t('checkin.searchLabel')}>
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('checkin.searchInputPlaceholder')}
                  autoFocus
                  className="w-full rounded-xl border border-zinc-200 bg-white pl-10 pr-3.5 py-2.5 text-sm placeholder:text-slate-400 outline-none focus:border-slate-800 dark:border-white/[0.1] dark:bg-[#151515] dark:text-slate-300"
                />
              </div>
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
                  className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm dark:border-white/[0.08] dark:bg-[#1a1a1a]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-base font-bold text-zinc-800 dark:text-slate-300">
                        {item.fullName}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mono">
                        {maskPhone(item.phone)}
                      </div>
                    </div>
                    <Badge value={item.status} label={item.status === 'safe' ? t('checkin.statusSafe') : item.status === 'need_assistance' ? t('checkin.statusNeedHelp') : item.status} />
                  </div>

                  {item.locationName && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-zinc-600 dark:text-slate-300">
                      <MapPin className="h-3.5 w-3.5 text-slate-400" />
                      <span>{item.locationName}</span>
                    </div>
                  )}

                  {item.notes && (
                    <p className="mt-1.5 text-xs text-zinc-500 dark:text-slate-400 italic">
                      "{item.notes}"
                    </p>
                  )}

                  <div className="mt-2 text-[11px] text-slate-400 mono">
                    {t('checkin.checkedInAt')} {formatDateTime(item.createdAt)}
                  </div>
                </div>
              ))}

              {filteredCheckins.length === 0 && (
                <div className="rounded-2xl border border-dashed border-zinc-200 p-8 text-center text-xs text-slate-500 dark:border-white/[0.08] dark:text-slate-400">
                  {t('checkin.emptySearch')}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
