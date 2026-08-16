import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFindMany = vi.fn();

vi.mock('../src/lib/prisma.js', () => ({
  prisma: {
    shelter: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
    },
  },
}));

import { findNearbyShelters } from '../src/services/shelters.service.js';

describe('findNearbyShelters', () => {
  beforeEach(() => {
    mockFindMany.mockClear();
  });

  it('applies bounding box spatial filter and sorts by distance', async () => {
    // Nearby shelter (~19 km away from Bhubaneswar 20.2961, 85.8245)
    const nearby = {
      id: 'shelter-1',
      name: 'Cuttack Shelter',
      latitude: 20.4625,
      longitude: 85.8832,
      capacity: 500,
      occupancy: 200,
      resources: [{ id: 'res-1', name: 'Water', quantity: 100 }],
    };

    // Far shelter (~250 km away)
    const far = {
      id: 'shelter-2',
      name: 'Puri Shelter',
      latitude: 19.8135,
      longitude: 85.8312,
      capacity: 300,
      occupancy: 50,
      resources: [],
    };

    mockFindMany.mockResolvedValue([nearby, far]);

    const results = await findNearbyShelters({
      latitude: 20.2961,
      longitude: 85.8245,
      radiusKm: 50,
    });

    // Verify DB query used latitude/longitude gte/lte bounding box filters
    expect(mockFindMany).toHaveBeenCalledTimes(1);
    const queryArg = mockFindMany.mock.calls[0][0];
    expect(queryArg.where).toBeDefined();
    expect(queryArg.where.latitude.gte).toBeLessThan(20.2961);
    expect(queryArg.where.latitude.lte).toBeGreaterThan(20.2961);
    expect(queryArg.where.longitude.gte).toBeLessThan(85.8245);
    expect(queryArg.where.longitude.lte).toBeGreaterThan(85.8245);

    // Verify distance filtering & sorting
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('shelter-1');
    expect(results[0].capacityAvailable).toBe(300); // 500 - 200
    expect(results[0].distanceKm).toBeGreaterThan(18);
    expect(results[0].distanceKm).toBeLessThan(21);
    expect(results[0].resources).toHaveLength(1);
  });
});
