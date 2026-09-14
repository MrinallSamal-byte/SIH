import { describe, it, expect } from 'vitest';
import { SDRF_COMPENSATION, MAX_LOCATION_DISTANCE_KM } from '../src/services/damage.service.js';
import { damageAssessmentSchema } from '../src/schemas/index.js';

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

describe('damageAssessmentSchema dossier fields', () => {
  const validBasePayload = {
    imageBase64: 'data:image/jpeg;base64,' + 'A'.repeat(50),
    reportedLatitude: 26.1445,
    reportedLongitude: 91.7362,
  };

  it('accepts valid dossier fields', () => {
    const payload = {
      ...validBasePayload,
      reporterName: 'John Doe',
      reporterPhone: '9876543210',
      propertyAddress: '123 River Road, Guwahati',
      district: 'Kamrup Metropolitan',
      description: 'Roof collapsed and walls cracked from flash flood',
      infrastructureType: 'broken_home',
      additionalPhotoCount: 3,
    };
    const parsed = damageAssessmentSchema.safeParse(payload);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.propertyAddress).toBe('123 River Road, Guwahati');
      expect(parsed.data.district).toBe('Kamrup Metropolitan');
      expect(parsed.data.description).toBe('Roof collapsed and walls cracked from flash flood');
      expect(parsed.data.infrastructureType).toBe('broken_home');
      expect(parsed.data.additionalPhotoCount).toBe(3);
    }
  });

  it('rejects negative additionalPhotoCount', () => {
    const payload = {
      ...validBasePayload,
      additionalPhotoCount: -1,
    };
    const parsed = damageAssessmentSchema.safeParse(payload);
    expect(parsed.success).toBe(false);
  });
});