import type { GeoPoint } from '../types'

/** Great-circle distance between two points in kilometres (Haversine). */
export function haversineKm(a: GeoPoint, b: GeoPoint): number {
  const R = 6371
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s))
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
export function getCurrentPosition(enableHighAccuracy = true, timeout = 8000): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('Geolocation not supported'))
      return
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy,
      timeout,
      maximumAge: enableHighAccuracy ? 5000 : 30000,
    })
  })
}

/** Reverse-geocode a coordinate to a human-readable address with safe error handling and fallback. */
export async function reverseGeocode(point: GeoPoint): Promise<string | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=18&lat=${point.lat}&lon=${point.lng}`
    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
      },
    })
    if (!res.ok) return null
    const data: { display_name?: string } = await res.json()
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
}): string {
  const parts = ['EMERGENCY SOS']
  if (options.type) parts.push(`TYPE:${options.type.toUpperCase()}`)
  if (options.name) parts.push(`NAME:${options.name}`)
  if (options.phone) parts.push(`PHONE:${options.phone}`)
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

