/**
 * SMS dispatch with a pluggable provider.
 *
 * - `SMS_PROVIDER=webhook` → POSTs to `SMS_WEBHOOK_URL` (government NIC/DLT
 *   gateway or aggregator). Contract: POST JSON
 *   `{ messages: [{ to, text }] }` with `Authorization: Bearer <token>` when
 *   `SMS_WEBHOOK_TOKEN` is set; any 2xx counts the batch as accepted.
 * - `SMS_PROVIDER=twilio` (or Twilio credentials present and no explicit
 *   provider) → Twilio Messages API.
 * - otherwise → disabled: every send reports `sent: 0` with an honest note so
 *   callers (broadcast, OTP) degrade gracefully instead of throwing.
 */
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';

export interface SmsBatchInput {
  to: string[];
  text: string;
}

export interface SmsBatchResult {
  sent: number;
  total: number;
  provider: 'twilio' | 'webhook' | 'disabled';
  note?: string;
}

const PROVIDER_TIMEOUT_MS = 10000;
const RECIPIENT_BATCH_SIZE = 10;
export const SMS_MAX_CHARS = 320;

function resolveProvider(): SmsBatchResult['provider'] {
  const explicit = (env.smsProvider ?? '').trim().toLowerCase();
  if (explicit === 'webhook' || explicit === 'twilio' || explicit === 'disabled') return explicit;
  if (env.twilioAccountSid && env.twilioAuthToken && env.twilioFromNumber) return 'twilio';
  if (env.smsWebhookUrl) return 'webhook';
  return 'disabled';
}

export function smsProviderStatus(): { provider: string; configured: boolean } {
  const provider = resolveProvider();
  return { provider, configured: provider !== 'disabled' };
}

async function fetchWithRetry(url: string, init: RequestInit): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, { ...init, signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS) });
      if (res.status < 500 || attempt === 1) return res;
      lastError = new Error(`provider responded HTTP ${res.status}`);
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

export async function sendSmsBatch(input: SmsBatchInput): Promise<SmsBatchResult> {
  const recipients = [...new Set((input.to ?? []).map((n) => n.trim()).filter(Boolean))];
  const text = (input.text ?? '').slice(0, SMS_MAX_CHARS);
  const provider = resolveProvider();

  if (recipients.length === 0 || !text) {
    return { sent: 0, total: recipients.length, provider, note: 'no recipients or empty text' };
  }
  if (provider === 'disabled') {
    return { sent: 0, total: recipients.length, provider, note: 'SMS provider not configured' };
  }
  try {
    const sent = provider === 'webhook' ? await sendViaWebhook(recipients, text) : await sendViaTwilio(recipients, text);
    return { sent, total: recipients.length, provider, note: `sent ${sent}/${recipients.length}` };
  } catch (err) {
    logger.warn('SMS delivery failed', { provider, error: (err as Error).message });
    return { sent: 0, total: recipients.length, provider, note: 'SMS delivery failed' };
  }
}

async function sendViaTwilio(recipients: string[], text: string): Promise<number> {
  let sent = 0;
  for (let i = 0; i < recipients.length; i += RECIPIENT_BATCH_SIZE) {
    const results = await Promise.all(
      recipients.slice(i, i + RECIPIENT_BATCH_SIZE).map(async (to) => {
        const res = await fetchWithRetry(
          `https://api.twilio.com/2010-04-01/Accounts/${env.twilioAccountSid}/Messages.json`,
          {
            method: 'POST',
            headers: {
              Authorization: `Basic ${Buffer.from(`${env.twilioAccountSid}:${env.twilioAuthToken}`).toString('base64')}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({ To: to, From: env.twilioFromNumber!, Body: text }).toString(),
          },
        );
        return res.ok;
      }),
    );
    sent += results.filter(Boolean).length;
  }
  return sent;
}

async function sendViaWebhook(recipients: string[], text: string): Promise<number> {
  if (!env.smsWebhookUrl) return 0;
  let sent = 0;
  for (let i = 0; i < recipients.length; i += RECIPIENT_BATCH_SIZE) {
    const batch = recipients.slice(i, i + RECIPIENT_BATCH_SIZE);
    const res = await fetchWithRetry(env.smsWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(env.smsWebhookToken ? { Authorization: `Bearer ${env.smsWebhookToken}` } : {}),
      },
      body: JSON.stringify({ messages: batch.map((to) => ({ to, text })) }),
    });
    // The webhook owns per-recipient fan-out; a 2xx means it accepted the batch.
    if (res.ok) sent += batch.length;
  }
  return sent;
}
