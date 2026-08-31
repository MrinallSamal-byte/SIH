import { useCallback, useMemo, useState } from 'react'
import {
  Building2,
  Search,
  Phone,
  Mail,
  MapPin,
  Shield,
  Flame,
  HardHat,
  Cross,
  HeartHandshake
} from 'lucide-react'
import { listAgencies } from '../../api/endpoints'
import Badge from '../../components/common/Badge'
import Loader from '../../components/common/Loader'
import { useRealtime } from '../../hooks/useRealtime'
import { useLanguage } from '../../lib/i18n'
import type { Agency } from '../../types'

const TYPE_ICONS: Record<string, typeof Building2> = {
  fire_department: Flame,
  police: Shield,
  ndrf: HardHat,
  hospital: Cross,
  ngo: HeartHandshake
}

export default function Agencies() {
  const { t } = useLanguage()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const fetchAgencies = useCallback(() => listAgencies(), [])
  const agencies = useRealtime<Agency[]>(fetchAgencies, 10000)

  const filtered = useMemo(() => {
    if (!agencies) return []
    return agencies.filter((a) => {
      if (typeFilter !== 'all' && a.type !== typeFilter) return false
      if (search.trim()) {
        const q = search.toLowerCase().trim()
        const matchName = (a.name || '').toLowerCase().includes(q)
        const matchJurisdiction = (a.jurisdiction || '').toLowerCase().includes(q)
        const matchPhone = (a.contactPhone || '').includes(q)
        const matchEmail = (a.contactEmail || '').toLowerCase().includes(q)
        if (!matchName && !matchJurisdiction && !matchPhone && !matchEmail) return false
      }
      return true
    })
  }, [agencies, typeFilter, search])

  if (!agencies) return <Loader />

  const totalCount = agencies.length
  const allTypes = Array.from(new Set(agencies.map((a) => a.type)))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="h-6 w-6 text-slate-900 dark:text-slate-100" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {t('ag.title')}
            </h1>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {t('ag.subtitle')}
          </p>
        </div>

        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300 mono">
          {totalCount} {t('ag.operationalAgencies')}
        </span>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('ag.searchPlaceholder')}
            className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3.5 py-2 text-xs text-slate-900 outline-none focus:border-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />
        </div>

        {/* Agency Type Chips */}
        <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-3 dark:border-slate-800">
          <span className="text-[11px] font-bold text-slate-400 mono mr-1 uppercase">{t('ag.agencyWing')}:</span>
          <button
            type="button"
            onClick={() => setTypeFilter('all')}
            className={`rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
              typeFilter === 'all'
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            {t('ag.allWings')}
          </button>
          {allTypes.map((type) => {
            const Icon = TYPE_ICONS[type] || Building2
            return (
              <button
                key={type}
                type="button"
                onClick={() => setTypeFilter(type)}
                className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
                  typeFilter === type
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                <Icon className="h-3 w-3" />
                <span>{type.toUpperCase()}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Agencies Cards Grid */}
      <div className="grid gap-3.5 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((a) => {
          const Icon = TYPE_ICONS[a.type] || Building2

          return (
            <div
              key={a.id}
              className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="font-bold text-sm text-slate-900 dark:text-slate-100 leading-tight">{a.name}</h2>
                      <div className="text-[10px] uppercase font-bold text-slate-400 mono mt-0.5">{a.type} {t('ag.wing')}</div>
                    </div>
                  </div>

                  <Badge value={a.type} />
                </div>

                <div className="mt-4 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                  <div className="flex items-start gap-1.5">
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400 mt-0.5" />
                    <span>{t('ag.jurisdiction')}: <strong className="text-slate-800 dark:text-slate-200">{a.jurisdiction || t('ag.statewideCommand')}</strong></span>
                  </div>

                  {a.contactPhone && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-emerald-600" />
                      <span>{t('ag.hotline')}: <strong className="font-mono">{a.contactPhone}</strong></span>
                    </div>
                  )}

                  {a.contactEmail && (
                    <div className="flex items-center gap-1.5 truncate">
                      <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{a.contactEmail}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-5 flex items-center gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                {a.contactPhone && (
                  <a
                    href={`tel:${a.contactPhone}`}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 py-2 text-xs font-bold text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white transition"
                  >
                    <Phone className="h-3.5 w-3.5" />
                    <span>{t('ag.callUnit')}</span>
                  </a>
                )}
                {a.contactEmail && (
                  <a
                    href={`mailto:${a.contactEmail}`}
                    className="inline-flex items-center justify-center gap-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition"
                  >
                    <Mail className="h-3.5 w-3.5" />
                    <span>{t('ag.email')}</span>
                  </a>
                )}
              </div>
            </div>
          )
        })}

        {filtered.length === 0 && (
          <div className="col-span-full rounded-2xl border border-dashed border-slate-300 p-12 text-center text-xs text-slate-400 dark:border-slate-800">
            {t('ag.noMatches')}
          </div>
        )}
      </div>
    </div>
  )
}
