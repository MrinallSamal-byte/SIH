import { useCallback, useMemo, useState } from 'react'
import {
  Building2,
  Plus,
  Edit2,
  Trash2,
  MapPin,
  Phone,
  Users,
  Search,
  X,
  RotateCcw
} from 'lucide-react'
import { listShelters, createShelter, updateShelter, deleteShelter, resetMockDatabase } from '../../api/endpoints'
import Badge from '../../components/common/Badge'
import Loader from '../../components/common/Loader'
import LeafletMap, { type MapMarker } from '../../components/map/LeafletMap'
import LandmarkPicker from '../../components/map/LandmarkPicker'
import { useRealtime } from '../../hooks/useRealtime'
import { useToast } from '../../components/common/Toast'
import type { GeoPoint, Shelter, ShelterStatus } from '../../types'

export type FacilityType = 'food' | 'water' | 'medical_station' | 'power_generator'

const ALL_FACILITIES: { id: FacilityType; label: string }[] = [
  { id: 'food', label: 'Food & Meals' },
  { id: 'water', label: 'Clean Drinking Water' },
  { id: 'medical_station', label: 'Medical Station / First Aid' },
  { id: 'power_generator', label: 'Power Generator' },
]

export default function AdminShelters() {
  const { toast } = useToast()
  // Include all shelters (even closed/hidden ones) in admin view
  const fetchShelters = useCallback(() => listShelters(undefined, true), [])
  const shelters = useRealtime<Shelter[]>(fetchShelters, 5000)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [facilityFilter, setFacilityFilter] = useState<string>('all')

  // Modal State for Create / Edit
  const [modalOpen, setModalOpen] = useState(false)
  const [editingShelter, setEditingShelter] = useState<Shelter | null>(null)
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [latitude, setLatitude] = useState('22.5726')
  const [longitude, setLongitude] = useState('88.3639')
  const [capacity, setCapacity] = useState('300')
  const [occupancy, setOccupancy] = useState('0')
  const [contactPhone, setContactPhone] = useState('+91-')
  const [facilities, setFacilities] = useState<string[]>(['food', 'water'])
  const [status, setStatus] = useState<ShelterStatus>('open')
  const [showLocationPicker, setShowLocationPicker] = useState(false)
  const [saving, setSaving] = useState(false)

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingShelter(null)
    setName('')
    setAddress('')
    setLatitude('22.5726')
    setLongitude('88.3639')
    setCapacity('500')
    setOccupancy('0')
    setContactPhone('+91-')
    setFacilities(['food', 'water', 'medical_station'])
    setStatus('open')
    setShowLocationPicker(false)
    setModalOpen(true)
  }

  // Open Edit Modal
  const handleOpenEdit = (s: Shelter) => {
    setEditingShelter(s)
    setName(s.name)
    setAddress(s.address ?? '')
    setLatitude(s.latitude.toString())
    setLongitude(s.longitude.toString())
    setCapacity(s.capacity.toString())
    setOccupancy(s.occupancy.toString())
    setContactPhone(s.contactPhone || '')
    setFacilities(s.facilities)
    setStatus(s.status)
    setShowLocationPicker(false)
    setModalOpen(true)
  }

  // Toggle Facility Checkbox
  const toggleFacility = (f: FacilityType) => {
    setFacilities((prev) =>
      prev.includes(f) ? prev.filter((item) => item !== f) : [...prev, f]
    )
  }

  // Save Shelter (Create or Edit)
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !address.trim()) {
      toast('Please enter shelter name and address', 'error')
      return
    }

    setSaving(true)
    try {
      const capNum = Math.max(1, Number(capacity) || 100)
      const occNum = Math.max(0, Number(occupancy) || 0)
      const latNum = Number(latitude) || 22.5726
      const lngNum = Number(longitude) || 88.3639

      if (editingShelter) {
        await updateShelter(editingShelter.id, {
          name: name.trim(),
          address: address.trim(),
          latitude: latNum,
          longitude: lngNum,
          capacity: capNum,
          occupancy: occNum,
          facilities,
          contactPhone: contactPhone.trim() || undefined,
          status,
        })
        toast(`Shelter "${name}" updated successfully!`, 'success')
      } else {
        await createShelter({
          name: name.trim(),
          address: address.trim(),
          latitude: latNum,
          longitude: lngNum,
          capacity: capNum,
          occupancy: occNum,
          facilities,
          contactPhone: contactPhone.trim() || undefined,
          status,
        })
        toast(`New shelter "${name}" created and published to citizens!`, 'success')
      }

      setModalOpen(false)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to save shelter', 'error')
    } finally {
      setSaving(false)
    }
  }

  // Delete Shelter
  const handleDelete = async (id: string, shelterName: string) => {
    if (window.confirm(`Are you sure you want to permanently delete shelter "${shelterName}"? It will be removed from all citizen maps.`)) {
      try {
        await deleteShelter(id)
        toast(`Shelter "${shelterName}" deleted.`, 'success')
      } catch (err) {
        toast(err instanceof Error ? err.message : 'Failed to delete shelter', 'error')
      }
    }
  }

  // Quick Change Status
  const handleQuickStatus = async (s: Shelter, newStatus: ShelterStatus) => {
    try {
      await updateShelter(s.id, { status: newStatus })
      toast(`Shelter status changed to ${newStatus.toUpperCase()}`)
    } catch {
      toast('Failed to change status', 'error')
    }
  }

  // Quick Update Occupancy
  const handleQuickOccupancy = async (s: Shelter, newOccupancy: number) => {
    try {
      const safeOcc = Math.max(0, Math.min(s.capacity, newOccupancy))
      await updateShelter(s.id, {
        occupancy: safeOcc,
        status: safeOcc >= s.capacity ? 'full' : s.status === 'closed' ? 'closed' : 'open',
      })
      toast(`Occupancy updated to ${safeOcc}/${s.capacity}`)
    } catch {
      toast('Failed to update occupancy', 'error')
    }
  }

  const handleResetData = async () => {
    if (window.confirm('Reset all demo data to 1,000+ realistic disaster reports, 8 shelters, and volunteers?')) {
      await resetMockDatabase()
      toast('Database reset with 1,000+ fresh records!', 'success')
    }
  }

  // Filtered List
  const filtered = useMemo(() => {
    if (!shelters) return []
    return shelters.filter((s) => {
      if (statusFilter !== 'all' && s.status !== statusFilter) return false
      if (facilityFilter !== 'all' && !s.facilities.includes(facilityFilter)) return false
      if (search.trim()) {
        const q = search.toLowerCase()
        return (
          s.name.toLowerCase().includes(q) ||
          (s.address && s.address.toLowerCase().includes(q)) ||
          (s.contactPhone && s.contactPhone.includes(q))
        )
      }
      return true
    })
  }, [shelters, search, statusFilter, facilityFilter])

  // Map Markers
  const mapMarkers = useMemo<MapMarker[]>(() => {
    return filtered.map((s) => ({
      id: s.id,
      position: { lat: s.latitude, lng: s.longitude },
      title: s.name,
      subtitle: `${s.status.toUpperCase()} · Occupancy: ${s.occupancy}/${s.capacity} · ${s.address ?? ''}`,
      color: s.status === 'open' ? '#10b981' : s.status === 'full' ? '#f59e0b' : '#ef4444',
      isShelter: true,
    }))
  }, [filtered])

  const mapCenter: GeoPoint = useMemo(() => {
    if (filtered.length > 0) {
      return { lat: filtered[0].latitude, lng: filtered[0].longitude }
    }
    return { lat: 22.5726, lng: 88.3639 }
  }, [filtered])

  if (!shelters) return <Loader />

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="h-6 w-6 text-slate-900 dark:text-slate-100" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Relief Shelter Command & Capacity Management
            </h1>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Full admin control: Add, edit, verify, or close emergency camps. All changes reflect in real time on citizen maps.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleResetData}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            title="Reset Mock Data to 1000+ fresh records"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset Demo DB</span>
          </button>

          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Add New Shelter</span>
          </button>
        </div>
      </div>

      {/* Realistic Interactive Map Preview */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mono">
          <span>Live Shelter Locations ({filtered.length} Shelters Plotted)</span>
          <span className="text-[11px] text-slate-400">Switch Satellite / Streets / Terrain using layer toggle on map</span>
        </div>
        <div className="h-72 rounded-2xl overflow-hidden shadow-xs border border-slate-200 dark:border-slate-800">
          <LeafletMap
            center={mapCenter}
            markers={mapMarkers}
            height="100%"
            autoFit
          />
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search shelters by name, location, address, phone…"
            className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3.5 py-2 text-xs text-slate-900 outline-none focus:border-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          >
            <option value="all">All Operational Statuses</option>
            <option value="open">Open (Accepting Victims)</option>
            <option value="full">Full (At Max Capacity)</option>
            <option value="closed">Closed / Inactive (Hidden)</option>
          </select>

          {/* Facility filter */}
          <select
            value={facilityFilter}
            onChange={(e) => setFacilityFilter(e.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          >
            <option value="all">All Facilities</option>
            {ALL_FACILITIES.map((f) => (
              <option key={f.id} value={f.id}>{f.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Shelter Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((s) => {
          const pct = s.capacity ? Math.round((s.occupancy / s.capacity) * 100) : 0
          return (
            <div
              key={s.id}
              className={`flex flex-col justify-between rounded-2xl border bg-white p-5 shadow-xs transition dark:bg-slate-900 ${
                s.status === 'closed'
                  ? 'border-slate-300 bg-slate-50/50 opacity-75 dark:border-slate-800'
                  : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 line-clamp-1">
                      {s.name}
                    </h2>
                    <div className="mt-0.5 flex items-start gap-1 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                      <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5 text-slate-400" />
                      <span>{s.address}</span>
                    </div>
                  </div>
                  <Badge value={s.status} />
                </div>

                {/* Coordinates & Phone */}
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mt-2 border-t border-slate-100 pt-2 dark:border-slate-800">
                  <span className="mono text-[11px]">{s.latitude.toFixed(4)}°N, {s.longitude.toFixed(4)}°E</span>
                  {s.contactPhone && (
                    <span className="flex items-center gap-1 font-mono text-slate-700 dark:text-slate-300">
                      <Phone className="h-3 w-3" />
                      <span>{s.contactPhone}</span>
                    </span>
                  )}
                </div>

                {/* Capacity Progress Bar */}
                <div className="mt-4 space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-600 dark:text-slate-300 flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      <span>Occupancy: {s.occupancy} / {s.capacity}</span>
                    </span>
                    <span className="mono font-bold">{pct}% full</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        pct >= 90 ? 'bg-red-500' : pct >= 60 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                </div>

                {/* Facilities Tags */}
                <div className="mt-3 flex flex-wrap gap-1">
                  {s.facilities.map((f) => (
                    <span
                      key={f}
                      className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:bg-slate-800 dark:text-slate-400 mono"
                    >
                      {f.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              </div>

              {/* Action Controls */}
              <div className="mt-5 space-y-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                {/* Status Quick Buttons */}
                <div className="flex items-center justify-between gap-1 text-xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase mono">Status:</span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => handleQuickStatus(s, 'open')}
                      className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                        s.status === 'open'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      Open
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickStatus(s, 'full')}
                      className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                        s.status === 'full'
                          ? 'bg-amber-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      Full
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickStatus(s, 'closed')}
                      className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                        s.status === 'closed'
                          ? 'bg-red-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      Closed (Hide)
                    </button>
                  </div>
                </div>

                {/* Edit & Delete Buttons */}
                <div className="flex items-center justify-between gap-2 pt-1">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleQuickOccupancy(s, s.occupancy + 10)}
                      className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
                      title="Quick +10 Occupancy"
                    >
                      +10 Beds
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickOccupancy(s, s.occupancy - 10)}
                      className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
                      title="Quick -10 Occupancy"
                    >
                      -10 Beds
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(s)}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
                    >
                      <Edit2 className="h-3 w-3" />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(s.id, s.name)}
                      className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-bold text-red-600 hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300 cursor-pointer"
                    >
                      <Trash2 className="h-3 w-3" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )
        })}

        {filtered.length === 0 && (
          <div className="col-span-full rounded-2xl border border-dashed border-slate-300 p-12 text-center text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
            No shelters matched your search and filter criteria.
          </div>
        )}
      </div>

      {/* Create / Edit Modal Dialog */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-slate-900 dark:text-slate-100" />
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  {editingShelter ? 'Edit Shelter Details' : 'Add New Relief Shelter'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="mt-4 space-y-4 text-left">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 mono uppercase">
                  Shelter Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Salt Lake Stadium Relief Camp #02"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 mono uppercase">
                  Physical Address / Locality *
                </label>
                <input
                  type="text"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. Action Area 1, Near Axis Mall, New Town"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              {/* Coordinates & Map Picker */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 mono uppercase">
                    Latitude
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-mono text-slate-900 outline-none focus:border-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 mono uppercase">
                    Longitude
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-mono text-slate-900 outline-none focus:border-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <button
                  type="button"
                  onClick={() => setShowLocationPicker((o) => !o)}
                  className="text-xs font-bold text-slate-900 hover:underline dark:text-slate-100 cursor-pointer"
                >
                  {showLocationPicker ? 'Hide interactive coordinate picker' : 'Pick location on interactive map'}
                </button>
                {showLocationPicker && (
                  <div className="mt-2">
                    <LandmarkPicker
                      value={{ lat: Number(latitude) || 22.5726, lng: Number(longitude) || 88.3639 }}
                      onChange={(pt, addr) => {
                        setLatitude(pt.lat.toFixed(4))
                        setLongitude(pt.lng.toFixed(4))
                        if (addr && !address) setAddress(addr)
                      }}
                      height="240px"
                    />
                  </div>
                )}
              </div>

              {/* Capacity, Occupancy & Contact */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 mono uppercase">
                    Max Capacity (Beds)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-mono text-slate-900 outline-none focus:border-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 mono uppercase">
                    Current Occupancy
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={occupancy}
                    onChange={(e) => setOccupancy(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-mono text-slate-900 outline-none focus:border-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 mono uppercase">
                    Contact Phone
                  </label>
                  <input
                    type="tel"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="+91-..."
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-mono text-slate-900 outline-none focus:border-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              {/* Status selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 mono uppercase">
                  Operation Status
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { val: 'open', label: 'Open (Accepting)' },
                    { val: 'full', label: 'Full (Visible as Full)' },
                    { val: 'closed', label: 'Closed / Hidden' },
                  ].map((st) => (
                    <button
                      key={st.val}
                      type="button"
                      onClick={() => setStatus(st.val as ShelterStatus)}
                      className={`rounded-xl border p-2.5 text-xs font-bold transition cursor-pointer ${
                        status === st.val
                          ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Facilities selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 mono uppercase">
                  Available Amenities & Facilities
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {ALL_FACILITIES.map((f) => (
                    <label
                      key={f.id}
                      className={`flex items-center gap-2 rounded-xl border p-2.5 text-xs font-medium cursor-pointer transition ${
                        facilities.includes(f.id)
                          ? 'border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900 font-bold'
                          : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={facilities.includes(f.id)}
                        onChange={() => toggleFacility(f.id)}
                        className="hidden"
                      />
                      <span>{f.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-slate-900 px-6 py-2 text-xs font-bold text-white shadow-sm hover:bg-slate-800 disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white cursor-pointer"
                >
                  {saving ? 'Saving…' : editingShelter ? 'Update Shelter' : 'Create & Publish Shelter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
