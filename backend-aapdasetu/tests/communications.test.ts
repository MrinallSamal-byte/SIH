import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../src/config/env.js', () => ({
  env: {
    twilioAccountSid: '',
    twilioAuthToken: '',
    twilioFromNumber: '',
    twilioDefaultToNumber: '',
    whatsappCloudApiToken: '',
    whatsappPhoneNumberId: '',
    whatsappDefaultToNumber: '',
  },
}));

const createAlertMock = vi.fn(async () => ({ id: 'alert-123' }));
vi.mock('../src/services/alerts.service.js', () => ({
  createAlert: (...args: unknown[]) => createAlertMock(...args),
}));

vi.mock('../src/services/audit.service.js', () => ({
  writeAuditLog: vi.fn(async () => {}),
}));

import { broadcastAlert } from '../src/services/communications.service.js';

describe('broadcastAlert', () => {
  beforeEach(() => {
    createAlertMock.mockClear();
  });

  const base = {
    severity: 'critical' as const,
    title: 'Heavy Rainfall Warning',
    body: 'Avoid low-lying areas.',
    channels: ['web'],
    adminEmail: 'admin@aapdasetu.org',
  };

  it('persists an alert and counts the web channel', async () => {
    const result = await broadcastAlert(base);
    expect(createAlertMock).toHaveBeenCalledTimes(1);
    expect(result.delivered).toBe(1);
    expect(result.channels).toEqual(['web']);
    expect(result.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ channel: 'web', delivered: true })]),
    );
  });

  it('skips SMS/WhatsApp delivery when provider credentials are absent', async () => {
    const result = await broadcastAlert({ ...base, channels: ['web', 'sms', 'whatsapp'] });
    expect(result.delivered).toBe(1);
    expect(result.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ channel: 'sms', delivered: false }),
        expect.objectContaining({ channel: 'whatsapp', delivered: false }),
      ]),
    );
  });

  it('persists the alert row with the mapped channel', async () => {
    await broadcastAlert({ ...base, channels: ['sms', 'whatsapp', 'web'], region: 'Khordha' });
    const alertInput = createAlertMock.mock.calls[0][0];
    expect(alertInput).toMatchObject({
      title: 'Heavy Rainfall Warning',
      severity: 'critical',
      targetArea: 'Khordha',
      channel: 'all',
    });
  });
});