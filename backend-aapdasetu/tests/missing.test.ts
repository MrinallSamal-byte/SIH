import { describe, it, expect } from 'vitest';
import { scoreCandidate } from '../src/services/missing.service.js';
import type { MatchCandidate, MatchSource } from '../src/services/missing.service.js';

function candidate(overrides: Partial<MatchCandidate>): MatchCandidate {
  return {
    reportId: '11111111-1111-1111-1111-111111111111',
    name: 'Anita Sahoo',
    age: 9,
    description: 'Last seen near market, wearing red dress',
    latitude: 20.27,
    longitude: 85.83,
    createdAt: new Date('2026-08-01T10:00:00Z'),
    ...overrides,
  };
}

const source: MatchSource = {
  missingPersonName: 'Anita Sahoo',
  missingPersonAge: 9,
  missingPersonDesc: 'Last seen near market, wearing red dress',
  latitude: 20.27,
  longitude: 85.83,
  createdAt: new Date('2026-08-01T10:00:00Z'),
};

describe('scoreCandidate (deterministic V1 missing-person matching)', () => {
  it('ranks identical records highest', () => {
    const result = scoreCandidate(source, candidate({}));
    expect(result.score).toBeGreaterThanOrEqual(0.9);
    const names = result.reasons.map((r) => r.factor);
    expect(names).toContain('name_exact');
    expect(names).toContain('age_exact');
    expect(names).toContain('description_exact');
  });

  it('scores partial name + proximity candidates lower', () => {
    const exact = scoreCandidate(source, candidate({})).score;
    const partial = scoreCandidate(
      source,
      candidate({
        reportId: '22222222-2222-2222-2222-222222222222',
        name: 'Anita Kumar',
        age: 10,
        latitude: 20.35,
        longitude: 85.9,
      }),
    ).score;
    const unrelated = scoreCandidate(
      source,
      candidate({
        reportId: '33333333-3333-3333-3333-333333333333',
        name: 'Rakesh Patra',
        age: 45,
        latitude: 21.0,
        longitude: 86.0,
      }),
    ).score;
    expect(exact).toBeGreaterThan(partial);
    expect(partial).toBeGreaterThan(unrelated);
  });

  it('returns a low score for completely unrelated records', () => {
    const result = scoreCandidate(
      source,
      candidate({
        name: 'Totally Different',
        age: 80,
        description: 'no shared content here',
        latitude: 25.0,
        longitude: 90.0,
      }),
    );
    expect(result.score).toBeLessThan(0.4);
  });

  it('is deterministic', () => {
    const a = scoreCandidate(source, candidate({}));
    const b = scoreCandidate(source, candidate({}));
    expect(a).toEqual(b);
  });
});