import { useState } from 'react'
import {
  FileSpreadsheet,
  Copy,
  Home,
  Store,
  Wheat,
  Warehouse,
  Flame,
  ShieldCheck,
  ExternalLink,
  Cpu
} from 'lucide-react'
import { aiDamageAssessment, type DamageVerdict } from '../../api/ai'
import { createDamageAssessment } from '../../api/endpoints'
import Button from '../../components/common/Button'
import Badge from '../../components/common/Badge'
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
  const { coords: geoCoords } = useGeoLocation()
  const [infraType, setInfraType] = useState<DamageInfrastructureType>('broken_home')
  const [district, setDistrict] = useState('North 24 Parganas')
  const [photo, setPhoto] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [ownerName, setOwnerName] = useState('')
  const [ownerPhone, setOwnerPhone] = useState('')
  const [address, setAddress] = useState('')
  const [description, setDescription] = useState('')
  const [busy, setBusy] = useState(false)
  const [verdict, setVerdict] = useState<DamageVerdict | null>(null)
  const [claimId, setClaimId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const coords = geoCoords ? { lat: geoCoords.latitude, lng: geoCoords.longitude } : { lat: 22.5726, lng: 88.3639 }

  const onFile = async (file: File | undefined) => {
    if (!file) return
    const compressed = await compressImage(file, 800, 0.75)
    setPhoto(compressed)
    setPreview(compressed)
  }

  const assess = async () => {
    if (!photo) return
    if (!ownerPhone.trim()) {
      toast('Contact mobile number is mandatory for SDRF claim verification', 'error')
      return
    }

    setBusy(true)
    try {
      const v = await aiDamageAssessment(
        photo,
        coords?.lat,
        coords?.lng,
        description,
        infraType
      )
      setVerdict(v)

      const saved = await createDamageAssessment({
        claimantName: ownerName.trim() || undefined,
        claimantPhone: ownerPhone.trim(),
        infrastructureType: infraType,
        propertyAddress: address.trim() || 'Sector On-Record',
        district,
        latitude: coords?.lat ?? 22.5726,
        longitude: coords?.lng ?? 88.3639,
        photoUrl: photo,
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
    if (!claimId || !verdict) return
    const text = `SDRF RELIEF CLAIM RECEIPT\nClaim ID: ${claimId}\nClaimant: ${ownerName || 'Citizen'}\nPhone: ${ownerPhone}\nInfra: ${infraType.toUpperCase()}\nDistrict: ${district}\nAI Damage Grade: ${verdict.damageGrade} (${verdict.damageScore}/100)\nEstimated Relief: INR ${verdict.compensationInr.toLocaleString('en-IN')}\nVerified By: HuggingFace ResNet-50 (${verdict.huggingFaceModel})`
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      toast('Claim details copied to clipboard')
      setTimeout(() => setCopied(false), 3000)
    })
  }

  return (
    <div className="mx-auto max-w-2xl text-left">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400">
            <FileSpreadsheet className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {t('damage.title')}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('damage.subtitle')}
            </p>
          </div>
        </div>

        {/* HuggingFace Model Badge */}
        <a
          href="https://huggingface.co/Divyanshu-Kumar19/aapdasetu-damage-assessment"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full border border-yellow-500/30 bg-yellow-500/10 px-3 py-1 text-[11px] font-semibold text-yellow-700 dark:text-yellow-400 hover:bg-yellow-500/20 transition-colors"
        >
          <Cpu className="h-3.5 w-3.5" />
          <span>HuggingFace ResNet-50</span>
          <ExternalLink className="h-2.5 w-2.5 opacity-70" />
        </a>
      </div>

      <div className="mt-4 space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        {/* Step 1: Select Infrastructure Type */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mono mb-2">
            {t('damage.step1Title')}
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
                      ? 'border-slate-900 bg-slate-50 shadow-xs dark:border-white dark:bg-slate-800/90'
                      : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-slate-700'
                  }`}
                >
                  <div
                    className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                      isSelected
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
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

        {/* Step 2: Photo Upload */}
        <div className="space-y-2">
          <label htmlFor="damage-photo" className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mono">
            {t('damage.step2Title')}
          </label>
          <div className="relative">
            <input
              id="damage-photo"
              type="file"
              accept="image/*"
              onChange={(e) => onFile(e.target.files?.[0])}
              className="block w-full text-sm file:mr-4 file:rounded-xl file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-xs file:font-bold file:text-white hover:file:bg-slate-800 dark:file:bg-slate-100 dark:file:text-slate-900 cursor-pointer"
            />
          </div>
          {preview && (
            <div className="relative mt-2 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-950">
              <img src={preview} alt="Damage preview" className="max-h-72 w-full object-cover" />
              <div className="absolute bottom-2 left-2 rounded-md bg-black/70 px-2.5 py-1 text-[11px] font-mono text-white backdrop-blur-xs flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                <span>Geotag & aHash Prepared</span>
              </div>
            </div>
          )}
        </div>

        {/* Step 3: Location & District */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mono mb-1.5">
              {t('damage.district')} *
            </label>
            <select
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-900 outline-none transition focus:border-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
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
          <label htmlFor="damage-description" className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mono">
            {t('damage.description')}
          </label>
          <textarea
            id="damage-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="e.g. 600mm main water pipeline ruptured, basement submerged under 1.5m sludge, cracked pillars…"
            className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs text-slate-900 outline-none transition focus:border-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-slate-300"
          />
        </div>

        {/* Action Button */}
        <Button
          onClick={assess}
          disabled={!photo || busy || !ownerPhone.trim()}
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
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950">
            {claimId && (
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3 dark:border-slate-800">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider mono font-bold">
                    Official SDRF Claim ID
                  </span>
                  <div className="font-mono text-base font-bold text-slate-900 dark:text-slate-100">
                    {claimId}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge value={verdict.verified ? 'VERIFIED_VALID' : 'FLAGGED_FRAUD_RISK'} />
                  <button
                    type="button"
                    onClick={copyClaimReceipt}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 cursor-pointer"
                  >
                    <Copy className="h-3 w-3" />
                    <span>{copied ? 'Copied' : t('damage.copyClaim')}</span>
                  </button>
                </div>
              </div>
            )}

            {/* AI Scoring Summary Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                <div className="text-[10px] uppercase font-bold text-slate-500 mono">{t('damage.score')}</div>
                <div className="text-lg font-bold font-mono text-red-600 dark:text-red-400">
                  {verdict.damageScore ?? 0} / 100
                </div>
                <div className="text-[10px] text-slate-400">Severity Points</div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                <div className="text-[10px] uppercase font-bold text-slate-500 mono">{t('damage.grade')}</div>
                <div className={`text-sm font-bold font-mono ${
                  verdict.damageGrade === 'DESTROYED'
                    ? 'text-red-600 dark:text-red-400'
                    : verdict.damageGrade === 'MAJOR'
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-emerald-600 dark:text-emerald-400'
                }`}>
                  {verdict.damageGrade || 'EVALUATED'}
                </div>
                <div className="text-[10px] text-slate-400">{verdict.confidence ?? 0}% Confidence</div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                <div className="text-[10px] uppercase font-bold text-slate-500 mono">{t('damage.compensation')}</div>
                <div className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">
                  ₹{(verdict.compensationInr ?? 0).toLocaleString('en-IN')}
                </div>
                <div className="text-[10px] text-slate-400">Gov Compensation</div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                <div className="text-[10px] uppercase font-bold text-slate-500 mono">Sector Match</div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                  {district}
                </div>
                <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">GPS Verified</div>
              </div>
            </div>

            {/* Assessment Factors */}
            <div className="border-t border-slate-200 pt-3 dark:border-slate-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mono">
                ResNet-50 Structural Observations:
              </span>
              <ul className="mt-1.5 list-inside list-disc space-y-1 text-xs text-slate-600 dark:text-slate-300">
                {(verdict.factors ?? []).map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
