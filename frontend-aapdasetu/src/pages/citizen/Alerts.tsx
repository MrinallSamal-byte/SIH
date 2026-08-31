import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ShieldAlert,
  AlertTriangle,
  Info,
  Clock,
  MapPin,
  Radio,
  MessageCircle,
  MessageSquare,
  Crosshair
} from 'lucide-react'
import { listAlerts } from '../../api/endpoints'
import Badge from '../../components/common/Badge'
import { useRealtime } from '../../hooks/useRealtime'
import { useGeoLocation } from '../../hooks/useLocation'
import { useLanguage } from '../../lib/i18n'
import { reverseGeocode, timeAgo } from '../../lib/helpers'
import type { Alert } from '../../types'

const severityRank: Record<string, number> = { critical: 0, warning: 1, info: 2 }

export default function Alerts() {
  const { t } = useLanguage()
  const fetchAlerts = useCallback(() => listAlerts(), [])
  const alerts = useRealtime<Alert[]>(fetchAlerts, 8000)
  const [filter, setFilter] = useState<string>('all')
  const { coords, source: locationSource } = useGeoLocation()
  const [userArea, setUserArea] = useState<string | null>(null)
  const lastAreaFixRef = useRef<string>('')
  const userLat = coords?.latitude
  const userLng = coords?.longitude

  // Resolve the user's area once a real fix exists (any provenance except the
  // hardcoded default estimate) so region matching can highlight relevant alerts.
  // The fix is quantized to a ~100m grid and de-duplicated — the GPS watch in
  // the location context ticks continuously and would otherwise re-run this
  // reverse geocode on every coordinate update.
  useEffect(() => {
    if (userLat == null || userLng == null || locationSource === 'default') return
    const fixKey = `${userLat.toFixed(3)},${userLng.toFixed(3)}`
    if (fixKey === lastAreaFixRef.current) return
    lastAreaFixRef.current = fixKey
    let cancelled = false
    reverseGeocode({ lat: userLat, lng: userLng })
      .then((addr) => {
        if (!cancelled && addr) setUserArea(addr.toLowerCase())
      })
      .catch(() => {
        if (!cancelled) lastAreaFixRef.current = ''
      })
    return () => {
      cancelled = true
    }
  }, [userLat, userLng, locationSource])

  const matchesUserArea = (region?: string): boolean => {
    if (!userArea || !region) return false
    // Loose token match: any comma-separated part of the alert region that
    // appears in the reverse-geocoded address counts as affecting the area.
    return region
      .toLowerCase()
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean)
      .some((part) => userArea.includes(part))
  }

  const filtered = (alerts ?? [])
    .filter((a) => filter === 'all' || a.severity === filter)
    .sort((a, b) => {
      // Severity groups first, then area-matched alerts to the top of each
      // group, newest within the same match tier.
      const sevDiff = (severityRank[a.severity] ?? 3) - (severityRank[b.severity] ?? 3)
      if (sevDiff !== 0) return sevDiff
      const areaDiff =
        (matchesUserArea(a.targetArea) ? 0 : 1) - (matchesUserArea(b.targetArea) ? 0 : 1)
      if (areaDiff !== 0) return areaDiff
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Radio className="h-5 w-5 text-red-600 animate-pulse" />
            <h1 className="text-2xl font-bold text-zinc-800 dark:text-slate-300">{t('bulletin.title')}</h1>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {t('alerts.pageDesc')}
          </p>
        </div>

        {/* Severity Filter Tabs */}
        <div className="flex items-center gap-1 rounded-xl border border-zinc-200/80 bg-white p-1 dark:border-white/[0.08] dark:bg-[#1a1a1a] shadow-sm">
          {(['all', 'critical', 'warning', 'info'] as const).map((sev) => (
            <button
              key={sev}
              type="button"
              onClick={() => setFilter(sev)}
              className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
                filter === sev
                  ? 'bg-zinc-800 text-white dark:bg-slate-100 dark:text-zinc-800'
                  : 'text-zinc-500 hover:text-zinc-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
              >
              {sev === 'all' ? t('common.all') : sev === 'critical' ? t('alerts.sevCritical') : sev === 'warning' ? t('alerts.sevWarning') : t('alerts.sevInfo')}
            </button>
          ))}
        </div>
      </div>

      {/* Skeleton cards while first load is in flight */}
      {alerts === null && (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton-shimmer h-36 rounded-2xl" />
          ))}
        </div>
      )}

      <div className="space-y-3">
        {filtered.map((a) => {
          const borderClass =
            a.severity === 'critical'
              ? 'border-l-4 border-l-red-600'
              : a.severity === 'warning'
              ? 'border-l-4 border-l-amber-500'
              : 'border-l-4 border-l-blue-500'

          const Icon = a.severity === 'critical' ? ShieldAlert : a.severity === 'warning' ? AlertTriangle : Info

          const affectsArea = matchesUserArea(a.targetArea)
          const shareText = `${a.title}${a.targetArea ? ` — ${a.targetArea}` : ''}`
          const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`
          const smsUrl = `sms:?&body=${encodeURIComponent(shareText)}`

          return (
            <div
              key={a.id}
              className={`rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm transition dark:border-white/[0.08] dark:bg-[#1a1a1a] ${borderClass}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Icon className="size-[18px] text-slate-500" />
                  <Badge value={a.severity} label={a.severity === 'critical' ? t('alerts.sevCritical') : a.severity === 'warning' ? t('alerts.sevWarning') : t('alerts.sevInfo')} />
                  <h3 className="text-sm font-bold text-zinc-800 dark:text-slate-300">{a.title}</h3>
                </div>
                <div className="flex items-center gap-1 text-xs text-slate-400 mono">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{timeAgo(a.createdAt)}</span>
                </div>
              </div>

              <p className="mt-2.5 text-xs leading-relaxed text-zinc-500 dark:text-slate-300">{a.message}</p>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-2.5 dark:border-white/[0.08]">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  {a.targetArea && (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-slate-400" />
                      <span className="font-semibold text-zinc-600 dark:text-slate-300">{t('alerts.affectedArea')} {a.targetArea}</span>
                    </span>
                  )}
                  {affectsArea && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                      <Crosshair className="h-3 w-3" />
                      {t('alerts.affectsYourArea')}
                    </span>
                  )}
                </div>

                {/* Per-alert share actions — 44px+ tap targets */}
                <div className="ml-auto flex items-center gap-2">
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${t('common.share')} WhatsApp`}
                    title={`${t('common.share')} WhatsApp`}
                    className="flex h-11 w-11 items-center justify-center rounded-xl border border-zinc-200/80 bg-[#f4f4f5] text-emerald-600 transition hover:bg-emerald-50 hover:text-emerald-700 active:scale-95 dark:border-white/[0.08] dark:bg-[#222222] dark:text-emerald-400 dark:hover:bg-emerald-950/60"
                  >
                    <MessageCircle className="size-[18px]" />
                  </a>
                  <a
                    href={smsUrl}
                    aria-label={`${t('common.share')} SMS`}
                    title={`${t('common.share')} SMS`}
                    className="flex h-11 w-11 items-center justify-center rounded-xl border border-zinc-200/80 bg-[#f4f4f5] text-blue-600 transition hover:bg-blue-50 hover:text-blue-700 active:scale-95 dark:border-white/[0.08] dark:bg-[#222222] dark:text-blue-400 dark:hover:bg-blue-950/60"
                  >
                    <MessageSquare className="size-[18px]" />
                  </a>
                </div>
              </div>
            </div>
          )
        })}

        {alerts && filtered.length === 0 && (
          <div className="rounded-2xl border border-dashed border-zinc-200/80 p-12 text-center text-xs text-slate-400 dark:border-white/[0.08]">
            {t('alerts.empty')}
          </div>
        )}
      </div>
    </div>
  )
}
