import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  FileSpreadsheet,
  Building,
  Home,
  Droplets,
  Route,
  Zap,
  XCircle,
  ExternalLink,
  Cpu,
  Search,
  MapPin,
  TrendingUp,
  Flame,
  Phone,
  RefreshCw
} from 'lucide-react'
import LeafletMap, { type MapMarker } from '../../components/map/LeafletMap'
import { listDamageAssessments, updateDamageAssessmentStatus } from '../../api/endpoints'
import { useToast } from '../../components/common/Toast'
import { subscribeRealtimeUpdates } from '../../lib/realtimeEventBus'
import type { DamageAssessmentReport, DamageInfrastructureType } from '../../types'

const INFRA_ICONS: Record<DamageInfrastructureType, typeof Home> = {
  broken_home: Home,
  gov_pipeline: Droplets,
  road_bridge: Route,
  electrical_power: Zap,
  commercial_public: Building,
  agricultural: Flame,
}

const INFRA_LABELS: Record<DamageInfrastructureType, string> = {
  broken_home: 'Broken Home / Residential',
  gov_pipeline: 'Gov Water/Gas Pipeline',
  road_bridge: 'Road, Culvert & Bridge',
  electrical_power: 'Power Grid Feeder',
  commercial_public: 'Commercial / Public Wing',
  agricultural: 'Agricultural / Farmland',
}

export default function DamageAssessment() {
  const { toast } = useToast()
  const [items, setItems] = useState<DamageAssessmentReport[]>([])
  const [infraFilter, setInfraFilter] = useState<string>('all')
  const [gradeFilter, setGradeFilter] = useState<string>('all')
  const [districtFilter, setDistrictFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedReport, setSelectedReport] = useState<DamageAssessmentReport | null>(null)
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({ lat: 22.5726, lng: 88.3639 })

  const loadData = useCallback(async () => {
    try {
      const data = await listDamageAssessments()
      setItems(data)
    } catch {
      toast('Failed to load damage assessments', 'error')
    }
  }, [toast])

  useEffect(() => {
    loadData()
    // Subscribe to 0ms realtime broadcasts from citizen uploads
    const unsub = subscribeRealtimeUpdates((event) => {
      if (event.type === 'damage_assessed' || event.type === 'damage_updated' || event.type === 'data_reset') {
        loadData()
      }
    })
    return () => unsub()
  }, [loadData])

  // Filtered dataset
  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (!item) return false
      if (infraFilter !== 'all' && item.infrastructureType !== infraFilter) return false
      if (gradeFilter !== 'all' && item.damageGrade !== gradeFilter) return false
      if (districtFilter !== 'all' && item.district !== districtFilter) return false
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const match =
          (item.claimId || '').toLowerCase().includes(q) ||
          (item.claimantName && item.claimantName.toLowerCase().includes(q)) ||
          (item.claimantPhone || '').includes(q) ||
          (item.propertyAddress || '').toLowerCase().includes(q) ||
          (item.district || '').toLowerCase().includes(q)
        if (!match) return false
      }
      return true
    })
  }, [items, infraFilter, gradeFilter, districtFilter, searchQuery])

  // Sector damage aggregation (Max Damage Area Leaderboard)
  const sectorAggregation = useMemo(() => {
    const map = new Map<
      string,
      {
        district: string
        totalScore: number
        count: number
        destroyedCount: number
        pipelineCount: number
        totalCompensation: number
        lat: number
        lng: number
      }
    >()

    items.forEach((item) => {
      const dist = item.district || 'Unassigned Sector'
      const existing = map.get(dist) || {
        district: dist,
        totalScore: 0,
        count: 0,
        destroyedCount: 0,
        pipelineCount: 0,
        totalCompensation: 0,
        lat: item.latitude,
        lng: item.longitude,
      }

      existing.totalScore += item.damageScore
      existing.count += 1
      if (item.damageGrade === 'DESTROYED') existing.destroyedCount += 1
      if (item.infrastructureType === 'gov_pipeline') existing.pipelineCount += 1
      existing.totalCompensation += item.compensationInr
      map.set(dist, existing)
    })

    return Array.from(map.values()).sort((a, b) => b.totalScore - a.totalScore)
  }, [items])

  const worstSector = sectorAggregation[0]

  // Total KPIs
  const totalReportsCount = items.length
  const totalDestroyed = items.filter((i) => i.damageGrade === 'DESTROYED').length
  const totalPipelines = items.filter((i) => i.infrastructureType === 'gov_pipeline').length
  const totalCompensationInr = items.reduce((acc, curr) => acc + curr.compensationInr, 0)
  const avgDamageScore =
    items.length > 0 ? (items.reduce((acc, curr) => acc + curr.damageScore, 0) / items.length).toFixed(1) : '0.0'

  // Map markers
  const markers: MapMarker[] = useMemo(() => {
    return filtered.map((item) => {
      const isDestroyed = item.damageGrade === 'DESTROYED'
      const isMajor = item.damageGrade === 'MAJOR'
      const color = isDestroyed ? '#dc2626' : isMajor ? '#ea580c' : '#0284c7'

      return {
        id: item.id,
        position: { lat: item.latitude, lng: item.longitude },
        title: `${item.claimId} (${item.damageScore} pts)`,
        subtitle: `${INFRA_LABELS[item.infrastructureType]} — ${item.propertyAddress}`,
        color,
        isSos: isDestroyed,
      }
    })
  }, [filtered])

  const handleStatusChange = async (id: string, newStatus: DamageAssessmentReport['status']) => {
    try {
      await updateDamageAssessmentStatus(id, newStatus)
      setItems((prev) => prev.map((item) => (item.id === id ? { ...item, status: newStatus } : item)))
      if (selectedReport?.id === id) {
        setSelectedReport((prev) => (prev ? { ...prev, status: newStatus } : null))
      }
      toast(`Claim status updated to ${newStatus}`)
    } catch {
      toast('Failed to update status', 'error')
    }
  }

  const focusOnReport = (rep: DamageAssessmentReport) => {
    setMapCenter({ lat: rep.latitude, lng: rep.longitude })
    setSelectedReport(rep)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-600 text-white shadow-md">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Disaster Damage Intelligence & Hotspot Command
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Automated damage assessment powered by HuggingFace ResNet-50 vision classifier with regional severity ranking.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <a
            href="https://huggingface.co/Divyanshu-Kumar19/aapdasetu-damage-assessment"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl border border-yellow-500/40 bg-yellow-500/10 px-3 py-2 text-xs font-bold text-yellow-700 dark:text-yellow-400 hover:bg-yellow-500/20"
          >
            <Cpu className="h-4 w-4" />
            <span>HF Model: aapdasetu-damage-assessment</span>
            <ExternalLink className="h-3 w-3 opacity-70" />
          </a>

          <button
            onClick={loadData}
            className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 dark:border-white/[0.1] dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mono">
            Worst-Hit Sector
          </div>
          <div className="mt-1 text-base font-bold text-red-600 dark:text-red-400 truncate">
            {worstSector ? worstSector.district : 'N/A'}
          </div>
          <div className="text-[11px] font-mono text-slate-400">
            {worstSector ? `${worstSector.totalScore.toFixed(0)} total damage pts` : 'No data'}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mono">
            Total Assessed Claims
          </div>
          <div className="mt-1 text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">
            {totalReportsCount}
          </div>
          <div className="text-[11px] text-slate-400">Avg Score: {avgDamageScore} / 100 pts</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mono">
            Fully Destroyed
          </div>
          <div className="mt-1 text-2xl font-bold font-mono text-red-600 dark:text-red-400">
            {totalDestroyed}
          </div>
          <div className="text-[11px] text-slate-400">90–100 Severity Scale</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mono">
            Pipeline Breaches
          </div>
          <div className="mt-1 text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">
            {totalPipelines}
          </div>
          <div className="text-[11px] text-slate-400">Gov Water & Gas Mains</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mono">
            SDRF Relief Loss
          </div>
          <div className="mt-1 text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 truncate">
            ₹{totalCompensationInr.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-slate-400">Automated Relief Math</div>
        </div>
      </div>

      {/* Main Grid: Map & Max Damage Leaderboard */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Interactive GIS Damage Map (2 Cols) */}
        <div className="space-y-3 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-red-600 dark:text-red-400" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100 mono">
                Geospatial Damage Points ({markers.length} Active Pins)
              </h2>
            </div>

            <div className="flex items-center gap-3 text-[11px] font-semibold text-slate-500">
              <span className="flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-full bg-red-600 animate-pulse"></span>
                <span>Destroyed (90-100)</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500"></span>
                <span>Major (60-85)</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-full bg-slate-500"></span>
                <span>Minor (20-45)</span>
              </span>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-sm dark:border-slate-800">
            <LeafletMap
              center={mapCenter}
              zoom={11}
              markers={markers}
              height="440px"
              autoFit={true}
              defaultLayer="satellite"
            />
          </div>
        </div>

        {/* Sector Damage Ranking Leaderboard (1 Col) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-slate-900 dark:text-slate-100" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100 mono">
                Max Damage Sectors
              </h2>
            </div>
            <span className="text-[11px] text-slate-400">By Damage Points</span>
          </div>

          <div className="h-[440px] space-y-2.5 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            {sectorAggregation.map((sec, idx) => {
              const isFirst = idx === 0
              const maxScore = sectorAggregation[0]?.totalScore || 100
              const pct = Math.round((sec.totalScore / maxScore) * 100)

              return (
                <div
                  key={sec.district}
                  onClick={() => {
                    setDistrictFilter(districtFilter === sec.district ? 'all' : sec.district)
                    setMapCenter({ lat: sec.lat, lng: sec.lng })
                  }}
                  className={`rounded-xl border p-3 transition-all cursor-pointer ${
                    districtFilter === sec.district
                      ? 'border-red-500 bg-red-50/50 dark:border-red-500 dark:bg-red-950/40'
                      : isFirst
                      ? 'border-red-200 bg-red-50/30 hover:border-red-300 dark:border-red-900/50 dark:bg-red-950/20'
                      : 'border-slate-200 bg-slate-50/60 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[10px] font-bold font-mono ${
                          isFirst
                            ? 'bg-red-600 text-white'
                            : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                        }`}
                      >
                        #{idx + 1}
                      </span>
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                        {sec.district}
                      </span>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-mono text-xs font-bold text-red-600 dark:text-red-400">
                        {sec.totalScore.toFixed(1)} pts
                      </span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                    <div
                      className={`h-full rounded-full ${
                        isFirst ? 'bg-red-600' : idx === 1 ? 'bg-amber-500' : 'bg-slate-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                    <span>
                      {sec.count} reports ({sec.destroyedCount} destroyed)
                    </span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                      ₹{sec.totalCompensation.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Claim ID, Claimant, Phone, Address, Sector…"
              className="w-full rounded-xl border border-slate-300 bg-slate-50 pl-10 pr-4 py-2 text-xs font-medium text-slate-900 outline-none transition focus:border-slate-900 focus:bg-white dark:border-white/[0.1] dark:bg-slate-800 dark:text-slate-100 dark:focus:border-slate-300"
            />
          </div>

          {/* District Dropdown */}
          <select
            value={districtFilter}
            onChange={(e) => setDistrictFilter(e.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 outline-none dark:border-white/[0.1] dark:bg-slate-800 dark:text-slate-200"
          >
            <option value="all">All Disaster Sectors ({items.length})</option>
            {sectorAggregation.map((s) => (
              <option key={s.district} value={s.district}>
                {s.district} ({s.count})
              </option>
            ))}
          </select>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mono mr-1">
            Category:
          </span>
          {[
            { id: 'all', label: 'All Infra' },
            { id: 'broken_home', label: 'Broken Homes' },
            { id: 'gov_pipeline', label: 'Gov Pipelines' },
            { id: 'road_bridge', label: 'Roads & Bridges' },
            { id: 'electrical_power', label: 'Power Grid' },
            { id: 'commercial_public', label: 'Commercial' },
            { id: 'agricultural', label: 'Agricultural' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setInfraFilter(cat.id)}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-colors cursor-pointer ${
                infraFilter === cat.id
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              {cat.label}
            </button>
          ))}

          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mono ml-3 mr-1">
            Grade:
          </span>
          {[
            { id: 'all', label: 'All Grades' },
            { id: 'DESTROYED', label: 'DESTROYED (90-100)' },
            { id: 'MAJOR', label: 'MAJOR (60-85)' },
            { id: 'MINOR', label: 'MINOR (20-45)' },
          ].map((grd) => (
            <button
              key={grd.id}
              onClick={() => setGradeFilter(grd.id)}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-colors cursor-pointer ${
                gradeFilter === grd.id
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              {grd.label}
            </button>
          ))}
        </div>
      </div>

      {/* Submissions Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-200 px-5 py-3.5 dark:border-slate-800 flex items-center justify-between">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mono">
            Individual Damage Claims & ResNet-50 Score Breakdown ({filtered.length})
          </div>
          <span className="text-[11px] text-slate-400">Click row to inspect on map & verify</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 font-bold uppercase tracking-wider text-slate-500 mono text-[10px] dark:border-slate-800 dark:bg-slate-950">
              <tr>
                <th className="px-4 py-3">Claim ID</th>
                <th className="px-4 py-3">Infrastructure Type</th>
                <th className="px-4 py-3">Sector & Address</th>
                <th className="px-4 py-3 text-center">AI Damage Score</th>
                <th className="px-4 py-3">ResNet-50 Grade</th>
                <th className="px-4 py-3">SDRF Relief</th>
                <th className="px-4 py-3">Claimant Contact</th>
                <th className="px-4 py-3">Status & Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {filtered.map((item) => {
                const Icon = INFRA_ICONS[item.infrastructureType] || Home
                const isSelected = selectedReport?.id === item.id

                return (
                  <tr
                    key={item.id}
                    onClick={() => focusOnReport(item)}
                    className={`transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-slate-100/90 dark:bg-slate-800/90'
                        : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    {/* Claim ID */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="font-mono font-bold text-slate-900 dark:text-slate-100">
                        {item.claimId}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>

                    {/* Infrastructure */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-slate-100">
                            {INFRA_LABELS[item.infrastructureType]}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Address */}
                    <td className="px-4 py-3.5 max-w-xs">
                      <div className="font-bold text-slate-900 dark:text-slate-100 truncate">
                        {item.district}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {item.propertyAddress}
                      </div>
                    </td>

                    {/* AI Score */}
                    <td className="px-4 py-3.5 text-center whitespace-nowrap">
                      <span
                        className={`inline-flex items-center justify-center rounded-lg px-2.5 py-1 font-mono text-xs font-bold ${
                          item.damageScore >= 90
                            ? 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400'
                            : item.damageScore >= 60
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        {item.damageScore.toFixed(1)} / 100
                      </span>
                    </td>

                    {/* Grade */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="font-mono font-bold text-xs text-slate-900 dark:text-slate-100">
                        {item.damageGrade}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {item.confidence}% ResNet50
                      </div>
                    </td>

                    {/* Compensation */}
                    <td className="px-4 py-3.5 whitespace-nowrap font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      ₹{item.compensationInr.toLocaleString('en-IN')}
                    </td>

                    {/* Contact */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="font-medium text-slate-900 dark:text-slate-100">
                        {item.claimantName || 'Citizen'}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1">
                        <Phone className="h-2.5 w-2.5" />
                        <span>{item.claimantPhone}</span>
                      </div>
                    </td>

                    {/* Status Actions */}
                    <td className="px-4 py-3.5 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleStatusChange(item.id, 'approved')}
                          className={`rounded-lg px-2.5 py-1 text-[11px] font-bold cursor-pointer transition-colors ${
                            item.status === 'approved'
                              ? 'bg-emerald-600 text-white'
                              : 'border border-slate-300 bg-white text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 dark:border-white/[0.1] dark:bg-slate-800 dark:text-slate-300'
                          }`}
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleStatusChange(item.id, 'flagged_fraud')}
                          className={`rounded-lg px-2 py-1 text-[11px] font-bold cursor-pointer transition-colors ${
                            item.status === 'flagged_fraud'
                              ? 'bg-red-600 text-white'
                              : 'border border-slate-300 bg-white text-slate-700 hover:bg-red-50 hover:text-red-700 dark:border-white/[0.1] dark:bg-slate-800 dark:text-slate-300'
                          }`}
                        >
                          Flag
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Photo Inspection & AI Modal */}
      {selectedReport && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
          onClick={() => setSelectedReport(null)}
        >
          <div
            className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-800">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mono">
                  Damage Claim Telemetry
                </span>
                <div className="font-mono text-lg font-bold text-slate-900 dark:text-slate-100">
                  {selectedReport.claimId}
                </div>
              </div>
              <button
                onClick={() => setSelectedReport(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 cursor-pointer"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {/* Photo preview if present */}
              {selectedReport.photoUrl && (
                <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-white/[0.1] max-h-56 bg-slate-950">
                  <img
                    src={selectedReport.photoUrl}
                    alt="Damage"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Metrics Grid */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 dark:border-slate-800 dark:bg-slate-950">
                  <div className="text-[10px] uppercase font-bold text-slate-400 mono">Score</div>
                  <div className="font-mono text-base font-bold text-red-600 dark:text-red-400">
                    {selectedReport.damageScore} / 100
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 dark:border-slate-800 dark:bg-slate-950">
                  <div className="text-[10px] uppercase font-bold text-slate-400 mono">Class</div>
                  <div className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100">
                    {selectedReport.damageGrade}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 dark:border-slate-800 dark:bg-slate-950">
                  <div className="text-[10px] uppercase font-bold text-slate-400 mono">SDRF Relief</div>
                  <div className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    ₹{selectedReport.compensationInr.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>

              {/* Details List */}
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">Infrastructure:</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {INFRA_LABELS[selectedReport.infrastructureType]}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">Location:</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100 text-right">
                    {selectedReport.propertyAddress}, {selectedReport.district}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">Claimant:</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {selectedReport.claimantName || 'Citizen'} ({selectedReport.claimantPhone})
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">AI Model:</span>
                  <span className="font-mono text-[11px] font-semibold text-yellow-700 dark:text-yellow-400">
                    {selectedReport.huggingFaceModel || 'Divyanshu-Kumar19/aapdasetu-damage-assessment'}
                  </span>
                </div>
              </div>

              {/* Factors */}
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mono">
                  Observed Structural Factors:
                </span>
                <ul className="mt-1 list-inside list-disc space-y-0.5 text-xs text-slate-600 dark:text-slate-300">
                  {selectedReport.factors.map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
              </div>

              {/* Status change actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  onClick={() => handleStatusChange(selectedReport.id, 'flagged_fraud')}
                  className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-bold text-red-700 hover:bg-red-100 dark:border-red-900 dark:bg-red-950/60 dark:text-red-300 cursor-pointer"
                >
                  Flag for Inspection
                </button>
                <button
                  onClick={() => handleStatusChange(selectedReport.id, 'approved')}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 cursor-pointer shadow-sm"
                >
                  Approve SDRF Relief Claim
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
