import { describe, it, expect } from 'vitest';
import { haversineDistanceKm } from '../src/lib/haversine.js';

describe('haversineDistanceKm', () => {
  it('returns 0 for identical coordinates', () => {
    expect(haversineDistanceKm(20.2961, 85.8245, 20.2961, 85.8245)).toBe(0);
  });

  it('computes a known distance (Bhubaneswar -> Cuttack ~ 19 km)', () => {
    const dist = haversineDistanceKm(20.2961, 85.8245, 20.4625, 85.8832);
    expect(dist).toBeGreaterThan(18);
    expect(dist).toBeLessThan(21);
  });

  it('is symmetric', () => {
    const a = haversineDistanceKm(20.2, 85.8, 20.3, 85.9);
    const b = haversineDistanceKm(20.3, 85.9, 20.2, 85.8);
    expect(a).toBeCloseTo(b, 10);
  });
});