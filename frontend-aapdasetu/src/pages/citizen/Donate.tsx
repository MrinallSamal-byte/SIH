import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  HeartHandshake,
  BadgeCheck,
  Copy,
  CheckCircle2,
  AlertTriangle,
  Landmark,
  UtensilsCrossed,
  Stethoscope,
  Tent,
  Download,
  ChevronRight,
  Smartphone,
  CreditCard,
  Building2,
} from 'lucide-react'
import { useLanguage } from '../../lib/i18n'

type FundId = 'cmrf-assam' | 'sdrf-odisha' | 'relief-ngo' | 'medical-aid'

interface ReliefFund {
  id: FundId
  nameKey: string
  nameFallback: string
  orgFallback: string
  upiFallback: string
  raised: number
  goal: number
  icon: typeof Landmark
  tagFallback: string
}

const FUNDS: ReliefFund[] = [
  {
    id: 'cmrf-assam',
    nameKey: 'donate.fundCmrf',
    nameFallback: 'Chief Minister Relief Fund — Flood Response',
    orgFallback: 'State Government · Audited relief account',
    upiFallback: 'cmrf-assam@sbi',
    raised: 48250000,
    goal: 100000000,
    icon: Landmark,
    tagFallback: 'Government',
  },
  {
    id: 'sdrf-odisha',
    nameKey: 'donate.fundSdrf',
    nameFallback: 'SDRF Cyclone Shelter & Restoration Fund',
    orgFallback: 'State Disaster Response Fund · District-wise allocation',
    upiFallback: 'sdrf-odisha@okhdfc',
    raised: 27400000,
    goal: 50000000,
    icon: Tent,
    tagFallback: 'Government',
  },
  {
    id: 'relief-ngo',
    nameKey: 'donate.fundNgo',
    nameFallback: 'Verified NGO Network — Food & Shelter Kits',
    orgFallback: '80G-registered partner NGOs · Field-verified distribution',
    upiFallback: 'relief-network@okicici',
    raised: 9100000,
    goal: 15000000,
    icon: UtensilsCrossed,
    tagFallback: 'Verified NGO',
  },
  {
    id: 'medical-aid',
    nameKey: 'donate.fundMedical',
    nameFallback: 'Emergency Medical Aid Pool',
    orgFallback: 'Ambulance fuel, medicines & mobile health camps',
    upiFallback: 'medical-aid@okaxis',
    raised: 5300000,
    goal: 10000000,
    icon: Stethoscope,
    tagFallback: 'Medical',
  },
]

const PRESET_AMOUNTS = [100, 500, 1000, 2500, 5000]

interface DonationRecord {
  id: string
  fundId: FundId
  amount: number
  donor: string
  anonymous: boolean
  method: 'upi' | 'card' | 'netbanking'
  createdAt: string
  receiptId: string
}

const STORAGE_KEY = 'aapdasetu_donations_v1'

function loadStoredDonations(): DonationRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as DonationRecord[]
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (d) =>
        d &&
        typeof d.amount === 'number' &&
        Number.isFinite(d.amount) &&
        typeof d.receiptId === 'string' &&
        typeof d.createdAt === 'string',
    )
  } catch {
    return []
  }
}

function isValidUpi(upi: string): boolean {
  return /^[\w.-]{2,256}@[a-zA-Z]{2,}$/.test(upi.trim())
}

function isValidCardNumber(num: string): boolean {
  const digits = num.replace(/\D/g, '')
  return digits.length === 16
}

function isValidExpiry(exp: string): boolean {
  const m = exp.trim().match(/^(0[1-9]|1[0-2])\/(\d{2})$/)
  if (!m) return false
  const mm = Number(m[1])
  const yy = 2000 + Number(m[2])
  const now = new Date()
  const endOfMonth = new Date(yy, mm, 0, 23, 59, 59)
  return endOfMonth.getTime() >= now.getTime()
}

function isValidCvv(cvv: string): boolean {
  return /^\d{3,4}$/.test(cvv.trim())
}

function maskDonor(name: string): string {
  const clean = name.trim()
  if (!clean) return 'Anonymous'
  const parts = clean.split(/\s+/)
  if (parts.length === 1) return `${parts[0].slice(0, 1).toUpperCase()}***`
  return `${parts[0]} ${parts[parts.length - 1].slice(0, 1).toUpperCase()}.`
}

function formatINR(n: number): string {
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(n)
  } catch {
    return `Rs.${n}`
  }
}

function makeReceiptId(): string {
  const time = Date.now().toString(36).toUpperCase()
  const rand = Math.random().toString(36).slice(2, 5).toUpperCase()
  return `DN-${time}-${rand}`
}

export default function Donate() {
  const { t } = useLanguage()
  const [fundId, setFundId] = useState<FundId>('cmrf-assam')
  const [amount, setAmount] = useState<string>('500')
  const [customSelected, setCustomSelected] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [pan, setPan] = useState('')
  const [anonymous, setAnonymous] = useState(false)
  const [method, setMethod] = useState<'upi' | 'card' | 'netbanking'>('upi')
  const [upiId, setUpiId] = useState('')
  const [cardNumber, setCardNumber] = useState('')
  const [cardExpiry, setCardExpiry] = useState('')
  const [cardCvv, setCardCvv] = useState('')
  const [bank, setBank] = useState('SBI')
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [success, setSuccess] = useState<DonationRecord | null>(null)
  const [copied, setCopied] = useState(false)
  const [donations, setDonations] = useState<DonationRecord[]>([])
  const mountedRef = useRef(true)
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    mountedRef.current = true
    setDonations(loadStoredDonations())
    return () => {
      mountedRef.current = false
      if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    }
  }, [])

  const fund = useMemo(() => FUNDS.find((f) => f.id === fundId) ?? FUNDS[0], [fundId])

  const totalRaisedToday = useMemo(
    () => fund.raised + donations.filter((d) => d.fundId === fund.id).reduce((s, d) => s + d.amount, 0),
    [fund, donations],
  )
  const progressPct = Math.max(0, Math.min(100, Math.round((totalRaisedToday / fund.goal) * 100)))

  const parsedAmount = Number(amount.replace(/[^0-9]/g, ''))

  const validate = (): string | null => {
    if (!Number.isFinite(parsedAmount) || parsedAmount < 10) {
      return t('donate.errMinAmount', 'Minimum donation is Rs.10.')
    }
    if (parsedAmount > 1000000) {
      return t('donate.errMaxAmount', 'For donations above Rs.10,00,000 please contact the relief office directly.')
    }
    if (!anonymous && name.trim().length > 0 && name.trim().length < 2) {
      return t('donate.errName', 'Please enter your full name or choose to donate anonymously.')
    }
    const phoneDigits = phone.replace(/\D/g, '')
    if (phone.trim().length > 0 && (phoneDigits.length < 10 || phoneDigits.length > 15)) {
      return t('donate.errPhone', 'Please enter a valid 10-digit mobile number or leave it blank.')
    }
    const panClean = pan.trim().toUpperCase()
    if (panClean.length > 0 && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(panClean)) {
      return t('donate.errPan', 'PAN format looks incorrect (e.g. ABCDE1234F). It is optional — clear it to skip.')
    }
    if (method === 'upi' && upiId.trim().length > 0 && !isValidUpi(upiId)) {
      return t('donate.errUpi', 'That UPI ID looks incorrect (expected format name@bank).')
    }
    if (method === 'card') {
      if (!isValidCardNumber(cardNumber)) return t('donate.errCard', 'Please enter the 16-digit card number.')
      if (!isValidExpiry(cardExpiry)) return t('donate.errExpiry', 'Card expiry must be MM/YY and in the future.')
      if (!isValidCvv(cardCvv)) return t('donate.errCvv', 'Please enter the 3–4 digit CVV.')
    }
    return null
  }

  const handleDonate = () => {
    if (processing) return
    const err = validate()
    if (err) {
      setError(err)
      return
    }
    setError(null)
    setProcessing(true)
    timerRef.current = window.setTimeout(() => {
      if (!mountedRef.current) return
      const record: DonationRecord = {
        id: `local-${Date.now()}`,
        fundId: fund.id,
        amount: parsedAmount,
        donor: anonymous ? 'Anonymous' : name.trim() || 'Kind Donor',
        anonymous,
        method,
        createdAt: new Date().toISOString(),
        receiptId: makeReceiptId(),
      }
      try {
        const existing = loadStoredDonations()
        localStorage.setItem(STORAGE_KEY, JSON.stringify([record, ...existing].slice(0, 50)))
      } catch {
        // Storage unavailable (private mode) — still show success for the demo.
      }
      if (!mountedRef.current) return
      setDonations((prev) => [record, ...prev].slice(0, 50))
      setSuccess(record)
      setProcessing(false)
    }, 1500)
  }

  const copyText = (text: string) => {
    if (!text) return
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(
        () => {
          setCopied(true)
          window.setTimeout(() => {
            if (mountedRef.current) setCopied(false)
          }, 2500)
        },
        () => setCopied(false),
      )
    }
  }

  const downloadReceipt = (record: DonationRecord) => {
    const lines = [
      'AapdaSetu — Donation Receipt (Prototype Demo)',
      '---------------------------------------------',
      `Receipt ID : ${record.receiptId}`,
      `Date       : ${new Date(record.createdAt).toLocaleString('en-IN')}`,
      `Fund       : ${FUNDS.find((f) => f.id === record.fundId)?.nameFallback ?? record.fundId}`,
      `Amount     : ${formatINR(record.amount)}`,
      `Donor      : ${record.anonymous ? 'Anonymous' : record.donor}`,
      `Method     : ${record.method.toUpperCase()} (simulated, no money moved)`,
      '',
      'This is a prototype demonstration receipt. No real payment was processed.',
      '80G tax receipts are issued only by the registered fund after verification.',
    ]
    try {
      const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${record.receiptId}.txt`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 2000)
    } catch {
      // Download unavailable — receipt details remain visible on screen.
    }
  }

  if (success) {
    return (
      <div className="mx-auto w-full max-w-2xl pb-12">
        <div className="rounded-2xl border border-emerald-200 bg-white p-6 text-center shadow-sm dark:border-emerald-900/50 dark:bg-[#1a1a1a] sm:p-8">
          <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-600 dark:text-emerald-400" />
          <p className="mono mt-3 text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
            {t('donate.successBadge', 'Donation recorded · Demo')}
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
            {t('donate.thankYou', 'Thank you for standing with affected families.')}
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-500 dark:text-white">
            {t(
              'donate.successDesc',
              'Your demo contribution has been recorded on this device. In production this receipt would come from the official fund gateway.',
            )}
          </p>

          <div className="mt-6 rounded-2xl border border-zinc-200/80 bg-[#f4f4f5] p-5 text-left dark:border-white/[0.08] dark:bg-[#151515]">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <span className="mono text-xs font-bold uppercase tracking-wider text-slate-400">
                  {t('donate.receiptId', 'Receipt ID')}
                </span>
                <div className="mono mt-1 break-all text-xl font-bold text-zinc-900 dark:text-white">{success.receiptId}</div>
              </div>
              <button
                type="button"
                onClick={() => copyText(success.receiptId)}
                className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-zinc-800 px-2.5 py-1.5 text-xs font-bold text-white transition hover:bg-zinc-700 dark:bg-slate-100 dark:text-zinc-800"
              >
                <Copy className="h-3 w-3" />
                <span>{copied ? t('common.copied', 'Copied!') : t('common.copy', 'Copy')}</span>
              </button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  {t('donate.amount', 'Amount')}
                </span>
                <div className="text-lg font-bold text-zinc-900 dark:text-white">{formatINR(success.amount)}</div>
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  {t('donate.fund', 'Fund')}
                </span>
                <div className="text-sm font-semibold text-zinc-800 dark:text-white">
                  {FUNDS.find((f) => f.id === success.fundId)?.nameFallback}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => downloadReceipt(success)}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-zinc-900 py-3 text-sm font-bold text-white transition hover:bg-zinc-700 dark:bg-slate-100 dark:text-zinc-900"
            >
              <Download className="h-4 w-4" />
              <span>{t('donate.downloadReceipt', 'Download receipt')}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setSuccess(null)
                setAmount('500')
                setCustomSelected(false)
              }}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white py-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-white/[0.1] dark:bg-[#222] dark:text-white"
            >
              <span>{t('donate.donateAgain', 'Donate again')}</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <Link
            to="/track"
            className="mt-4 inline-block text-xs font-semibold text-slate-500 underline underline-offset-2 hover:text-zinc-800 dark:text-white"
          >
            {t('donate.trackRelief', 'Follow rescue & relief updates on the tracker')}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-6xl pb-12">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-700 text-white">
          <HeartHandshake className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-3xl">
            {t('donate.title', 'Donate for Disaster Relief')}
          </h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-white sm:text-base">
            {t('donate.subtitle', 'Support verified government relief funds and field partners — food, shelter, medical aid.')}
          </p>
        </div>
      </div>

      {/* Prototype honesty banner */}
      <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-amber-300/80 bg-amber-50 p-4 text-sm leading-relaxed text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          <span className="font-bold">{t('donate.demoBadge', 'Prototype demo:')}</span>{' '}
          {t(
            'donate.demoDesc',
            'No real money moves here. Donations are simulated on your device so the flow can be reviewed. For real giving, always use official .gov.in portals or verified fund UPI handles.',
          )}
        </p>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        {/* Left: fund + amount + donor */}
        <div className="space-y-4 lg:col-span-2">
          {/* Fund selector */}
          <section className="rounded-2xl border border-zinc-200/80 bg-white p-5 dark:border-white/[0.08] dark:bg-[#1a1a1a]">
            <h2 className="mono text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-white">
              {t('donate.chooseFund', '1 · Choose a relief fund')}
            </h2>
            <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
              {FUNDS.map((f) => {
                const Icon = f.icon
                const active = f.id === fundId
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFundId(f.id)}
                    aria-pressed={active}
                    className={`rounded-2xl border p-4 text-left transition active:scale-[0.99] ${
                      active
                        ? 'border-emerald-600 bg-emerald-50/70 ring-1 ring-emerald-600/40 dark:border-emerald-700 dark:bg-emerald-950/30'
                        : 'border-zinc-200/80 bg-white hover:border-zinc-400 dark:border-white/[0.08] dark:bg-[#151515]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-900 text-white dark:bg-slate-100 dark:text-zinc-900">
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-xs font-bold text-zinc-600 dark:border-white/[0.1] dark:bg-[#222] dark:text-white">
                        {f.tagFallback}
                      </span>
                    </div>
                    <div className="mt-2.5 text-base font-bold text-zinc-900 dark:text-white">{t(f.nameKey, f.nameFallback)}</div>
                    <div className="mt-0.5 text-sm text-slate-500 dark:text-white">{f.orgFallback}</div>
                    {active && (
                      <div className="mt-2 inline-flex items-center gap-1 text-sm font-bold text-emerald-700 dark:text-emerald-300">
                        <BadgeCheck className="h-3.5 w-3.5" />
                        <span>{t('donate.selected', 'Selected')}</span>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Progress */}
            <div className="mt-4 rounded-xl bg-[#f4f4f5] p-3.5 dark:bg-[#151515]">
              <div className="flex items-center justify-between text-sm">
                <span className="font-bold text-zinc-800 dark:text-white">
                  {formatINR(totalRaisedToday)} <span className="font-medium text-slate-500">/ {formatINR(fund.goal)}</span>
                </span>
                <span className="mono font-bold text-emerald-700 dark:text-emerald-300">{progressPct}%</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                <div className="h-full rounded-full bg-emerald-600 transition-all" style={{ width: `${progressPct}%` }} />
              </div>
              <p className="mt-1.5 text-xs text-slate-500 dark:text-white">
                {t('donate.progressNote', 'Illustrative demo figures. Live fund totals publish only on official portals.')}
              </p>
            </div>
          </section>

          {/* Amount */}
          <section className="rounded-2xl border border-zinc-200/80 bg-white p-5 dark:border-white/[0.08] dark:bg-[#1a1a1a]">
            <h2 className="mono text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-white">
              {t('donate.chooseAmount', '2 · Choose amount (INR)')}
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {PRESET_AMOUNTS.map((preset) => {
                const active = !customSelected && Number(amount) === preset
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      setAmount(String(preset))
                      setCustomSelected(false)
                    }}
                    className={`rounded-xl border px-4 py-2.5 text-sm font-bold transition active:scale-95 ${
                      active
                        ? 'border-emerald-600 bg-emerald-600 text-white'
                        : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400 dark:border-white/[0.1] dark:bg-[#222] dark:text-white'
                    }`}
                  >
                    ₹{preset.toLocaleString('en-IN')}
                  </button>
                )
              })}
              <button
                type="button"
                onClick={() => setCustomSelected(true)}
                className={`rounded-xl border px-4 py-2.5 text-sm font-bold transition active:scale-95 ${
                  customSelected
                    ? 'border-emerald-600 bg-emerald-600 text-white'
                    : 'border-dashed border-zinc-300 bg-white text-zinc-600 hover:border-zinc-500 dark:border-zinc-600 dark:bg-[#222] dark:text-white'
                }`}
              >
                {t('donate.custom', 'Custom')}
              </button>
            </div>
            {customSelected && (
              <div className="mt-3">
                <label htmlFor="donate-amount" className="mb-1 block text-xs font-bold text-zinc-600 dark:text-white">
                  {t('donate.customAmount', 'Enter amount')}
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">₹</span>
                  <input
                    id="donate-amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, '').slice(0, 7))}
                    placeholder="500"
                    inputMode="numeric"
                    className="w-full rounded-xl border border-zinc-200 py-2.5 pl-8 pr-3.5 text-sm font-bold outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200 dark:border-white/[0.1] dark:bg-[#222] dark:text-white"
                  />
                </div>
              </div>
            )}
            <p className="mt-2 text-sm font-semibold text-zinc-700 dark:text-white">
              {t('donate.youGive', 'You give:')} <span className="mono text-lg font-bold">{formatINR(Number.isFinite(parsedAmount) ? parsedAmount : 0)}</span>
              <span className="ml-2 font-medium text-slate-500">→ {t(fund.nameKey, fund.nameFallback)}</span>
            </p>
          </section>

          {/* Donor details */}
          <section className="rounded-2xl border border-zinc-200/80 bg-white p-5 dark:border-white/[0.08] dark:bg-[#1a1a1a]">
            <h2 className="mono text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-white">
              {t('donate.yourDetails', '3 · Your details (optional)')}
            </h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="donate-name" className="mb-1 block text-xs font-bold text-zinc-600 dark:text-white">
                  {t('common.name', 'Full Name')}
                </label>
                <input
                  id="donate-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('donate.namePlaceholder', 'e.g. Ananya Sharma')}
                  autoComplete="name"
                  disabled={anonymous}
                  className="w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200 disabled:opacity-50 dark:border-white/[0.1] dark:bg-[#222] dark:text-white"
                />
              </div>
              <div>
                <label htmlFor="donate-phone" className="mb-1 block text-xs font-bold text-zinc-600 dark:text-white">
                  {t('common.phone', 'Contact Phone')}
                </label>
                <input
                  id="donate-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={t('donate.phonePlaceholder', '10-digit mobile for receipt')}
                  type="tel"
                  autoComplete="tel"
                  className="mono w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200 dark:border-white/[0.1] dark:bg-[#222] dark:text-white"
                />
              </div>
            </div>
            <div className="mt-3">
              <label htmlFor="donate-pan" className="mb-1 block text-xs font-bold text-zinc-600 dark:text-white">
                {t('donate.pan', 'PAN (only if you need an 80G tax receipt)')}
              </label>
              <input
                id="donate-pan"
                value={pan}
                onChange={(e) => setPan(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10))}
                placeholder="ABCDE1234F"
                className="mono w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-sm uppercase outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200 dark:border-white/[0.1] dark:bg-[#222] dark:text-white sm:max-w-xs"
              />
            </div>
            <label className="mt-3 flex cursor-pointer items-center gap-2.5 text-sm font-medium text-zinc-700 dark:text-white">
              <input
                type="checkbox"
                checked={anonymous}
                onChange={(e) => setAnonymous(e.target.checked)}
                className="h-4 w-4 accent-emerald-700"
              />
              <span>{t('donate.anonymous', 'Donate anonymously (name hidden in public feed)')}</span>
            </label>
          </section>

          {/* Payment method (simulated) */}
          <section className="rounded-2xl border border-zinc-200/80 bg-white p-5 dark:border-white/[0.08] dark:bg-[#1a1a1a]">
            <h2 className="mono text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-white">
              {t('donate.paymentMethod', '4 · Payment method (simulated checkout)')}
            </h2>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {(
                [
                  { id: 'upi', label: 'UPI', icon: Smartphone },
                  { id: 'card', label: t('donate.card', 'Card'), icon: CreditCard },
                  { id: 'netbanking', label: t('donate.netbanking', 'Netbanking'), icon: Building2 },
                ] as const
              ).map((m) => {
                const Icon = m.icon
                const active = method === m.id
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMethod(m.id)}
                    aria-pressed={active}
                    className={`flex flex-col items-center gap-1.5 rounded-xl border py-2.5 sm:py-3 px-1 text-center text-xs sm:text-xs font-bold transition active:scale-95 ${
                      active
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200'
                        : 'border-zinc-200 text-zinc-600 hover:border-zinc-400 dark:border-white/[0.1] dark:text-white'
                    }`}
                  >
                    <Icon className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                    <span className="truncate max-w-full">{m.label}</span>
                  </button>
                )
              })}
            </div>

            {method === 'upi' && (
              <div className="mt-3 rounded-xl bg-[#f4f4f5] p-3.5 text-xs dark:bg-[#151515]">
                <div className="flex items-center justify-between gap-2">
                  <span className="min-w-0 break-all font-bold text-zinc-700 dark:text-white">
                    {t('donate.fundUpi', 'Fund UPI handle:')} <span className="mono">{fund.upiFallback}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => copyText(fund.upiFallback)}
                    className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-zinc-800 px-2 py-1 text-xs font-bold text-white hover:bg-zinc-700 dark:bg-slate-100 dark:text-zinc-800"
                  >
                    <Copy className="h-3 w-3" />
                    <span>{copied ? t('common.copied', 'Copied!') : t('common.copy', 'Copy')}</span>
                  </button>
                </div>
                <label htmlFor="donate-upi" className="mb-1 mt-3 block text-xs font-bold text-zinc-600 dark:text-white">
                  {t('donate.yourUpi', 'Your UPI ID (optional in demo)')}
                </label>
                <input
                  id="donate-upi"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value.trimStart().slice(0, 60))}
                  placeholder="yourname@okbank"
                  autoComplete="off"
                  className="mono w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-emerald-600 dark:border-white/[0.1] dark:bg-[#222] dark:text-white"
                />
              </div>
            )}

            {method === 'card' && (
              <div className="mt-3 grid gap-2.5">
                <div>
                  <label htmlFor="donate-card" className="mb-1 block text-xs font-bold text-zinc-600 dark:text-white">
                    {t('donate.cardNumber', 'Card number')}
                  </label>
                  <input
                    id="donate-card"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value.replace(/[^0-9 ]/g, '').slice(0, 19))}
                    placeholder="4111 1111 1111 1111"
                    inputMode="numeric"
                    autoComplete="cc-number"
                    className="mono w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-emerald-600 dark:border-white/[0.1] dark:bg-[#222] dark:text-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label htmlFor="donate-exp" className="mb-1 block text-xs font-bold text-zinc-600 dark:text-white">
                      {t('donate.expiry', 'Expiry (MM/YY)')}
                    </label>
                    <input
                      id="donate-exp"
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(e.target.value.replace(/[^0-9/]/g, '').slice(0, 5))}
                      placeholder="08/28"
                      inputMode="numeric"
                      autoComplete="cc-exp"
                      className="mono w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-emerald-600 dark:border-white/[0.1] dark:bg-[#222] dark:text-white"
                    />
                  </div>
                  <div>
                    <label htmlFor="donate-cvv" className="mb-1 block text-xs font-bold text-zinc-600 dark:text-white">
                      CVV
                    </label>
                    <input
                      id="donate-cvv"
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
                      placeholder="•••"
                      inputMode="numeric"
                      type="password"
                      autoComplete="cc-csc"
                      className="mono w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-emerald-600 dark:border-white/[0.1] dark:bg-[#222] dark:text-white"
                    />
                  </div>
                </div>
                <p className="text-xs text-slate-500 dark:text-white">
                  {t('donate.cardNote', 'Demo only — never enter a real card on a prototype page.')}
                </p>
              </div>
            )}

            {method === 'netbanking' && (
              <div className="mt-3">
                <label htmlFor="donate-bank" className="mb-1 block text-xs font-bold text-zinc-600 dark:text-white">
                  {t('donate.chooseBank', 'Choose bank')}
                </label>
                <select
                  id="donate-bank"
                  value={bank}
                  onChange={(e) => setBank(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-600 dark:border-white/[0.1] dark:bg-[#222] dark:text-white"
                >
                  {['SBI', 'HDFC Bank', 'ICICI Bank', 'Axis Bank', 'Bank of Baroda', 'Canara Bank'].map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {error && (
              <div className="mt-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="button"
              onClick={handleDonate}
              disabled={processing}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-700 py-4 text-base font-extrabold text-white shadow-md transition hover:bg-emerald-800 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {processing ? (
                <>
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>{t('donate.processing', 'Confirming…')}</span>
                </>
              ) : (
                <>
                  <HeartHandshake className="h-5 w-5" />
                  <span>
                    {t('donate.donateBtn', 'Donate')} {formatINR(Number.isFinite(parsedAmount) ? parsedAmount : 0)}
                  </span>
                </>
              )}
            </button>
            <p className="mt-2 text-center text-xs text-slate-500 dark:text-white">
              {t('donate.secureNote', 'Simulated secure checkout · No OTP, card charge, or bank debit happens in this demo.')}
            </p>
          </section>
        </div>

        {/* Right: official channels */}
        <div className="space-y-4">
          <section className="rounded-2xl border border-zinc-200/80 bg-white p-5 dark:border-white/[0.08] dark:bg-[#1a1a1a]">
            <h2 className="mono text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-white">
              {t('donate.govTitle', 'Prefer official channels?')}
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-zinc-600 dark:text-white">
              {t(
                'donate.govDesc',
                'You can always donate directly: state Chief Minister Relief Funds and the National Disaster Response resources listed on the NDMA portal.',
              )}
            </p>
            <div className="mt-3 flex flex-col gap-2">
              <a
                href="https://ndma.gov.in"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-zinc-200 py-2.5 text-xs font-bold text-zinc-700 transition hover:bg-zinc-50 dark:border-white/[0.1] dark:text-white dark:hover:bg-[#222]"
              >
                <span>ndma.gov.in</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </a>
              <a
                href="tel:1070"
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-zinc-900 py-2.5 text-xs font-bold text-white transition hover:bg-zinc-700 dark:bg-slate-100 dark:text-zinc-900"
              >
                <span>{t('donate.callHelpline', 'Confirm fund details on helpline 1070')}</span>
              </a>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
