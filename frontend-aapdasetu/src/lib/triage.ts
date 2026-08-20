import type { PriorityLabel, ReportInput, TriageFactor, TriageResult } from '../types'

// Mirrors the algorithm in projectrequirement.md §2.1.4 and tech.md §4.
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

export const KEYWORD_SCORES: [keyword: string, points: number][] = [
  ['drowning', 30],
  ['trapped', 30],
  ['pregnant', 30],
  ['bleeding', 25],
  ['infant', 25],
  ['cardiac', 25],
  ['submerged', 25],
  ['water 5ft', 20],
  ['child', 20],
  ['unconscious', 20],
  ['roof', 15],
  ['diabetic', 15],
  ['elderly', 15],
]

export function computeTriage(input: ReportInput): TriageResult {
  const factors: TriageFactor[] = []
  let score = 30 // base score

  // 1. Emergency type weighting
  const typePoints = TYPE_BASE_SCORES[input.type] ?? 5
  score += typePoints
  factors.push({ reason: `Emergency type: ${input.type}`, points: typePoints })

  // 2. Multi-keyword NLP scoring
  const text = [input.description, input.landmark, input.missing?.desc ?? '']
    .join(' ')
    .toLowerCase()
  for (const [keyword, points] of KEYWORD_SCORES) {
    if (text.includes(keyword)) {
      score += points
      factors.push({ reason: `Keyword: "${keyword}"`, points })
    }
  }

  // 3. Demographic vulnerability boost
  const age = input.victim?.age ?? input.missing?.age
  if (age !== undefined) {
    if (age <= 12) {
      score += 25
      factors.push({ reason: `Child victim (age ${age})`, points: 25 })
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

