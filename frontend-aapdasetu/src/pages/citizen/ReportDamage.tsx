import { useState } from 'react'
import {
  FileSpreadsheet,
  Copy,
  Home,
  Store,
  Wheat,
  Warehouse,
  Flame,
  HelpCircle,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react'
import { aiDamageAssessment, type DamageVerdict } from '../../api/ai'
import { createDamageAssessment } from '../../api/endpoints'
import Button from '../../components/common/Button'
import Loader from '../../components/common/Loader'
import { Field, Input } from '../../components/common/Input'
import { useToast } from '../../components/common/Toast'
import { compressImage } from '../../lib/helpers'
import { useLanguage } from '../../lib/i18n'
import { useGeoLocation } from '../../hooks/useLocation'
import type { DamageInfrastructureType } from '../../types'

const INFRASTRUCTURE_CATEGORIES: Array<{
  id: DamageInfrastructureType
  titleKey: string
  icon: typeof Home
  descKey: string
}> = [
  { id: 'broken_home', titleKey: 'damage.cat1Title', icon: Home, descKey: 'damage.cat1Desc' },
  { id: 'commercial_public', titleKey: 'damage.cat2Title', icon: Store, descKey: 'damage.cat2Desc' },
  { id: 'agricultural', titleKey: 'damage.cat3Title', icon: Wheat, descKey: 'damage.cat3Desc' },
  { id: 'road_bridge', titleKey: 'damage.cat4Title', icon: Warehouse, descKey: 'damage.cat4Desc' },
  { id: 'electrical_power', titleKey: 'damage.cat5Title', icon: Flame, descKey: 'damage.cat5Desc' },
  { id: 'other', titleKey: 'damage.cat6Title', icon: HelpCircle, descKey: 'damage.cat6Desc' },
]

const DISTRICT_LIST = [
  'North 24 Parganas',
  'South 24 Parganas',
  'East Midnapore',
  'Howrah',
  'Kolkata',
  'Cuttack',
  'Puri',
  'Bhubaneswar',
]

export default function ReportDamage() {
  const { t } = useLanguage()
  const { toast } = useToast()
  const { coords: geoCoords, isFallback, source } = useGeoLocation() as ReturnType<typeof useGeoLocation> & { isFallback: boolean; source: string }
  const [infraType, setInfraType] = useState<DamageInfrastructureType>('broken_home')
  const [district, setDistrict] = useState('North 24 Parganas')
  const [photos, setPhotos] = useState<string[]>([])
  const [ownerName, setOwnerName] = useState('')
  const [ownerPhone, setOwnerPhone] = useState('')
  const [address, setAddress] = useState('')
  const [description, setDescription] = useState('')
  const [busy, setBusy] = useState(false)
  const [perImageVerdicts, setPerImageVerdicts] = useState<DamageVerdict[]>([])
  // Claim reference comes from the SAVED record (saved.id) — never fabricated.
  const [claimRef, setClaimRef] = useState<string | null>(null)
  const [compensation, setCompensation] = useState<number | null>(null)
  const [analysisUnavailable, setAnalysisUnavailable] = useState(false)
  const [copied, setCopied] = useState(false)
  const hasGps = Boolean(geoCoords && !isFallback && source === 'gps')
  const coords = geoCoords ? { lat: geoCoords.latitude, lng: geoCoords.longitude } : null

  const onFiles = async (files: FileList | null) => {
    if (!files) return
    const remaining = 5 - photos.length
    if (remaining <= 0) {
      toast(t('damage.errMaxImages'), 'error')
      return
    }
    const selected = Array.from(files).slice(0, remaining)
    const newPhotos: string[] = []
    for (const file of selected) {
      if (!file.type.startsWith('image/')) {
        toast(`${file.name}: ${t('damage.errFileImage')}`, 'error')
        continue
      }
      if (file.size > 10 * 1024 * 1024) {
        toast(`${file.name} ${t('damage.exceedsLimit')}`, 'error')
        continue
      }
      try {
        const compressed = await compressImage(file, 800, 0.75)
        newPhotos.push(compressed)
      } catch {
        toast(`${file.name}: ${t('damage.errProcessImage')}`, 'error')
      }
    }
    setPhotos((prev) => [...prev, ...newPhotos])
  }

  const removePhoto = (idx: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== idx))
    setPerImageVerdicts((prev) => prev.filter((_, i) => i !== idx))
  }

  const assess = async () => {
    if (photos.length === 0) {
      toast(t('damage.errMinPhotos'), 'error')
      return
    }
    const cleanPhone = ownerPhone.replace(/\D/g, '')
    if (!cleanPhone || cleanPhone.length < 10) {
      toast(t('common.errPhone10'), 'error')
      return
    }
    if (!address.trim()) {
      toast(t('damage.errAddressRequired'), 'error')
      return
    }
    if (!description.trim()) {
      toast(t('damage.errDescription'), 'error')
      return
    }

    setBusy(true)
    try {
      // ponytail: claim persists FIRST — analysis is indicative only and must
      // never block or lose the save.
      const saved = await createDamageAssessment({
        photoDataUrl: photos[0],
        latitude: coords?.lat,
        longitude: coords?.lng,
        reporterName: ownerName.trim() || undefined,
        reporterPhone: cleanPhone,
      })
      setClaimRef(saved.id)
      // Compensation is shown only when the backend actually returned one.
      if (typeof saved.compensation === 'number') setCompensation(saved.compensation)
      toast(t('damage.claimCreated'), 'success')

      try {
        const stored = JSON.parse(localStorage.getItem('aapdasetu_damage_claims') || '[]') as string[]
        if (!stored.includes(saved.id)) {
          localStorage.setItem('aapdasetu_damage_claims', JSON.stringify([saved.id, ...stored]))
        }
      } catch {
        // Storage unavailable
      }

      // Indicative AI grade for display only; failure degrades to a warning chip.
      try {
        const targetLat = coords?.lat ?? 22.5726
        const targetLng = coords?.lng ?? 88.3639
        const verdicts = await Promise.all(
          photos.map((p) =>
            aiDamageAssessment(p, targetLat, targetLng, description, infraType)
          )
        )
        setPerImageVerdicts(verdicts)
        setAnalysisUnavailable(false)
      } catch {
        setPerImageVerdicts([])
        setAnalysisUnavailable(true)
      }
    } catch (e) {
      toast(e instanceof Error ? e.message : t('common.submissionFailed'), 'error')
    } finally {
      setBusy(false)
    }
  }

  const resetForm = () => {
    setPhotos([])
    setOwnerName('')
    setOwnerPhone('')
    setAddress('')
    setDescription('')
    setPerImageVerdicts([])
    setClaimRef(null)
    setCompensation(null)
    setAnalysisUnavailable(false)
  }

  const copyClaimReceipt = () => {
    if (!claimRef) return
    navigator.clipboard
      .writeText(claimRef)
      .then(() => {
        setCopied(true)
        toast(t('common.copiedClipboard'))
        setTimeout(() => setCopied(false), 3000)
      })
      .catch(() => toast(t('common.copyFailed'), 'error'))
  }

  return (
    <div className="mx-auto max-w-3xl text-left">
      {/* Top Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400">
          <FileSpreadsheet className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-800 dark:text-slate-300">
            {t('damage.title')}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t('damage.subtitle')}
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-5 rounded-2xl border border-zinc-200/80 bg-white p-4 sm:p-6 shadow-sm dark:border-white/[0.08] dark:bg-[#1a1a1a]">
        {/* Step 1: Select Infrastructure Type */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-slate-300 mono mb-2">
            {t('damage.step1Title')} <span className="text-red-600">*</span>
          </label>
          <select
            value={infraType}
            onChange={(e) => setInfraType(e.target.value as DamageInfrastructureType)}
            className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-zinc-800 outline-none transition focus:border-zinc-500 dark:border-white/[0.1] dark:bg-[#222222] dark:text-slate-300 cursor-pointer"
          >
            {INFRASTRUCTURE_CATEGORIES.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {t(cat.titleKey)} — {t(cat.descKey)}
              </option>
            ))}
          </select>
        </div>

        {/* Step 2: Photo Upload (max 5) */}
        <div className="space-y-2">
          <label htmlFor="damage-photo" className="block text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-slate-300 mono">
            {t('damage.step2Title')} <span className="text-red-600">*</span> <span className="font-normal normal-case text-slate-400">({photos.length}/5 {t('damage.imagesCount')})</span>
          </label>
          <div className="relative">
            <input
              id="damage-photo"
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => {
                onFiles(e.target.files)
                e.target.value = ''
              }}
              className="block w-full text-sm file:mr-4 file:rounded-xl file:border-0 file:bg-zinc-800 file:px-4 file:py-2 file:text-xs file:font-bold file:text-white hover:file:bg-slate-800 dark:file:bg-slate-100 dark:file:text-zinc-800 cursor-pointer"
            />
          </div>
          <p className="text-[11px] text-slate-500">{t('damage.uploadHint')}</p>
          {photos.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-2">
              {photos.map((p, idx) => (
                <div key={idx} className="relative overflow-hidden rounded-xl border border-zinc-200/80 dark:border-white/[0.1] bg-slate-950">
                  <img src={p} alt={`${t('damage.photoAlt')} ${idx + 1}`} className="h-32 w-full object-cover" />
                  <button type="button" onClick={() => removePhoto(idx)} className="absolute top-1.5 right-1.5 rounded-full bg-black/70 px-2 py-1 text-[10px] font-bold text-white hover:bg-red-600">
                    {t('common.remove')}
                  </button>
                  <div className="absolute bottom-1 left-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-mono text-white">#{idx + 1}</div>
                  {perImageVerdicts[idx] && (
                    <div className="absolute bottom-1 right-1 rounded bg-emerald-600 px-1.5 py-0.5 text-[10px] font-bold text-white">{perImageVerdicts[idx].damageScore}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Step 3: Location & District */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-slate-300 mono mb-1.5">
              {t('damage.district')} *
            </label>
            <select
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-zinc-800 outline-none transition focus:border-zinc-500 dark:border-white/[0.1] dark:bg-[#222222] dark:text-slate-300"
            >
              {DISTRICT_LIST.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <Field label={t('damage.propertyAddress')}>
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder={t('damage.addressPlaceholder')}
            />
          </Field>
        </div>

        {!hasGps && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30">
            <span className="font-bold">{t('damage.gpsWarn1')} </span>{t('damage.gpsWarn2')}
          </div>
        )}
        {/* Step 4: Claimant Details */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={t('damage.ownerName')}>
            <Input
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              placeholder={t('damage.ownerPlaceholder')}
            />
          </Field>
          <Field label={t('damage.ownerPhone')}>
            <Input
              type="tel"
              required
              value={ownerPhone}
              onChange={(e) => setOwnerPhone(e.target.value)}
              placeholder={t('report.phonePlaceholder')}
            />
          </Field>
        </div>

        {/* Step 5: Damage Description */}
        <div className="space-y-1.5">
          <label htmlFor="damage-description" className="block text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-slate-300 mono">
            {t('damage.description')} <span className="text-red-600">*</span>
          </label>
          <textarea
            id="damage-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder={t('damage.descPlaceholder')}
            className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs text-zinc-800 outline-none transition focus:border-zinc-500 dark:border-white/[0.1] dark:bg-[#222222] dark:text-slate-300 dark:focus:border-slate-500"
          />
        </div>

        {/* Action Button — disabled once a claim is saved (duplicate guard) */}
        <Button
          onClick={assess}
          disabled={photos.length === 0 || busy || !ownerPhone.trim() || claimRef !== null}
          className="w-full py-3 text-sm font-bold shadow-md cursor-pointer"
        >
          {busy ? (
            <span className="flex items-center justify-center gap-2">
              <Loader />
              <span>{t('damage.analyzing')}</span>
            </span>
          ) : (
            t('damage.submitBtn')
          )}
        </Button>

        {/* Result Card — rendered only once the claim actually persisted */}
        {claimRef && (
          <div className="space-y-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm dark:border-emerald-900/50 dark:bg-emerald-950/40">
            <div className="flex items-center gap-3 text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <div>
                <h2 className="text-sm font-bold">{t('damage.successTitle')}</h2>
                <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
                  {t('damage.successDesc')}
                </p>
              </div>
            </div>

            {analysisUnavailable && (
              <div className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs font-semibold text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  {t('damage.analysisUnavailable', 'Automated analysis unavailable — claim saved for manual review')}
                </span>
              </div>
            )}

            {compensation !== null && (
              <div className="rounded-xl border border-zinc-200/80 bg-[#f4f4f5] p-4 dark:border-white/[0.08] dark:bg-[#151515]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mono">
                  {t('damage.compensation')}
                </span>
                <div className="font-mono text-lg sm:text-xl font-bold text-zinc-800 dark:text-slate-300">
                  ₹{compensation.toLocaleString('en-IN')}
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200/80 bg-[#f4f4f5] p-4 dark:border-white/[0.08] dark:bg-[#151515]">
              <div className="min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mono">
                  {t('damage.claimIdLabel')}
                </span>
                <div className="font-mono text-lg sm:text-xl font-bold text-zinc-800 dark:text-slate-300 break-all">
                  {claimRef}
                </div>
              </div>
              <button
                type="button"
                onClick={copyClaimReceipt}
                className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-zinc-800 px-3 py-2 text-xs font-bold text-white transition hover:bg-zinc-700 dark:bg-slate-100 dark:text-zinc-800 dark:hover:bg-white cursor-pointer"
              >
                <Copy className="h-3.5 w-3.5" />
                <span>{copied ? t('common.copied') : t('damage.copyId')}</span>
              </button>
            </div>

            <Button variant="outline" onClick={resetForm} className="w-full cursor-pointer">
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              <span>{t('report.newReport', 'File a new claim')}</span>
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
