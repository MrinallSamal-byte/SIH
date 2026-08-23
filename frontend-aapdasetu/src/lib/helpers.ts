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

/** Locale for relative time, derived from <html lang> which the i18n provider keeps in sync. */
function resolveTimeAgoLocale(): string {
  if (typeof document === 'undefined') return 'en'
  switch (document.documentElement.lang) {
    case 'hi':
      return 'hi-IN'
    case 'bn':
      return 'bn-IN'
    case 'or':
      return 'or-IN'
    default:
      return 'en'
  }
}

/** RelativeTimeFormat is missing on some old browsers and throws RangeError on unknown locales — degrade to English, never crash. */
function createTimeAgoFormatter(): Intl.RelativeTimeFormat | null {
  if (typeof Intl === 'undefined' || typeof Intl.RelativeTimeFormat !== 'function') return null
  try {
    return new Intl.RelativeTimeFormat(resolveTimeAgoLocale(), { numeric: 'auto' })
  } catch {
    try {
      return new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
    } catch {
      return null
    }
  }
}

/** Plain-English fallback for environments without a usable Intl.RelativeTimeFormat. */
function formatEnglishFallback(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  if (minutes < 1) return seconds <= 1 ? 'just now' : `${seconds}s ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 1) return minutes === 1 ? 'a minute ago' : `${minutes} min ago`
  const days = Math.floor(hours / 24)
  if (days < 1) return hours === 1 ? 'an hour ago' : `${hours} hr ago`
  if (days < 7) return days === 1 ? 'yesterday' : `${days} days ago`
  const weeks = Math.floor(days / 7)
  return weeks === 1 ? 'last week' : `${weeks} weeks ago`
}

export function timeAgo(iso: string): string {
  // Guard missing/invalid timestamps ('' | nullish at runtime | malformed string → NaN).
  const time = iso ? new Date(iso).getTime() : NaN
  if (!Number.isFinite(time)) return '—'
  const seconds = Math.max(0, Math.floor((Date.now() - time) / 1000))
  const rtf = createTimeAgoFormatter()
  if (!rtf) return formatEnglishFallback(seconds)
  if (seconds < 60) return rtf.format(-seconds, 'second')
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return rtf.format(-minutes, 'minute')
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return rtf.format(-hours, 'hour')
  const days = Math.floor(hours / 24)
  if (days < 7) return rtf.format(-days, 'day')
  const weeks = Math.floor(days / 7)
  return rtf.format(-weeks, 'week')
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

/** Browser geolocation helper with configurable accuracy, timeout, and maxAge. */
export function getCurrentPosition(
  enableHighAccuracy = true,
  timeout = 10000,
  maximumAge = 0,
): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      reject(new Error('Geolocation not supported'))
      return
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy,
      timeout,
      maximumAge,
    })
  })
}

/** Request a fresh, high-precision GPS lock with tiered fallback if GPS sensor takes time to acquire satellites. */
export async function getHighPrecisionPosition(): Promise<GeolocationPosition> {
  try {
    // 1. Primary: High-precision hardware GPS lock (maximumAge = 0)
    return await getCurrentPosition(true, 10000, 0)
  } catch (err: unknown) {
    // If permission was denied (code 1), don't retry, fail immediately
    if (err && typeof err === 'object' && 'code' in err && (err as GeolocationPositionError).code === 1) {
      throw err
    }
    // 2. Secondary: Cell tower / Wi-Fi fallback fix
    return await getCurrentPosition(false, 8000, 30000)
  }
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

export interface PlaceSearchResult {
  name: string
  lat: number
  lng: number
  isRelaxed?: boolean
  matchedQuery?: string
  source?: 'osm' | 'photon' | 'custom'
  distanceKm?: number
  postcode?: string
}

/** Formats a structured address object into a concise, readable string with verified postal code. */
export function formatStructuredAddress(
  a?: {
    amenity?: string
    building?: string
    road?: string
    pedestrian?: string
    neighbourhood?: string
    suburb?: string
    city?: string
    town?: string
    village?: string
    municipality?: string
    city_district?: string
    county?: string
    state_district?: string
    state?: string
    postcode?: string
  },
  fallbackDisplayName?: string,
): string {
  if (!a) return fallbackDisplayName || 'Unknown location'

  const parts: string[] = []
  if (a.amenity || a.building) parts.push(a.amenity || a.building!)
  if (a.road || a.pedestrian) parts.push(a.road || a.pedestrian!)
  if (a.neighbourhood && !parts.includes(a.neighbourhood)) parts.push(a.neighbourhood)
  if (a.suburb && !parts.includes(a.suburb) && !parts.some((p) => p.includes(a.suburb!))) {
    const cleanSuburb = a.suburb.replace(/Ward\s*\d+/gi, '').trim()
    if (cleanSuburb && !parts.includes(cleanSuburb)) parts.push(cleanSuburb)
  }
  const city = a.city || a.town || a.village || a.municipality || a.city_district || a.county
  if (city) {
    const cleanCity = city.replace(/ Municipal Corporation|\(M\.Corp\.\)|Zone/gi, '').trim()
    if (cleanCity && !parts.includes(cleanCity)) parts.push(cleanCity)
  }
  if (a.state_district && !parts.includes(a.state_district) && a.state_district !== city) {
    parts.push(a.state_district)
  }
  if (a.state && !parts.includes(a.state)) parts.push(a.state)

  let formatted = parts.slice(0, 4).join(', ')
  if (!formatted && fallbackDisplayName) {
    formatted = fallbackDisplayName
  }
  if (a.postcode && /^\d{6}$/.test(a.postcode.trim()) && !formatted.includes(a.postcode.trim())) {
    formatted = `${formatted} - ${a.postcode.trim()}`
  }
  return formatted || 'Unknown location'
}

/** Smart Multi-Tier Geocoding & Query Relaxation for detailed addresses, pincodes, and landmarks */
export async function searchPlaces(
  query: string,
  options?: {
    proximity?: GeoPoint
    limit?: number
  },
): Promise<PlaceSearchResult[]> {
  const clean = query.trim()
  if (!clean) return []
  const limit = options?.limit || 5
  const userLat = options?.proximity?.lat
  const userLng = options?.proximity?.lng

  // 1. Detect 6-digit Indian PIN code if present
  const pinMatch = clean.match(/\b([1-9][0-9]{5})\b/)
  const detectedPin = pinMatch ? pinMatch[1] : null

  // 2. Build candidates list from input
  const normalized = clean
    .replace(/sunder/gi, 'sundar')
    .replace(/bhubneswar|bhubaneshwar/gi, 'bhubaneswar')
    .replace(/cuttuk|katak/gi, 'cuttack')
    .replace(/kolkatta/gi, 'kolkata')
    .replace(/gurgaon/gi, 'gurugram')
    .replace(/bangalore/gi, 'bengaluru')
    .replace(/calcutta/gi, 'kolkata')
    .replace(/orissa/gi, 'odisha')

  const stripPrefixes = (s: string) =>
    s
      .replace(
        /\b(flat|plot|house|villa|h\.no|lane|road|block|gali|apartment|apt|sector|near|opp|opposite|behind|beside|at|po|ps|ward|room|floor)\s*[\w\d-]*/gi,
        ' ',
      )
      .replace(/\s+/g, ' ')
      .trim()

  const stripped = stripPrefixes(normalized)
  const candidates: string[] = []

  // Full clean query first
  candidates.push(clean)
  if (normalized !== clean) candidates.push(normalized)
  if (stripped && stripped !== clean && stripped !== normalized) candidates.push(stripped)

  // If query had a PIN code attached, also search query without PIN
  if (detectedPin) {
    const withoutPin = clean.replace(/\b[1-9][0-9]{5}\b/g, '').trim()
    if (withoutPin && withoutPin.length >= 3) {
      candidates.push(withoutPin)
      const normWithoutPin = withoutPin
        .replace(/sunder/gi, 'sundar')
        .replace(/bhubneswar|bhubaneshwar/gi, 'bhubaneswar')
        .trim()
      if (normWithoutPin !== withoutPin) candidates.push(normWithoutPin)
    }
  }

  // Comma-separated parts from right to left (broader areas first)
  const commaParts = clean
    .split(/[,;\n]+/)
    .map((p) => p.trim())
    .filter((p) => p.length >= 3)
  if (commaParts.length > 1) {
    for (let i = commaParts.length - 1; i >= 0; i--) {
      candidates.push(commaParts[i])
      if (i > 0) candidates.push(`${commaParts[i - 1]} ${commaParts[i]}`)
    }
  }

  // Token subsets (locality and sub-phrases)
  const normWords = stripped.split(/\s+/).filter((w) => w.length > 2)
  if (normWords.length >= 3) {
    candidates.push(normWords[normWords.length - 1]) // e.g. sundarpada
    candidates.push(normWords.slice(-2).join(' ')) // e.g. vihar sundarpada
    candidates.push(normWords.slice(0, 2).join(' ')) // e.g. gayatri vihar
    candidates.push(normWords.slice(-3).join(' '))
  } else if (normWords.length === 2) {
    candidates.push(normWords[1])
    candidates.push(normWords[0])
    candidates.push(normWords.join(' '))
  }

  const uniqueCandidates = [...new Set(candidates.filter((c) => c && c.length >= 3))]

  // Helper for structured postalcode search
  const queryPostalCode = async (pin: string): Promise<PlaceSearchResult[]> => {
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 4000)
      const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&countrycodes=in&postalcode=${encodeURIComponent(pin)}`
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
        },
      })
      clearTimeout(timer)
      if (!res.ok) return []
      interface NominatimResult {
        display_name: string
        lat: string
        lon: string
        address?: Record<string, string | undefined>
      }
      const data: NominatimResult[] = await res.json()
      return data.map((d) => ({
        name: formatStructuredAddress(d.address, d.display_name),
        lat: Number(d.lat),
        lng: Number(d.lon),
        postcode: pin,
        source: 'osm' as const,
      }))
    } catch {
      return []
    }
  }

  // Helper to query Nominatim
  const queryNominatim = async (q: string): Promise<PlaceSearchResult[]> => {
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 4000)
      let url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=${limit}&q=${encodeURIComponent(q)}`
      if (userLat !== undefined && userLng !== undefined) {
        url += `&viewbox=${userLng - 0.75},${userLat + 0.75},${userLng + 0.75},${userLat - 0.75}&bounded=0`
      }
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
        },
      })
      clearTimeout(timer)
      if (!res.ok) return []
      interface NominatimResult {
        display_name: string
        lat: string
        lon: string
        address?: Record<string, string | undefined>
      }
      const data: NominatimResult[] = await res.json()
      return data.map((d) => ({
        name: formatStructuredAddress(d.address, d.display_name),
        lat: Number(d.lat),
        lng: Number(d.lon),
        postcode: d.address?.postcode,
        source: 'osm' as const,
      }))
    } catch {
      return []
    }
  }

  // Helper to query Photon
  const queryPhoton = async (q: string): Promise<PlaceSearchResult[]> => {
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 3500)
      let url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=${limit}`
      if (userLat !== undefined && userLng !== undefined) {
        url += `&lat=${userLat}&lon=${userLng}`
      }
      const res = await fetch(url, { signal: controller.signal })
      clearTimeout(timer)
      if (!res.ok) return []
      interface PhotonFeature {
        geometry: { coordinates: [number, number] }
        properties: {
          name?: string
          street?: string
          district?: string
          city?: string
          state?: string
          country?: string
          postcode?: string
        }
      }
      const data: { features?: PhotonFeature[] } = await res.json()
      if (!data.features) return []
      return data.features.map((f) => {
        const p = f.properties
        const parts = [p.name, p.street, p.district, p.city, p.state].filter(Boolean) as string[]
        let formatted = parts.filter((v, idx, arr) => arr.indexOf(v) === idx).join(', ')
        if (p.postcode && /^\d{6}$/.test(p.postcode.trim())) {
          formatted = `${formatted} - ${p.postcode.trim()}`
        }
        return {
          name: formatted || p.name || 'Unknown location',
          lat: f.geometry.coordinates[1],
          lng: f.geometry.coordinates[0],
          postcode: p.postcode,
          source: 'photon' as const,
        }
      })
    } catch {
      return []
    }
  }

  // If user provided a standalone or isolated 6-digit PIN code (e.g. "751002" or "PIN 751002")
  if (detectedPin && clean.replace(/\D/g, '') === detectedPin) {
    const pinResults = await queryPostalCode(detectedPin)
    if (pinResults.length > 0) return pinResults
  }

  let bestOverallResults: PlaceSearchResult[] = []
  let bestDistance = Infinity

  for (const cand of uniqueCandidates) {
    const isRelaxed = cand.toLowerCase() !== clean.toLowerCase()
    // 1. Try Nominatim
    let found = await queryNominatim(cand)
    // 2. If no OSM results, try Photon
    if (found.length === 0) {
      found = await queryPhoton(cand)
    }

    if (found.length > 0) {
      const results = found.map((r) => ({
        ...r,
        isRelaxed,
        matchedQuery: cand,
        distanceKm:
          userLat !== undefined && userLng !== undefined
            ? haversineKm({ lat: userLat, lng: userLng }, { lat: r.lat, lng: r.lng })
            : undefined,
      }))

      if (userLat !== undefined && userLng !== undefined) {
        results.sort((a, b) => (a.distanceKm ?? 99999) - (b.distanceKm ?? 99999))
        const closest = results[0].distanceKm ?? 99999

        // If this match is within 75km of the user or map center, prioritize and return immediately!
        if (closest <= 75) {
          return results.slice(0, limit)
        }

        if (closest < bestDistance) {
          bestDistance = closest
          bestOverallResults = results
        }
      } else {
        return results.slice(0, limit)
      }
    }
  }

  // Fallback to postal code if general text search found nothing
  if (detectedPin && bestOverallResults.length === 0) {
    const pinResults = await queryPostalCode(detectedPin)
    if (pinResults.length > 0) return pinResults
  }

  return bestOverallResults.slice(0, limit)
}

/** Reverse-geocode a coordinate to a human-readable, concise address with safe error handling and fallback. */
export async function reverseGeocode(point: GeoPoint): Promise<string | null> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 4500)
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&zoom=18&lat=${point.lat}&lon=${point.lng}`
    const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
        },
      })
    clearTimeout(timer)
    if (res.ok) {
      const data = await res.json()
      if (data.address) {
        return formatStructuredAddress(data.address, data.display_name)
      }
      if (data.display_name) return data.display_name
    }
  } catch {
    // Fallback to Photon reverse geocode
  }

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 3500)
    const res = await fetch(`https://photon.komoot.io/reverse?lat=${point.lat}&lon=${point.lng}`, {
      signal: controller.signal,
    })
    clearTimeout(timer)
    if (res.ok) {
      const data = await res.json()
      if (data.features && data.features.length > 0) {
        const p = data.features[0].properties
        const parts = [p.name, p.street, p.district, p.city, p.state].filter(Boolean) as string[]
        let formatted = parts.filter((v, idx, arr) => arr.indexOf(v) === idx).join(', ')
        if (p.postcode && /^\d{6}$/.test(p.postcode.trim())) {
          formatted = `${formatted} - ${p.postcode.trim()}`
        }
        if (formatted) return formatted
      }
    }
  } catch {
    // All reverse geocoders unavailable
  }

  return null
}

/** Generates native navigation deep-links for Google Maps, Apple Maps, and OpenStreetMap. */
export function getNavigationUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
}

/** Supported SMS help-line languages. */
type SmsLang = 'en' | 'hi' | 'bn' | 'or'

/**
 * Resolve the current UI language from <html lang> (kept in sync by the i18n
 * provider) with a localStorage fallback — mirrors ErrorBoundary.readStoredLanguage
 * locally so this module stays dependency-free.
 */
function resolveSmsLanguage(): SmsLang {
  try {
    if (typeof document !== 'undefined') {
      const l = document.documentElement.lang
      if (l === 'hi' || l === 'bn' || l === 'or') return l
    }
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem('aapdasetu_lang')
      if (stored === 'hi' || stored === 'bn' || stored === 'or') return stored
    }
  } catch {
    // DOM/storage unavailable — fall back to English
  }
  return 'en'
}

/** First line of the offline SOS SMS, in the citizen's own language. */
const SMS_HELP_LINE: Record<SmsLang, string> = {
  en: 'I need URGENT HELP.',
  hi: 'मुझे तुरंत मदद चाहिए।',
  bn: 'আমার দ্রুত সাহায্য দরকার।',
  or: 'ମୋର ତୁରନ୍ତ ସାହାଯ୍ୟ ଦରକାର।',
}

/** Offline Emergency SMS string generator (National SOS 112). Bilingual: a native-language plea followed by an operator-readable English payload. */
export function generateEmergencySms(options: {
  lat?: number
  lng?: number
  name?: string
  type?: string
  phone?: string
  address?: string
  landmark?: string
}): string {
  const parts = [SMS_HELP_LINE[resolveSmsLanguage()], 'SOS']
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

/** Privacy masking for phone numbers in public registries — reveals at most the last 4 digits. */
export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return '—'
  const clean = phone.trim()
  if (clean.length <= 4) return '••••••'
  return `••••••${clean.slice(-4)}`
}

