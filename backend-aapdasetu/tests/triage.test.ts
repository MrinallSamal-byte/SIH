import { describe, it, expect } from 'vitest';
import { computeTriage } from '../src/lib/triage.js';

describe('computeTriage', () => {
  it('starts at base 30 and adds type weight', () => {
    const r = computeTriage({ type: 'accident' });
    expect(r.score).toBe(30 + 12);
    expect(r.label).toBe('GREEN');
  });

  it('classifies earthquake as RED with drowning keywords', () => {
    const r = computeTriage({
      type: 'flood',
      description: 'Family drowning, water 5ft and rising, child trapped on roof',
    });
    expect(r.score).toBeGreaterThanOrEqual(80);
    expect(r.label).toBe('RED');
    expect(r.factors.some((f) => f.rule === 'KEYWORD' && f.points === 30)).toBe(true);
  });

  it('boosts young child missing persons heavily', () => {
    const base = computeTriage({ type: 'missing_person' });
    const child = computeTriage({ type: 'missing_person', missingPersonAge: 5 });
    expect(child.score - base.score).toBe(25);
    expect(child.factors.some((f) => f.rule === 'AGE_CHILD_YOUNG')).toBe(true);
  });

  it('boosts elderly >= 60 by 20', () => {
    const base = computeTriage({ type: 'other' });
    const elder = computeTriage({ type: 'other', missingPersonAge: 65 });
    expect(elder.score - base.score).toBe(20);
  });

  it('adds medical condition boosts', () => {
    const r = computeTriage({ type: 'medical', medicalCondition: 'pregnant and bleeding' });
    const points = r.factors
      .filter((f) => f.rule.startsWith('MEDICAL_'))
      .reduce((s, f) => s + f.points, 0);
    expect(points).toBe(55); // pregnant 30 + bleeding 25
  });

  it('clamps score to 1..100', () => {
    const r = computeTriage({
      type: 'earthquake',
      description: 'drowning trapped pregnant bleeding cardiac submerged child unconscious roof',
      medicalCondition: 'pregnant bleeding heart',
      missingPersonAge: 4,
    });
    expect(r.score).toBe(100);
    expect(r.label).toBe('RED');
  });

  it('produces explainable factors', () => {
    const r = computeTriage({ type: 'fire', description: 'roof' });
    expect(r.factors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ rule: 'TYPE_BASE', points: 20 }),
        expect.objectContaining({ rule: 'KEYWORD', matched: 'roof' }),
      ]),
    );
  });

  it('is deterministic', () => {
    const input = { type: 'flood', description: 'trapped on roof' };
    expect(computeTriage(input)).toEqual(computeTriage(input));
  });
});