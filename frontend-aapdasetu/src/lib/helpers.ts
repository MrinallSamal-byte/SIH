import type { GeoPoint } from '../types'

const EARTH_RADIUS_KM = 6371
const DEG_TO_RAD = Math.PI / 180

/** Great-circle distance between two points in kilometres (Haversine). Fast-path early returns for equal coordinates. */
export function haversineKm(a: GeoPoint, b: GeoPoint): number {
  if (a.lat === b.lat && a.lng === b.lng) return 0
  const dLat = (b.lat - a.lat) * DEG_TO_RAD
  const dLng = (b.lng - a.lng) * DEG_TO_RAD
  const lat1 = a.lat * DEG_TO_RAD
  const lat2 = b.lat * DEG_TO_RAD
  const sinDLat2 = Math.sin(dLat * 0.5)
  const sinDLng2 = Math.sin(dLng * 0.5)
  const s = sinDLat2 * sinDLat2 + Math.cos(lat1) * Math.cos(lat2) * sinDLng2 * sinDLng2
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s))
}

/** Human-friendly tracking id shown to citizens, e.g. SOS-XXXX-AB12CD. */
export function generateTrackingId(prefix = 'SOS'): string {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase()
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${rand}`
}

export function timeAgo(iso: string): string {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000))
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

/** Read a File into a base64 data URL for media uploads. */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/** Client-side image compression to prevent HTTP 413 timeouts on congested 2G/3G disaster cellular networks. */
export function compressImage(file: File, maxWidth = 1200, quality = 0.75): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = (e) => {
      const img = new Image()
      img.src = String(e.target?.result)
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width)
          width = maxWidth
        }

        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve(String(e.target?.result))
          return
        }
        ctx.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.onerror = reject
    }
    reader.onerror = reject
  })
}

/** Browser geolocation helper with configurable accuracy and timeout. */
export function getCurrentPosition(enableHighAccuracy = true, timeout = 12000): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      reject(new Error('Geolocation not supported'))
      return
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy,
      timeout,
      maximumAge: enableHighAccuracy ? 5000 : 60000,
    })
  })
}

/** Fetch approximate coordinates via IP geolocation as a secondary fallback when browser GPS is blocked/unavailable. */
export async function getIpGeolocation(): Promise<{ lat: number; lng: number; city?: string; district?: string } | null> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 4000)
    const res = await fetch('https://ipapi.co/json/', { signal: controller.signal })
    clearTimeout(timer)
    if (!res.ok) return null
    const data = await res.json()
    if (data.latitude && data.longitude) {
      return {
        lat: Number(data.latitude),
        lng: Number(data.longitude),
        city: data.city,
        district: data.region,
      }
    }
  } catch {
    // Secondary endpoint
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 3500)
      const res2 = await fetch('https://ipwho.is/', { signal: controller.signal })
      clearTimeout(timer)
      if (!res2.ok) return null
      const data2 = await res2.json()
      if (data2.success && data2.latitude && data2.longitude) {
        return {
          lat: Number(data2.latitude),
          lng: Number(data2.longitude),
          city: data2.city,
          district: data2.region,
        }
      }
    } catch {
      // Fallback
    }
  }
  return null
}

/** Reverse-geocode a coordinate to a human-readable, concise address with safe error handling and fallback. */
export async function reverseGeocode(point: GeoPoint): Promise<string | null> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 4500)
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=18&lat=${point.lat}&lon=${point.lng}`
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
      },
    })
    clearTimeout(timer)
    if (!res.ok) return null
    const data = await res.json()
    if (data.address) {
      const parts: string[] = []
      const a = data.address
      if (a.amenity || a.building) parts.push(a.amenity || a.building)
      if (a.road || a.pedestrian) parts.push(a.road || a.pedestrian)
      if (a.neighbourhood && !parts.includes(a.neighbourhood)) parts.push(a.neighbourhood)
      if (a.suburb && !parts.includes(a.suburb) && !parts.some((p) => p.includes(a.suburb))) parts.push(a.suburb)
      const city = a.city || a.town || a.village || a.municipality || a.city_district || a.county
      if (city) {
        const cleanCity = city.replace(/ Municipal Corporation|\(M\.Corp\.\)|Zone/gi, '').trim()
        if (!parts.includes(cleanCity)) parts.push(cleanCity)
      }
      if (a.state_district && !parts.includes(a.state_district) && a.state_district !== a.city) {
        parts.push(a.state_district)
      }
      if (a.state && !parts.includes(a.state)) parts.push(a.state)
      
      if (parts.length > 0) {
        return parts.slice(0, 4).join(', ')
      }
    }
    return data.display_name ?? null
  } catch {
    return null
  }
}

/** Generates native navigation deep-links for Google Maps, Apple Maps, and OpenStreetMap. */
export function getNavigationUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
}

/** Offline Emergency SMS string generator (National SOS 112). */
export function generateEmergencySms(options: {
  lat?: number
  lng?: number
  name?: string
  type?: string
  phone?: string
  address?: string
  landmark?: string
}): string {
  const parts = ['EMERGENCY SOS']
  if (options.type) parts.push(`TYPE:${options.type.toUpperCase()}`)
  if (options.name) parts.push(`NAME:${options.name}`)
  if (options.phone) parts.push(`PHONE:${options.phone}`)
  if (options.address) parts.push(`LOC:${options.address}`)
  if (options.landmark) parts.push(`NEAR:${options.landmark}`)
  if (options.lat && options.lng) {
    parts.push(`GPS:${options.lat.toFixed(5)},${options.lng.toFixed(5)}`)
    parts.push(`MAPS:https://maps.google.com/?q=${options.lat},${options.lng}`)
  }
  const body = encodeURIComponent(parts.join(' | '))
  return `sms:112?body=${body}`
}

/** Privacy masking for phone numbers in public registries (e.g. +91-98765***12). */
export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return '—'
  const clean = phone.trim()
  if (clean.length <= 5) return '*****'
  const start = clean.slice(0, clean.length - 5)
  const end = clean.slice(-2)
  return `${start}***${end}`
}

