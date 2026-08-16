import { describe, it, expect } from 'vitest';
import { SDRF_COMPENSATION, MAX_LOCATION_DISTANCE_KM } from '../src/services/damage.service.js';

describe('SDRF compensation schedule', () => {
  it('defines compensation for every classification', () => {
    expect(SDRF_COMPENSATION).toEqual({
      FULLY_DESTROYED: 95100,
      MAJOR_STRUCTURAL_DAMAGE: 47550,
      MINOR_DAMAGE: 9800,
    });
  });

  it('is strictly decreasing with severity', () => {
    expect(SDRF_COMPENSATION.FULLY_DESTROYED).toBeGreaterThan(SDRF_COMPENSATION.MAJOR_STRUCTURAL_DAMAGE);
    expect(SDRF_COMPENSATION.MAJOR_STRUCTURAL_DAMAGE).toBeGreaterThan(SDRF_COMPENSATION.MINOR_DAMAGE);
  });

  it('has a sane location verification radius', () => {
    expect(MAX_LOCATION_DISTANCE_KM).toBeGreaterThan(0);
    expect(MAX_LOCATION_DISTANCE_KM).toBeLessThanOrEqual(10);
  });
});