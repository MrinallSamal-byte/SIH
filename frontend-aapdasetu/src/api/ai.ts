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

// =============================================================================
// OPENROUTER AI INTEGRATION (Free Tier Models)
// -----------------------------------------------------------------------------
const OPENROUTER_API_KEY =
  import.meta.env.VITE_OPENROUTER_API_KEY ||
  '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'

export const OPENROUTER_FREE_MODELS = [
  'nvidia/nemotron-3.5-lightning:free',
  'google/gemma-4-31b-it:free',
  'nvidia/nemotron-3-super-120b-a12b:free',
  'openai/gpt-oss-20b:free',
] as const

const AAPDAMITRA_SYSTEM_PROMPT = `You are AapdaMitra AI (आपदामित्र), an elite, compassionate, and highly intelligent 24/7 Disaster Survival, Emergency Medical Triage, and Psychological First Aid AI Companion for the AapdaSetu Incident Response Platform.

YOUR MISSION:
Save lives, deliver precise actionable survival guidance, reduce panic, perform fast emergency medical triage, and escalate to authorities (National Emergency 112, Medical Ambulance 108, NDMA 1078, Police 100, Fire 101, Tele-MANAS 14416).

CORE PROTOCOLS:
1. IMMEDIATE ACTION FIRST: If the user is in danger (flooding, earthquake, building collapse, fire, gas leak, trapped under debris, drowning), give the immediate 3-4 life-saving actions in bold bullets first.
2. MEDICAL FIRST AID:
   - Severe Bleeding: Apply direct firm pressure with clean cloth, elevate, do not remove embedded objects.
   - Choking: 5 back blows between shoulder blades followed by 5 abdominal thrusts (Heimlich).
   - CPR: 100-120 chest compressions/min in center of chest for unresponsive victims.
   - Burns: Cool with clean running water for 10-20 min. Never use ice, toothpaste, or butter.
   - Snakebite: Keep victim calm, immobilize bitten limb below heart level, rush to nearest hospital for Anti-Snake Venom (ASV). Do not cut, suck venom, or apply tight tourniquet.
   - Heatstroke: Move to shade, cool with wet cloths, fan vigorously, hydrate if conscious.
3. PSYCHOLOGICAL FIRST AID & PANIC MANAGEMENT: If the user expresses panic, fear, trembling, or grief, speak with warmth and strength. Offer grounding techniques like 4-4-4 Box Breathing (Inhale 4s, Hold 4s, Exhale 4s) or 5-4-3-2-1 Sensory Grounding.
4. MULTI-LINGUAL SUPPORT: Automatically detect and respond in English, Hindi, Hinglish, Bengali, Odia, Tamil, Telugu, Marathi, etc., matching the user's language smoothly.
5. CONCISE & ACTIONABLE: Keep responses structured, easy to read under stress, prioritizing life over property. Always remind the user to stay safe and that emergency services can be reached at 112/108.`
const AAPDAMITRA_PLAIN_TEXT_RULE = `

Return only JSON. The message field must be plain text only.
Do not use markdown, bullet asterisks, emojis, or decorative symbols in the message field.`

interface ChatHistoryItem {
  role: 'user' | 'bot' | 'assistant' | 'system'
  content: string
}

function detectCriticalDistress(text: string): boolean {
  const lower = text.toLowerCase()
  const criticalKeywords = [
    'bleed', 'blood', 'hemorrhage', 'unconscious', 'fainted', 'trapped',
    'drown', 'sinking', 'heart attack', 'chest pain', 'stroke', 'electrocute',
    'severe burn', 'fire', 'choking', 'snake', 'snakebite', 'poison', 'collapse',
    'debris', 'fracture', 'broken bone', 'खून', 'बेहोश', 'फंसा', 'डूब', 'हार्ट अटैक', 'सांप',
    'रକ୍ତ', 'ଚେତାଶୂନ୍ୟ', 'ଫସିରହିଛି'
  ]
  return criticalKeywords.some((kw) => lower.includes(kw))
}

function detectBreathingExercise(text: string): string | undefined {
  const lower = text.toLowerCase()
  const panicKeywords = [
    'panic', 'scared', 'afraid', 'fear', 'anxious', 'anxiety', 'hyperventilat',
    'heart racing', 'shaking', 'trembling', 'breathe', 'breathing', 'grounding',
    'डर', 'घबराहट', 'चिंता', 'सांस', 'ଡର', 'ଭୟ'
  ]
  if (panicKeywords.some((kw) => lower.includes(kw))) {
    return '4-4-4_BOX_BREATHING'
  }
  return undefined
}

function cleanAiOutput(rawText: string): string {
  // Strip <think>...</think> reasoning tags if present
  let text = rawText.replace(/<think>[\s\S]*?<\/think>/gi, '')
  text = text.replace(/```(?:json)?/gi, '')
  text = text.replace(/[*_`~]/g, '')
  text = text.replace(/^\s*[-•*]+\s+/gm, '')
  text = text.replace(/\p{Extended_Pictographic}|\p{Emoji_Presentation}|\u200d/gu, '')
  text = text.replace(/[ \t]{2,}/g, ' ')
  text = text.replace(/\n{3,}/g, '\n\n')
  return text.trim()
}

async function callOpenRouter(
  message: string,
  history: ChatHistoryItem[] = []
): Promise<string> {
  const openRouterMessages = [
    { role: 'system', content: `${AAPDAMITRA_SYSTEM_PROMPT}${AAPDAMITRA_PLAIN_TEXT_RULE}` },
    ...history.slice(-8).map((h) => ({
      role: h.role === 'bot' ? ('assistant' as const) : ('user' as const),
      content: h.content,
    })),
    { role: 'user', content: message },
  ]

  let lastError: unknown = null

  for (const model of OPENROUTER_FREE_MODELS) {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://aapdasetu.in',
          'X-Title': 'AapdaSetu Disaster Response Ecosystem',
        },
        body: JSON.stringify({
          model,
          messages: openRouterMessages,
          temperature: 0.4,
          max_tokens: 1024,
        }),
      })

      if (!res.ok) {
        const errorBody = await res.text()
        console.warn(`[AapdaMitra AI] Model ${model} returned HTTP ${res.status}:`, errorBody)
        continue
      }

      const data = await res.json()
      const content = data?.choices?.[0]?.message?.content
      if (content && typeof content === 'string' && content.trim().length > 0) {
        return cleanAiOutput(content)
      }
    } catch (err) {
      lastError = err
      console.warn(`[AapdaMitra AI] Error requesting model ${model}:`, err)
    }
  }

  throw lastError || new Error('All OpenRouter free models failed')
}

/** POST /ai/pfa-chat — Intelligent AapdaMitra AI Crisis & Survival Companion. */
export async function aiPfaChat(
  message: string,
  history: ChatHistoryItem[] = [],
  victimName = 'Friend'
): Promise<PfaChatResponse> {
  try {
    const aiReply = await callOpenRouter(message, history)
    const isCritical = detectCriticalDistress(message) || detectCriticalDistress(aiReply)
    const exerciseType = detectBreathingExercise(message) || detectBreathingExercise(aiReply)

    return {
      reply: aiReply,
      exerciseType,
      isCritical,
      helpline: isCritical ? '108' : undefined,
      safetyChecklist: [
        'Prioritize human life over property',
        'Keep phone battery saved for emergency updates',
        'National Emergency Helpline: 112 | Medical Ambulance: 108',
      ],
    }
  } catch (err) {
    console.warn('[AapdaMitra AI] Falling back to local crisis intelligence engine:', err)
    const fallback = mocks.aiPfaChat(message, victimName)
    return {
      ...fallback,
      reply: cleanAiOutput(fallback.reply),
      safetyChecklist: fallback.safetyChecklist?.map((item) => cleanAiOutput(item)).filter(Boolean),
    }
  }
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
