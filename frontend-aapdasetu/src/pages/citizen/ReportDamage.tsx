import { useState } from 'react'
import {
  FileSpreadsheet,
  Copy,
  Home,
  Store,
  Wheat,
  Warehouse,
  Flame,
  CheckCircle2,
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
  label: string
  icon: typeof Home
  desc: string
}> = [
  { id: 'broken_home', label: 'Residential Home', icon: Home, desc: 'Roofs collapsed, walls cracked, flood inundation' },
  { id: 'commercial_public', label: 'Commercial / Public', icon: Store, desc: 'Storefront damaged, inventory flooded or public building' },
  { id: 'agricultural', label: 'Agricultural Crops', icon: Wheat, desc: 'Farmland submerged, topsoil eroded, crop failure' },
  { id: 'road_bridge', label: 'Bridge & Road', icon: Warehouse, desc: 'Culvert washed away, road split or submerged' },
  { id: 'electrical_power', label: 'Power Grid & Utility', icon: Flame, desc: 'Transformer fallen, cables severed, poles broken' },
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
  const [verdict, setVerdict] = useState<DamageVerdict | null>(null)
  const [perImageVerdicts, setPerImageVerdicts] = useState<DamageVerdict[]>([])
  const [claimId, setClaimId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const hasGps = Boolean(geoCoords && !isFallback && source === 'gps')
  const coords = hasGps && geoCoords ? { lat: geoCoords.latitude, lng: geoCoords.longitude } : null

  const onFiles = async (files: FileList | null) => {
    if (!files) return
    const remaining = 5 - photos.length
    if (remaining <= 0) {
      toast('Maximum 5 images allowed', 'error')
      return
    }
    const selected = Array.from(files).slice(0, remaining)
    const newPhotos: string[] = []
    for (const file of selected) {
      if (!file.type.startsWith('image/')) {
        toast(`${file.name}: Only image files allowed`, 'error')
        continue
      }
      if (file.size > 10 * 1024 * 1024) {
        toast(`${file.name} exceeds 10MB`, 'error')
        continue
      }
      const compressed = await compressImage(file, 800, 0.75)
      newPhotos.push(compressed)
    }
    setPhotos((prev) => [...prev, ...newPhotos])
  }

  const removePhoto = (idx: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== idx))
  }

  const assess = async () => {
    if (photos.length === 0) {
      toast('Please upload at least 1 damage photo (max 5)', 'error')
      return
    }
    const cleanPhone = ownerPhone.replace(/\D/g, '')
    if (!cleanPhone || cleanPhone.length < 10) {
      toast('Enter a valid 10-digit mobile number', 'error')
      return
    }
    if (!address.trim()) {
      toast('Property address is required', 'error')
      return
    }
    if (!hasGps) {
      toast('Location unavailable — please enable GPS or allow location', 'error')
      return
    }
    if (!description.trim()) {
      toast('Please describe the structural failure (required)', 'error')
      return
    }

    setBusy(true)
    try {
      const verdicts = await Promise.all(
        photos.map((p) =>
          aiDamageAssessment(p, coords!.lat, coords!.lng, description, infraType)
        )
      )
      setPerImageVerdicts(verdicts)
      const avgScore = Math.round(verdicts.reduce((a, v) => a + v.damageScore, 0) / verdicts.length)
      const avgComp = Math.round(verdicts.reduce((a, v) => a + v.compensationInr, 0) / verdicts.length)
      const avgConf = Math.round((verdicts.reduce((a, v) => a + v.confidence, 0) / verdicts.length) * 10) / 10
      const gradeCounts = verdicts.reduce((acc, v) => { acc[v.damageGrade] = (acc[v.damageGrade] || 0) + 1; return acc }, {} as Record<string, number>)
      const avgGrade = (Object.entries(gradeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] as DamageVerdict['damageGrade']) || verdicts[0].damageGrade
      const allFactors = [...new Set(verdicts.flatMap((v) => v.factors))].slice(0, 6)
      const v: DamageVerdict = {
        claimedDamage: true,
        verified: verdicts.every((x) => x.verified),
        duplicate: false,
        exifValid: true,
        damageGrade: avgGrade,
        damageScore: avgScore,
        confidence: avgConf,
        compensationInr: avgComp,
        factors: allFactors,
        huggingFaceModel: 'aapdasetu-ensemble',
        infrastructureType: infraType,
      }
      setVerdict(v)

      const saved = await createDamageAssessment({
        claimantName: ownerName.trim() || undefined,
        claimantPhone: cleanPhone,
        infrastructureType: infraType,
        propertyAddress: address.trim(),
        district,
        latitude: coords!.lat,
        longitude: coords!.lng,
        photoUrl: photos[0],
        structuralDamage: v.damageGrade === 'DESTROYED' || v.damageGrade === 'MAJOR',
        estimatedLossInr: v.compensationInr,
        damageGrade: v.damageGrade,
        damageScore: v.damageScore,
        confidence: v.confidence,
      })

      setClaimId(saved.claimId)
      toast(t('damage.claimCreated'), 'success')

      try {
        const stored = JSON.parse(localStorage.getItem('aapdasetu_damage_claims') || '[]') as string[]
        if (!stored.includes(saved.claimId)) {
          localStorage.setItem('aapdasetu_damage_claims', JSON.stringify([saved.claimId, ...stored]))
        }
      } catch {
        // Storage unavailable
      }
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Damage assessment failed', 'error')
    } finally {
      setBusy(false)
    }
  }

  const copyClaimReceipt = () => {
    if (!claimId) return
    navigator.clipboard.writeText(claimId).then(() => {
      setCopied(true)
      toast('Claim ID copied to clipboard')
      setTimeout(() => setCopied(false), 3000)
    })
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

      <div className="mt-4 space-y-5 rounded-2xl border border-zinc-200/80 bg-white p-4 sm:p-6 shadow-xs dark:border-white/[0.08] dark:bg-[#1a1a1a]">
        {/* Step 1: Select Infrastructure Type */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-slate-300 mono mb-2">
            {t('damage.step1Title')} <span className="text-red-600">*</span>
          </label>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {INFRASTRUCTURE_CATEGORIES.map((cat) => {
              const Icon = cat.icon
              const isSelected = infraType === cat.id
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setInfraType(cat.id)}
                  className={`flex items-start gap-3 rounded-xl border p-3 text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'border-slate-900 bg-[#f4f4f5] shadow-xs dark:border-white dark:bg-[#222222]/90'
                      : 'border-zinc-200/80 bg-white hover:border-zinc-200 dark:border-white/[0.08] dark:bg-[#1a1a1a]/60 dark:hover:border-slate-700'
                  }`}
                >
                  <div
                    className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                      isSelected
                        ? 'bg-zinc-800 text-white dark:bg-white dark:text-zinc-800'
                        : 'bg-slate-100 text-zinc-500 dark:bg-[#222222] dark:text-slate-300'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-zinc-800 dark:text-slate-300">
                      {cat.label}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                      {cat.desc}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Step 2: Photo Upload (max 5) */}
        <div className="space-y-2">
          <label htmlFor="damage-photo" className="block text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-slate-300 mono">
            {t('damage.step2Title')} <span className="text-red-600">*</span> <span className="font-normal normal-case text-slate-400">({photos.length}/5 images)</span>
          </label>
          <div className="relative">
            <input
              id="damage-photo"
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => onFiles(e.target.files)}
              className="block w-full text-sm file:mr-4 file:rounded-xl file:border-0 file:bg-zinc-800 file:px-4 file:py-2 file:text-xs file:font-bold file:text-white hover:file:bg-slate-800 dark:file:bg-slate-100 dark:file:text-zinc-800 cursor-pointer"
            />
          </div>
          <p className="text-[11px] text-slate-500">Upload 1–5 geotagged photos. Each is scored individually, then averaged for final claim.</p>
          {photos.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-2">
              {photos.map((p, idx) => (
                <div key={idx} className="relative overflow-hidden rounded-xl border border-zinc-200/80 dark:border-white/[0.1] bg-slate-950">
                  <img src={p} alt={`Damage ${idx + 1}`} className="h-32 w-full object-cover" />
                  <button type="button" onClick={() => removePhoto(idx)} className="absolute top-1.5 right-1.5 rounded-full bg-black/70 px-2 py-1 text-[10px] font-bold text-white hover:bg-red-600">
                    Remove
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
              placeholder="e.g. Holding 42, Block B, Main Road"
            />
          </Field>
        </div>

        {!hasGps && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30">
            <span className="font-bold">GPS unavailable — </span>Enable location to geotag damage claim. Current fallback (Kolkata) not used — your claim requires precise GPS.
          </div>
        )}
        {/* Step 4: Claimant Details */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={t('damage.ownerName')}>
            <Input
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              placeholder="e.g. Ramesh Sen"
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
            placeholder="e.g. 600mm main water pipeline ruptured, basement submerged under 1.5m sludge, cracked pillars…"
            className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs text-zinc-800 outline-none transition focus:border-zinc-500 dark:border-white/[0.1] dark:bg-[#222222] dark:text-slate-300 dark:focus:border-slate-500"
          />
        </div>

        {/* Action Button */}
        <Button
          onClick={assess}
          disabled={photos.length === 0 || busy || !ownerPhone.trim()}
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

        {/* Verdict Output Card */}
        {verdict && (
          <div className="space-y-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-xs dark:border-emerald-900/50 dark:bg-emerald-950/40">
            <div className="flex items-center gap-3 text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <div>
                <h2 className="text-sm font-bold">Damage Claim Registered with Command Center</h2>
                <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
                  Your claim has been assessed by the AI engine and logged for SDRF relief review.
                </p>
              </div>
            </div>

            {claimId && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200/80 bg-[#f4f4f5] p-4 dark:border-white/[0.08] dark:bg-[#151515]">
                <div className="min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mono">
                    Official SDRF Claim ID — Save this
                  </span>
                  <div className="font-mono text-lg sm:text-xl font-bold text-zinc-800 dark:text-slate-300 break-all">
                    {claimId}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={copyClaimReceipt}
                  className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-zinc-800 px-3 py-2 text-xs font-bold text-white transition hover:bg-zinc-700 dark:bg-slate-100 dark:text-zinc-800 dark:hover:bg-white cursor-pointer"
                >
                  <Copy className="h-3.5 w-3.5" />
                  <span>{copied ? 'Copied!' : 'Copy ID'}</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
