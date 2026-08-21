import { aiCall, withMockFallback } from './client'
import { mocks } from './mocks'
import type { FloodGeoJson, ReportInput, TriageResult, PfaChatResponse, DamageInfrastructureType } from '../types'

// =============================================================================
// FASTAPI AI ENGINE — BUILD CONTRACT
// =============================================================================

export function aiTriage(input: ReportInput): Promise<TriageResult> {
  return withMockFallback(
    () => aiCall<TriageResult>('POST', '/ai/triage', input),
    () => mocks.aiTriage(input),
  )
}

// =============================================================================
// OPENROUTER AI INTEGRATION (High Quality Free Tier Models)
// =============================================================================
const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY as string | undefined

export const OPENROUTER_FREE_MODELS = [
  'nvidia/nemotron-3-nano-30b-a3b:free',
  'google/gemma-4-31b-it:free',
  'google/gemma-4-26b-a4b-it:free',
  'nvidia/nemotron-nano-9b-v2:free',
  'openai/gpt-oss-20b:free',
  'liquid/lfm-2.5-2.6b:free',
  'z-ai/glm-5.2:free',
] as const

const AAPDAMITRA_SYSTEM_PROMPT = `You are AapdaMitra AI (आपदामित्र), the official AI disaster survival assistant and crisis first-aid expert for AapdaSetu.

STRICT OPERATIONAL DIRECTIVE:
1. Give a direct, practical, and highly relevant answer to the user's specific emergency, first-aid, or disaster question.
2. Provide 2 to 4 concise, numbered life-saving action points or direct guidance.
3. NEVER output internal monologue, reasoning tags, meta-thinking, or preambles like "The user is asking...".
4. If there is injury or danger: provide immediate physical first-aid steps, then mention helpline 112 / 108.
5. Respond in the EXACT language and script used by the user (English, Hindi, Bengali, Odia, Hinglish, etc.).
6. Keep answers actionable, empathetic, and specific to the problem.`

interface ChatHistoryItem {
  role: 'user' | 'bot' | 'assistant' | 'system'
  content: string
}

export type DangerLevel = 'CRITICAL' | 'MODERATE' | 'LOW'

export function detectDangerLevel(text: string): DangerLevel {
  const lower = text.toLowerCase()
  const criticalKeywords = [
    'bleed', 'blood', 'hemorrhage', 'unconscious', 'fainted', 'trapped',
    'drown', 'sinking', 'heart attack', 'chest pain', 'stroke', 'electrocute',
    'severe burn', 'fire', 'choking', 'snake', 'snakebite', 'poison', 'collapse',
    'debris', 'fracture', 'broken bone', 'crush', 'dying', 'flood rising', 'water level',
    'खून', 'बेहोश', 'फंसा', 'डूब', 'हार्ट अटैक', 'सांप', 'आग', 'बिजली',
    'রক্ত', 'অজ্ঞান', 'আটকে', 'ডুব', 'সাপ', 'আগুন',
    'ରକ୍ତ', 'ଚେତାଶୂନ୍ୟ', 'ଫସିରହିଛି', 'ନିଆଁ'
  ]
  if (criticalKeywords.some((kw) => lower.includes(kw))) {
    return 'CRITICAL'
  }

  const moderateKeywords = [
    'pain', 'hurt', 'wound', 'cut', 'sprain', 'fever', 'shivering', 'cold',
    'panic', 'scared', 'afraid', 'fear', 'anxious', 'anxiety', 'food', 'water',
    'shelter', 'medicine', 'insulin', 'elderly', 'baby', 'pregnant', 'lost',
    'दर्द', 'चोट', 'डर', 'घबराहट', 'खाना', 'पानी', 'दवाई', 'কষ্ট', 'আহত', 'ভয়',
    'କ୍ଷତ', 'ଔଷଧ'
  ]
  if (moderateKeywords.some((kw) => lower.includes(kw))) {
    return 'MODERATE'
  }

  return 'LOW'
}

export function detectBreathingExercise(text: string): string | undefined {
  const lower = text.toLowerCase()
  const panicKeywords = [
    'panic', 'scared', 'afraid', 'fear', 'anxious', 'anxiety', 'hyperventilat',
    'heart racing', 'shaking', 'trembling', 'breathe', 'breathing', 'grounding',
    'डर', 'घबराहट', 'चिंता', 'सांस', 'ভয়', 'আতঙ্ক', 'শ্বাস', 'ଡର', 'ଭୟ'
  ]
  if (panicKeywords.some((kw) => lower.includes(kw))) {
    return '4-4-4_BOX_BREATHING'
  }
  return undefined
}

export function isReasoningContaminated(text: string): boolean {
  const reasoningTriggers = [
    /okay,\s*the\s*user\s*is/i,
    /the\s*user\s*is\s*(greeting|asking|testing|saying)/i,
    /looking\s*at\s*the\s*history/i,
    /according\s*to\s*(my\s*)?instructions/i,
    /according\s*to\s*(the\s*)?rules/i,
    /i\s*must\s*:/i,
    /•\s*reply\s*in/i,
    /•\s*give\s*only/i,
    /•\s*no\s*thinking/i,
    /•\s*since\s*it's/i,
    /here('s| is) (a |the )?thinking process/i,
    /thinking process:/i,
    /reasoning process:/i,
    /let's analyze/i,
    /rule \d+:/i,
  ]
  return reasoningTriggers.some((re) => re.test(text))
}

export function cleanAiOutput(rawText: string): string {
  if (!rawText) return ''
  let text = rawText

  // 1. Strip explicit <think>...</think> or [THINK]...[/THINK]
  text = text.replace(/<think[\s\S]*?<\/think>/gi, '')
  text = text.replace(/<thought[\s\S]*?<\/thought>/gi, '')
  text = text.replace(/\[think[\s\S]*?\[\/think\]/gi, '')

  // 2. If model leaked reasoning markers, extract the final response segment
  const responseMarkers = [
    /(?:(?:3|4|5)\.\s*)?Determine Response:\s*([\s\S]*)$/i,
    /(?:Final\s*)?Response:\s*([\s\S]*)$/i,
    /(?:Final\s*)?Answer:\s*([\s\S]*)$/i,
    /Output:\s*([\s\S]*)$/i,
  ]
  for (const marker of responseMarkers) {
    const match = text.match(marker)
    if (match && match[1] && match[1].trim().length > 0) {
      text = match[1]
      break
    }
  }

  // 3. Remove thinking process headers or internal commentary
  text = text.replace(/^(?:Here(?:'s| is) (?:a |the )?thinking process:?|Thinking Process:?|Reasoning:?)[\s\S]*?(?=\n\n\n|\n[A-Z]|$)/gmi, '')
  text = text.replace(/^(?:Okay,\s*the\s*user\s*is[\s\S]*?(?=\n\n|\n[A-Z\p{sc=Devanagari}\p{sc=Bengali}]|$))/gmiu, '')
  text = text.replace(/^(?:Looking\s*at\s*the\s*history[\s\S]*?(?=\n\n|\n[A-Z\p{sc=Devanagari}\p{sc=Bengali}]|$))/gmiu, '')
  text = text.replace(/^(?:According\s*to\s*my\s*instructions[\s\S]*?(?=\n\n|\n[A-Z\p{sc=Devanagari}\p{sc=Bengali}]|$))/gmiu, '')

  // 4. Remove rule echo lines e.g. "• Rule 1: ...", "1. Analyze User Input: ...", "• Since it's..."
  text = text.replace(/^\s*(?:\d+\.\s*(?:Analyze|Check Rules|Determine|Evaluate|Reasoning)|•\s*(?:Rule\s*\d+:|Reply in|Give ONLY|No thinking|Since it's|It's a|I need to)).*$/gmi, '')

  // 5. If JSON encoded, extract value
  const trimmed = text.trim()
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed)
      if (parsed.message) text = parsed.message
      else if (parsed.reply) text = parsed.reply
      else if (parsed.text) text = parsed.text
      else if (parsed.response) text = parsed.response
    } catch {
      // Not valid JSON payload, keep text as is
    }
  }

  // 6. Remove markdown formatting, backticks, hashtags
  text = text.replace(/```(?:json|markdown)?/gi, '')
  text = text.replace(/```/g, '')
  text = text.replace(/`/g, '')
  text = text.replace(/^#{1,6}\s+/gm, '')

  // 7. Strip ALL asterisks (*, **, ***, ****) completely
  text = text.replace(/\*+/g, '')

  // 8. Clean bullets and strip conversational filler
  text = text.replace(/^\s*[-•]\s+/gm, '• ')
  text = text.replace(/\p{Extended_Pictographic}|\p{Emoji_Presentation}|\u200d/gu, '')
  text = text.replace(/^(?:Here is what you should do:?|Here are the steps:?|Answer:?|Assistant:?)\s*/gim, '')

  // 9. Normalize spacing and newlines
  text = text.replace(/[ \t]{2,}/g, ' ')
  text = text.replace(/\n{3,}/g, '\n\n')

  return text.trim()
}

async function callOpenRouter(
  message: string,
  history: ChatHistoryItem[] = []
): Promise<string> {
  const openRouterMessages = [
    { role: 'system', content: AAPDAMITRA_SYSTEM_PROMPT },
    ...history.slice(-6).map((h) => ({
      role: h.role === 'bot' ? ('assistant' as const) : ('user' as const),
      content: cleanAiOutput(h.content),
    })),
    { role: 'user', content: message },
  ]

  if (!OPENROUTER_API_KEY) {
    throw new Error('OpenRouter API key not configured')
  }
  let lastError: unknown = null

  for (const model of OPENROUTER_FREE_MODELS) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://aapdasetu.in',
          'X-Title': 'AapdaSetu Disaster Response Ecosystem',
        },
        signal: controller.signal,
        body: JSON.stringify({
          model,
          messages: openRouterMessages,
          temperature: 0.4,
          max_tokens: 220,
        }),
      })
      clearTimeout(timeout)

      if (!res.ok) {
        const errorBody = await res.text()
        console.warn(`[AapdaMitra AI] Model ${model} returned HTTP ${res.status}:`, errorBody)
        continue
      }

      const data = await res.json()
      const content = data?.choices?.[0]?.message?.content
      if (content && typeof content === 'string' && content.trim().length > 0) {
        const cleaned = cleanAiOutput(content)
        // If the output is still contaminated with leaked reasoning or too short, skip this model
        if (cleaned.length > 5 && !isReasoningContaminated(cleaned)) {
          return cleaned
        }
      }
    } catch (err) {
      clearTimeout(timeout)
      lastError = err
      console.warn(`[AapdaMitra AI] Error requesting model ${model}:`, err)
    }
  }

  throw lastError || new Error('All OpenRouter models produced empty or contaminated output')
}

/** POST /ai/pfa-chat — Intelligent AapdaMitra AI Crisis & Survival Companion. */
export async function aiPfaChat(
  message: string,
  history: ChatHistoryItem[] = [],
  victimName = 'Friend'
): Promise<PfaChatResponse> {
  const lowerScope = message.toLowerCase()
  const scopePattern = /\b(flood|bleed|cut|drown|sinking|cardiac|heart|snake|burn|fracture|chok|help|rescue|shelter|track|sos|report|aapdasetu|emergency|danger|pain|hurt|wound|panic|water|food|medicine|hospital|ambulance|fire|earthquake|collapse|trapped|missing|damage|helpline|112|108)\b/i
  const unrelatedPattern = /\b(reverse|py\s*code|python|java\s*code|javascript|programming|algorithm|leetcode|homework|essay|poem|joke|song|movie|game|translate|write\s*code|give\s*code|code\s*snippet|reverse\s*string)\b/i
  if (unrelatedPattern.test(lowerScope) && !scopePattern.test(lowerScope)) {
    return {
      reply: 'I can only help with disaster, emergency, and AapdaSetu website topics (SOS, Report, Shelter, Track, Medical guidance). Please ask about flood, injury, shelter, or tracking. Example: "water entering house" or "severe bleeding".',
      exerciseType: undefined,
      isCritical: false,
      dangerLevel: 'LOW',
      helpline: undefined,
      safetyChecklist: ['National Emergency: 112 | Ambulance: 108'],
    }
  }
  try {
    const aiReply = await callOpenRouter(message, history)
    const dangerLevel = detectDangerLevel(message) || detectDangerLevel(aiReply)
    const isCritical = dangerLevel === 'CRITICAL'
    const exerciseType = detectBreathingExercise(message) || detectBreathingExercise(aiReply)

    return {
      reply: cleanAiOutput(aiReply),
      exerciseType,
      isCritical,
      dangerLevel,
      helpline: isCritical ? '112' : dangerLevel === 'MODERATE' ? '108' : undefined,
      safetyChecklist: [
        'Prioritize human life over property',
        'Keep phone battery saved for emergency updates',
        'National Emergency Hotline: 112 | Medical Ambulance: 108',
      ],
    }
  } catch (err) {
    console.warn('[AapdaMitra AI] Falling back to local crisis intelligence engine:', err)
    const fallback = mocks.aiPfaChat(message, victimName)
    const dangerLevel = detectDangerLevel(message) || (fallback.isCritical ? 'CRITICAL' : 'LOW')
    return {
      ...fallback,
      reply: cleanAiOutput(fallback.reply),
      dangerLevel,
      isCritical: dangerLevel === 'CRITICAL',
      helpline: dangerLevel === 'CRITICAL' ? '112' : dangerLevel === 'MODERATE' ? '108' : undefined,
      safetyChecklist: fallback.safetyChecklist?.map((item: string) => cleanAiOutput(item)).filter(Boolean),
    }
  }
}

export interface DamageVerdict {
  claimedDamage: boolean
  verified: boolean
  duplicate: boolean
  exifValid: boolean
  exifDeltaKm?: number
  damageGrade: 'DESTROYED' | 'MAJOR' | 'MINOR'
  damageScore: number
  confidence: number
  compensationInr: number
  factors: string[]
  huggingFaceModel: string
  infrastructureType: string
}

/** POST /ai/damage-assessment — anti-fraud photo damage grading with HuggingFace model. */
export function aiDamageAssessment(
  photoDataUrl: string,
  reportedLat?: number,
  reportedLng?: number,
  description?: string,
  infrastructureType?: string,
): Promise<DamageVerdict> {
  return withMockFallback(
    () =>
      aiCall<DamageVerdict>('POST', '/ai/damage-assessment', {
        photoDataUrl,
        reportedLat,
        reportedLng,
        description,
        infrastructureType,
      }),
    () =>
      mocks.aiDamageAssessment(
        photoDataUrl,
        reportedLat,
        reportedLng,
        description,
        infrastructureType as DamageInfrastructureType,
      ),
  )
}

/** POST /ai/satelliteflood-map — Sentinel-1 SAR flood extent polygons. */
export function aiSatelliteFloodMap(payload: { district?: string; center?: { lat: number; lng: number }; radiusKm?: number } = {}): Promise<FloodGeoJson> {
  return withMockFallback(
    () => aiCall<FloodGeoJson>('POST', '/ai/satelliteflood-map', payload),
    () => mocks.aiSatelliteFloodMap(),
  )
}
