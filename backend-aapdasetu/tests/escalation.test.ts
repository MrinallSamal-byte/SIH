import { describe, it, expect } from 'vitest';
import { isSlaBreached } from '../src/services/escalation.service.js';

const base = {
  priorityLabel: 'RED',
  status: 'pending',
  assignedVolunteerId: null,
  assignedAgencyId: null,
  createdAt: new Date(Date.now() - 10 * 60 * 1000),
};

describe('isSlaBreached', () => {
  it('flags old unassigned RED pending reports', () => {
    expect(isSlaBreached(base, 5)).toBe(true);
  });

  it('ignores fresh reports within the threshold', () => {
    expect(isSlaBreached({ ...base, createdAt: new Date(Date.now() - 60 * 1000) }, 5)).toBe(false);
  });

  it('ignores non-RED priorities', () => {
    expect(isSlaBreached({ ...base, priorityLabel: 'YELLOW' }, 5)).toBe(false);
    expect(isSlaBreached({ ...base, priorityLabel: 'GREEN' }, 5)).toBe(false);
  });

  it('ignores assigned or non-pending reports', () => {
    expect(isSlaBreached({ ...base, assignedVolunteerId: 'vol-1' }, 5)).toBe(false);
    expect(isSlaBreached({ ...base, assignedAgencyId: 'agency-1' }, 5)).toBe(false);
    expect(isSlaBreached({ ...base, status: 'in_progress' }, 5)).toBe(false);
    expect(isSlaBreached({ ...base, status: 'resolved' }, 5)).toBe(false);
  });

  it('handles string dates and garbage safely', () => {
    expect(isSlaBreached({ ...base, createdAt: new Date(Date.now() - 3600e3).toISOString() }, 5)).toBe(true);
    expect(isSlaBreached({ ...base, createdAt: 'not-a-date' }, 5)).toBe(false);
  });
});
