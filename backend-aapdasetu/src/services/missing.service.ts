/**
 * Missing-person matching — deterministic V1.
 *
 * Normalizes and compares candidate records (name, age, description, location,
 * timestamps) and produces a ranked match score 0..1. The public API is stable
 * so ML/embedding models can be introduced later without changing callers.
 */
import { prisma } from '../lib/prisma.js';
import { haversineDistanceKm } from '../lib/haversine.js';
import { NotFoundError } from '../lib/errors.js';

export interface MatchCandidate {
  reportId: string;
  name: string | null;
  age: number | null;
  description: string | null;
  latitude: number | null;
  longitude: number | null;
  createdAt: Date;
}

export interface MatchResult {
  candidate: MatchCandidate;
  score: number;
  reasons: Array<{ factor: string; weight: number; evidence?: string }>;
}

const WEIGHTS = {
  nameExact: 0.35,
  namePartial: 0.2,
  ageExact: 0.15,
  ageNear: 0.08,
  descriptionKeyword: 0.12,
  proximity: 0.1,
  recency: 0.1,
  descriptionExact: 0.2,
};

export interface MatchSource {
  missingPersonName: string | null;
  missingPersonAge: number | null;
  missingPersonDesc: string | null;
  latitude: number;
  longitude: number;
  createdAt: Date;
}

export async function findMissingPersonMatches(params: {
  reportId: string;
  candidates?: MatchCandidate[];
  threshold?: number;
}) {
  const report = await prisma.report.findUnique({ where: { id: params.reportId } });
  if (!report) throw new NotFoundError('Missing person report not found');

  const query = params.candidates
    ? params.candidates
    : await fetchMissingCandidates(params.reportId);

  const results: MatchResult[] = query
    .map((candidate) => scoreCandidate(report, candidate))
    .filter((r) => r.score >= (params.threshold ?? 0.2))
    .sort((a, b) => b.score - a.score);

  return results;
}

export async function saveMatch(input: {
  reportAId: string;
  reportBId: string;
  score: number;
  reasons: unknown;
}) {
  return prisma.missingPersonMatch.upsert({
    where: { reportAId_reportBId: { reportAId: input.reportAId, reportBId: input.reportBId } },
    create: { ...input, reasons: input.reasons as object },
    update: { score: input.score, reasons: input.reasons as object },
  });
}

export async function reviewMatch(input: {
  id: string;
  status: 'confirmed' | 'rejected';
  reviewedBy: string;
}) {
  const match = await prisma.missingPersonMatch.findUnique({ where: { id: input.id } });
  if (!match) throw new NotFoundError('Match not found');
  return prisma.missingPersonMatch.update({
    where: { id: input.id },
    data: { status: input.status, reviewedBy: input.reviewedBy, reviewedAt: new Date() },
  });
}

export async function listMatches(params: { status?: string }) {
  return prisma.missingPersonMatch.findMany({
    where: params.status ? { status: params.status as never } : {},
    orderBy: { score: 'desc' },
    include: {
      reportA: { select: { id: true, trackingId: true, missingPersonName: true, missingPersonAge: true } },
      reportB: { select: { id: true, trackingId: true, missingPersonName: true, missingPersonAge: true } },
    },
  });
}

async function fetchMissingCandidates(excludeReportId: string): Promise<MatchCandidate[]> {
  const reports = await prisma.report.findMany({
    where: { type: 'missing_person', id: { not: excludeReportId } },
    select: {
      id: true,
      missingPersonName: true,
      missingPersonAge: true,
      missingPersonDesc: true,
      latitude: true,
      longitude: true,
      createdAt: true,
    },
  });
  return reports.map((r) => ({
    reportId: r.id,
    name: r.missingPersonName ?? null,
    age: r.missingPersonAge ?? null,
    description: r.missingPersonDesc ?? null,
    latitude: r.latitude,
    longitude: r.longitude,
    createdAt: r.createdAt,
  }));
}

export function scoreCandidate(source: MatchSource, candidate: MatchCandidate): MatchResult {
  const reasons: MatchResult['reasons'] = [];
  let score = 0;

  const srcName = normalizeName(source.missingPersonName);
  const candName = normalizeName(candidate.name);
  if (srcName && candName) {
    if (srcName === candName) {
      score += WEIGHTS.nameExact;
      reasons.push({ factor: 'name_exact', weight: WEIGHTS.nameExact, evidence: candName });
    } else if (isPartialNameMatch(srcName, candName)) {
      score += WEIGHTS.namePartial;
      reasons.push({ factor: 'name_partial', weight: WEIGHTS.namePartial, evidence: candName });
    }
  }

  const srcAge = source.missingPersonAge;
  const candAge = candidate.age;
  if (srcAge != null && candAge != null) {
    if (srcAge === candAge) {
      score += WEIGHTS.ageExact;
      reasons.push({ factor: 'age_exact', weight: WEIGHTS.ageExact, evidence: String(candAge) });
    } else if (Math.abs(srcAge - candAge) <= 3) {
      score += WEIGHTS.ageNear;
      reasons.push({ factor: 'age_near', weight: WEIGHTS.ageNear, evidence: String(candAge) });
    }
  }

  const srcDesc = normalizeText(source.missingPersonDesc);
  const candDesc = normalizeText(candidate.description);
  if (srcDesc && candDesc) {
    if (srcDesc === candDesc) {
      score += WEIGHTS.descriptionExact;
      reasons.push({ factor: 'description_exact', weight: WEIGHTS.descriptionExact });
    } else {
      const shared = keywordOverlap(srcDesc, candDesc);
      const weight = Math.min(WEIGHTS.descriptionKeyword, shared * 0.03);
      if (weight > 0.01) {
        score += weight;
        reasons.push({ factor: 'description_keywords', weight, evidence: `${shared} shared terms` });
      }
    }
  }

  if (candidate.latitude != null && candidate.longitude != null) {
    const dist = haversineDistanceKm(source.latitude, source.longitude, candidate.latitude, candidate.longitude);
    if (dist <= 50) {
      const proximity = Math.max(0, 1 - dist / 50);
      const weight = proximity * WEIGHTS.proximity;
      score += weight;
      reasons.push({ factor: 'proximity', weight, evidence: `${dist.toFixed(1)} km` });
    }
  }

  const ageDays = Math.abs(new Date(candidate.createdAt).getTime() - new Date(source.createdAt).getTime()) / 86400000;
  const recency = Math.max(0, 1 - ageDays / 30);
  score += recency * WEIGHTS.recency;
  reasons.push({ factor: 'recency', weight: recency * WEIGHTS.recency, evidence: `${ageDays.toFixed(0)} days apart` });

  return { candidate, score: round(score), reasons };
}

function normalizeName(name: string | null): string {
  return (name ?? '').toLowerCase().replace(/[^a-z0-9\u0900-\u097F\u0B00-\u0B7F\s]/g, '').replace(/\s+/g, ' ').trim();
}

function normalizeText(text: string | null): string {
  return (text ?? '').toLowerCase().replace(/[^a-z0-9\u0900-\u097F\u0B00-\u0B7F\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function isPartialNameMatch(a: string, b: string): boolean {
  const as = a.split(' ');
  const bs = b.split(' ');
  return as.some((x) => x.length > 1 && bs.includes(x));
}

function keywordOverlap(a: string, b: string): number {
  const wordsA = new Set(a.split(' ').filter((w) => w.length > 2));
  const wordsB = new Set(b.split(' ').filter((w) => w.length > 2));
  let shared = 0;
  for (const w of wordsA) if (wordsB.has(w)) shared++;
  return shared;
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}