import type { PriorityLabel, ReportInput, TriageFactor, TriageResult } from '../types'

// Mirrors backend-aapdasetu/src/lib/triage.ts (source of truth).
// The Python twin lives in apps/ai-engine/app/triage.py — keep them in sync.

export const TYPE_BASE_SCORES: Record<string, number> = {
  earthquake: 25,
  fire: 20,
  flood: 15,
  medical: 15,
  missing_person: 15,
  accident: 12,
  other: 5,
}

// At most ONE match per tier group adds points (verbatim BE KEYWORD_SCORES grouping)
export const KEYWORD_SCORES: Array<{ keywords: string[]; points: number }> = [
  { keywords: ['drowning', 'trapped', 'pregnant'], points: 30 },
  { keywords: ['bleeding', 'infant', 'cardiac', 'submerged'], points: 25 },
  { keywords: ['water 5ft', 'water five', 'child', 'unconscious'], points: 20 },
  { keywords: ['roof', 'diabetic', 'elderly'], points: 15 },
]

export function computeTriage(input: ReportInput): TriageResult {
  const factors: TriageFactor[] = []
  let score = 30 // base score

  // 1. Emergency type weighting
  const typePoints = TYPE_BASE_SCORES[input.type] ?? 5
  score += typePoints
  factors.push({ reason: `Emergency type: ${input.type}`, points: typePoints })

  // 2. Multi-keyword NLP scoring (at most one match per group adds points)
  // ponytail: BE scans description+medicalCondition+landmark; the FE form has no
  // medicalCondition input, so report text (description, landmark, missing-person
  // description) is the text source here.
  const text = [input.description, input.landmark, input.missing?.desc ?? '']
    .join(' ')
    .toLowerCase()
  for (const group of KEYWORD_SCORES) {
    const matched = group.keywords.find((keyword) => text.includes(keyword))
    if (matched) {
      score += group.points
      factors.push({ reason: `Keyword: "${matched}"`, points: group.points })
    }
  }

  // 3. Demographic vulnerability boost (BE age tiers: <=5 / <=12 / >=60)
  const age = input.victim?.age ?? input.missing?.age
  if (age !== undefined) {
    if (age <= 5) {
      score += 25
      factors.push({ reason: `Young child victim (age ${age})`, points: 25 })
    } else if (age <= 12) {
      score += 20
      factors.push({ reason: `Child victim (age ${age})`, points: 20 })
    } else if (age >= 60) {
      score += 20
      factors.push({ reason: `Elderly victim (age ${age})`, points: 20 })
    }
  }

  // 4. Medical condition boosts
  if (input.victim?.isPregnant) {
    score += 30
    factors.push({ reason: 'Pregnancy', points: 30 })
  }
  if (input.victim?.isBleeding) {
    score += 25
    factors.push({ reason: 'Bleeding', points: 25 })
  }
  if (input.victim?.isCardiac) {
    score += 20
    factors.push({ reason: 'Cardiac condition', points: 20 })
  }

  // 5. 1-Tap SOS emergency distress boost
  if (input.isOneTapSos) {
    score += 55
    factors.push({ reason: '1-Tap SOS direct emergency trigger', points: 55 })
  }

  // 6. Clamp & classify
  const finalScore = Math.max(1, Math.min(100, Math.round(score)))
  const label: PriorityLabel = finalScore >= 80 ? 'RED' : finalScore >= 50 ? 'YELLOW' : 'GREEN'
  return { score: finalScore, label, factors }
}

