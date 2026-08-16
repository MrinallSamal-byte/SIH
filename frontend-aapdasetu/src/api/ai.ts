import { aiCall, withMockFallback } from './client'
import { mocks } from './mocks'
import type { FloodGeoJson, ReportInput, TriageResult, PfaChatResponse } from '../types'


// =============================================================================
// FASTAPI AI ENGINE — BUILD CONTRACT
// -----------------------------------------------------------------------------
// The browser calls relative `/ai/...` paths; the Vite dev server proxies them
// to `VITE_AI_URL` (default http://localhost:8000, see vite.config.ts).
//
// @TODO BUILD: wrap the existing standalone scripts in apps/ai-engine/app/ as a
// real FastAPI app (uvicorn on :8000). The four functions below map 1:1 to:
//   - triage.py                    -> POST /ai/triage
//   - pfa_chatbot.py               -> POST /ai/pfa-chat
//   - damage_assessment.py         -> POST /ai/damage-assessment  (multipart)
//   - satellite_flood_mapping.py   -> POST /ai/satelliteflood-map
// A minimal FastAPI wrapper (`apps/ai-engine/app/main.py` already has the
// module-level logic; add decorators + pydantic models + uvicorn.run()).
// =============================================================================

/** POST /ai/triage — explainable SOS urgency scoring.
 * body: { type, description, landmark?, victim{age?,isPregnant?,isCardiac?,isBleeding?}, missing?, groupSize? }
 * resp: { score, label: "RED"|"YELLOW"|"GREEN", factors:[{reason,points}] } — mirrors src/lib/triage.ts
 */
export function aiTriage(input: ReportInput): Promise<TriageResult> {
  return withMockFallback(
    () => aiCall<TriageResult>('POST', '/ai/triage', input),
    () => mocks.aiTriage(input),
  )
}

/** POST /ai/pfa-chat — Psychological First Aid & Emergency AI companion.
 * body: { message, victimName? }
 * resp: PfaChatResponse
 */
export function aiPfaChat(message: string, victimName = 'Friend'): Promise<PfaChatResponse> {
  return withMockFallback(
    () =>
      aiCall<PfaChatResponse>('POST', '/ai/pfa-chat', {
        message,
        victimName,
      }),
    () => mocks.aiPfaChat(message, victimName),
  )
}


/** POST /ai/damage-assessment — anti-fraud photo damage grading.
 * @TODO BUILD (multipart): backend should accept FormData: photo[] images +
 * reportedLat + reportedLng. Placeholder below sends base64 JSON instead so it
 * works without a file server; adapt the wrapper to decode base64 -> image.
 * resp: { claimedDamage, verified, duplicate, exifValid, exifDeltaKm?,
 *         damageGrade, compensationInr, factors[] }
 */
export function aiDamageAssessment(
  photoDataUrl: string,
  reportedLat?: number,
  reportedLng?: number,
  description?: string,
) {
  return withMockFallback(
    () =>
      aiCall<{
        claimedDamage: boolean
        verified: boolean
        duplicate: boolean
        exifValid: boolean
        exifDeltaKm?: number
        damageGrade: string
        compensationInr: number
        factors: string[]
      }>('POST', '/ai/damage-assessment', { photoDataUrl, reportedLat, reportedLng, description }),
    () => mocks.aiDamageAssessment(photoDataUrl, reportedLat, reportedLng, description),
  )
}

/** POST /ai/satelliteflood-map — Sentinel-1 SAR flood extent polygons.
 * body: { district? | center{lat,lng}, radiusKm? }
 * resp: GeoJSON FeatureCollection of water-extent polygons (see FloodGeoJson)
 */
export function aiSatelliteFloodMap(payload: { district?: string; center?: { lat: number; lng: number }; radiusKm?: number } = {}): Promise<FloodGeoJson> {
  return withMockFallback(
    () => aiCall<FloodGeoJson>('POST', '/ai/satelliteflood-map', payload),
    () => mocks.aiSatelliteFloodMap(),
  )
}
