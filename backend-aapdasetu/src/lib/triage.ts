/**
 * Explainable, deterministic AI triage engine.
 *
 * Faithful to the PRD / flow.md / tech.md specification:
 *  - Base score: 30
 *  - Emergency-type base weighting
 *  - Multi-keyword NLP scoring
 *  - Demographic vulnerability boosts (children / elderly)
 *  - Medical-condition boosts
 *  - Clamp to 1..100 and classify RED (>=80) / YELLOW (>=50) / GREEN (<50)
 *  - Returns explainable scoring factors
 */

export type IncidentType =
  | 'fire'
  | 'flood'
  | 'medical'
  | 'missing_person'
  | 'earthquake'
  | 'accident'
  | 'other';

export type PriorityLabel = 'RED' | 'YELLOW' | 'GREEN';

export interface TriageFactor {
  rule: string;
  points: number;
  matched?: string;
}

export interface TriageInput {
  type: IncidentType;
  description?: string | null;
  medicalCondition?: string | null;
  missingPersonAge?: number | null;
  landmark?: string | null;
  bloodType?: string | null;
  /** 1-Tap SOS submissions carry almost no description text, so without this
   * boost they always triage GREEN and never sound the command-center siren.
   * The citizen pressed a dedicated emergency button — treat it that way. */
  isOneTapSos?: boolean | null;
}

export interface TriageResult {
  score: number;
  label: PriorityLabel;
  factors: TriageFactor[];
}

export const TYPE_BASE_SCORES: Record<IncidentType, number> = {
  earthquake: 25,
  fire: 20,
  flood: 15,
  medical: 15,
  missing_person: 15,
  accident: 12,
  other: 5,
};

// PRD keyword matrix (multi-keyword NLP scoring)
export const KEYWORD_SCORES: Array<{ keywords: string[]; points: number }> = [
  { keywords: ['drowning', 'trapped', 'pregnant'], points: 30 },
  { keywords: ['bleeding', 'infant', 'cardiac', 'submerged'], points: 25 },
  { keywords: ['water 5ft', 'water five', 'child', 'unconscious'], points: 20 },
  { keywords: ['roof', 'diabetic', 'elderly'], points: 15 },
];

// tech.md medical-condition boosts
export const MEDICAL_SCORES: Array<{ keywords: string[]; points: number; label: string }> = [
  { keywords: ['pregnant', 'pregnancy'], points: 30, label: 'MEDICAL_PREGNANCY' },
  { keywords: ['bleed', 'bleeding'], points: 25, label: 'MEDICAL_BLEEDING' },
  { keywords: ['heart', 'cardiac'], points: 20, label: 'MEDICAL_CARDIAC' },
];

export const CHILD_MAX_AGE = 12;
export const ELDER_MIN_AGE = 60;

// 1-Tap SOS floor: base 30 + type "other" 5 = 35 (GREEN) is never acceptable
// for an explicit emergency button. +55 lands every unadorned SOS at 90 (RED)
// while richer reports still climb higher via keyword/medical boosts.
export const ONE_TAP_SOS_BOOST = 55;

function matchAny(text: string, keywords: string[]): string | undefined {
  const lower = text.toLowerCase();
  return keywords.find((k) => lower.includes(k));
}

/**
 * Compute the triage score and priority label.
 * Pure function — no I/O, no randomness. Fully deterministic & explainable.
 */
export function computeTriage(input: TriageInput): TriageResult {
  let score = 30;
  const factors: TriageFactor[] = [];

  // Stage 1: emergency-type weighting
  const typeWeight = TYPE_BASE_SCORES[input.type] ?? 5;
  score += typeWeight;
  factors.push({ rule: 'TYPE_BASE', points: typeWeight });

  const textParts = [input.description, input.medicalCondition, input.landmark]
    .filter((x): x is string => Boolean(x))
    .join(' ');

  // Stage 2: multi-keyword NLP matching
  for (const group of KEYWORD_SCORES) {
    const matched = matchAny(textParts, group.keywords);
    if (matched) {
      score += group.points;
      factors.push({ rule: 'KEYWORD', points: group.points, matched });
    }
  }

  // Stage 2b: explicit 1-Tap SOS emergency button
  if (input.isOneTapSos) {
    score += ONE_TAP_SOS_BOOST;
    factors.push({ rule: 'ONE_TAP_SOS', points: ONE_TAP_SOS_BOOST });
  }

  // Stage 3a: demographic vulnerability boosts
  const age = input.missingPersonAge;
  if (age !== null && age !== undefined) {
    if (age <= 5) {
      score += 25;
      factors.push({ rule: 'AGE_CHILD_YOUNG', points: 25 });
    } else if (age <= CHILD_MAX_AGE) {
      score += 20;
      factors.push({ rule: 'AGE_CHILD', points: 20 });
    } else if (age >= ELDER_MIN_AGE) {
      score += 20;
      factors.push({ rule: 'AGE_ELDERLY', points: 20 });
    }
  }

  // Stage 3b: medical-condition boosts
  const medical = (input.medicalCondition ?? '').toLowerCase();
  for (const med of MEDICAL_SCORES) {
    const matched = med.keywords.find((k) => medical.includes(k));
    if (matched) {
      score += med.points;
      factors.push({ rule: med.label, points: med.points, matched });
    }
  }

  // Clamp & classify
  score = Math.max(1, Math.min(100, score));
  const label: PriorityLabel = score >= 80 ? 'RED' : score >= 50 ? 'YELLOW' : 'GREEN';

  return { score, label, factors };
}