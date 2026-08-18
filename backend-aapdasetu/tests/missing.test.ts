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

  describe('edge cases and null/undefined handling', () => {
    it('handles candidate with null properties safely', () => {
      const nullCand = candidate({
        name: null,
        age: null,
        description: null,
        latitude: null,
        longitude: null,
      });

      const result = scoreCandidate(source, nullCand);

      expect(result).toBeDefined();
      expect(typeof result.score).toBe('number');
      expect(result.score).toBeGreaterThanOrEqual(0);
      const factorNames = result.reasons.map((r) => r.factor);
      expect(factorNames).not.toContain('name_exact');
      expect(factorNames).not.toContain('name_partial');
      expect(factorNames).not.toContain('age_exact');
      expect(factorNames).not.toContain('age_near');
      expect(factorNames).not.toContain('description_exact');
      expect(factorNames).not.toContain('description_keywords');
      expect(factorNames).not.toContain('proximity');
      expect(factorNames).toContain('recency');
    });

    it('handles source with null properties safely', () => {
      const nullSource: MatchSource = {
        missingPersonName: null,
        missingPersonAge: null,
        missingPersonDesc: null,
        latitude: 20.27,
        longitude: 85.83,
        createdAt: new Date('2026-08-01T10:00:00Z'),
      };

      const result = scoreCandidate(nullSource, candidate({}));

      expect(result).toBeDefined();
      expect(typeof result.score).toBe('number');
      const factorNames = result.reasons.map((r) => r.factor);
      expect(factorNames).not.toContain('name_exact');
      expect(factorNames).not.toContain('age_exact');
      expect(factorNames).not.toContain('description_exact');
      expect(factorNames).toContain('proximity');
      expect(factorNames).toContain('recency');
    });

    it('handles empty and whitespace-only strings gracefully', () => {
      const emptySource: MatchSource = {
        missingPersonName: '   ',
        missingPersonAge: null,
        missingPersonDesc: '',
        latitude: 20.27,
        longitude: 85.83,
        createdAt: new Date('2026-08-01T10:00:00Z'),
      };

      const emptyCand = candidate({
        name: '',
        description: '   ',
      });

      const result = scoreCandidate(emptySource, emptyCand);
      const factorNames = result.reasons.map((r) => r.factor);
      expect(factorNames).not.toContain('name_exact');
      expect(factorNames).not.toContain('description_exact');
      expect(factorNames).not.toContain('description_keywords');
    });

    it('handles age boundary conditions correctly', () => {
      // Age exact
      const exactResult = scoreCandidate(
        { ...source, missingPersonAge: 10 },
        candidate({ age: 10 })
      );
      expect(exactResult.reasons.map((r) => r.factor)).toContain('age_exact');

      // Age near (within 3 years difference)
      const nearResult = scoreCandidate(
        { ...source, missingPersonAge: 10 },
        candidate({ age: 13 })
      );
      expect(nearResult.reasons.map((r) => r.factor)).toContain('age_near');

      // Age far (more than 3 years difference)
      const farResult = scoreCandidate(
        { ...source, missingPersonAge: 10 },
        candidate({ age: 14 })
      );
      const farFactors = farResult.reasons.map((r) => r.factor);
      expect(farFactors).not.toContain('age_exact');
      expect(farFactors).not.toContain('age_near');
    });

    it('handles distance beyond proximity threshold (> 50 km)', () => {
      const farLocationCand = candidate({
        latitude: 21.5,
        longitude: 87.0,
      });

      const result = scoreCandidate(source, farLocationCand);
      expect(result.reasons.map((r) => r.factor)).not.toContain('proximity');
    });
  });
});