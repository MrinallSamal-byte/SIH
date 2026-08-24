/** Multi-channel alert broadcaster (SMS / WhatsApp / Web). */
import { env } from '../config/env.js';
import { createAlert } from './alerts.service.js';
import { writeAuditLog } from './audit.service.js';

export interface BroadcastInput {
  severity: 'info' | 'warning' | 'critical';
  title: string;
  body: string;
  region?: string;
  channels: string[];
  recipientNumbers?: string[];
  adminEmail: string;
}

export interface BroadcastResult {
  delivered: number;
  channels: string[];
  details: { channel: string; delivered: boolean; note?: string }[];
}

/**
 * Persists the alert to the DB (web channel) and, when provider credentials
 * are configured, attempts real Twilio SMS / WhatsApp Cloud API delivery.
 * Without credentials it returns a graceful count (web=1, others=0).
 */
export async function broadcastAlert(input: BroadcastInput): Promise<BroadcastResult> {
  // ponytail: removed dead channels.includes('all') branch — broadcastSchema restricts input to sms|whatsapp|web
  const channel =
    input.channels.includes('sms') && input.channels.includes('whatsapp')
      ? 'all'
      : input.channels.filter((c) => c !== 'web').join(',') || 'public';

  const alert = await createAlert({
    title: input.title,
    message: input.body,
    severity: input.severity,
    channel,
    targetArea: input.region,
    createdBy: input.adminEmail,
    adminEmail: input.adminEmail,
  });

  const details: BroadcastResult['details'] = [];

  const webDelivered = Boolean(alert?.id);
  details.push({ channel: 'web', delivered: webDelivered });

  let delivered = webDelivered ? 1 : 0;
  const deliveredChannels = ['web'];

  if (input.channels.includes('sms')) {
    const sms = env.twilioAccountSid && env.twilioAuthToken ? await sendSms(input) : { ok: false, note: 'Twilio credentials not configured' };
    details.push({ channel: 'sms', delivered: sms.ok, note: sms.note });
    if (sms.ok) {
      delivered += 1;
      deliveredChannels.push('sms');
    }
  }

  if (input.channels.includes('whatsapp')) {
    const wa = env.whatsappCloudApiToken && env.whatsappPhoneNumberId ? await sendWhatsApp(input) : { ok: false, note: 'WhatsApp credentials not configured' };
    details.push({ channel: 'whatsapp', delivered: wa.ok, note: wa.note });
    if (wa.ok) {
      delivered += 1;
      deliveredChannels.push('whatsapp');
    }
  }

  await writeAuditLog({
    adminEmail: input.adminEmail,
    action: 'BROADCAST_ALERT',
    entityType: 'alert',
    entityId: alert.id,
    details: { channels: input.channels, severity: input.severity, delivered },
  });

  return { delivered, channels: deliveredChannels, details };
}

interface DeliveryOutcome {
  ok: boolean;
  note?: string;
}

const PROVIDER_TIMEOUT_MS = 10000;
const RECIPIENT_BATCH_SIZE = 10;
const SMS_MAX_CHARS = 320;

async function fetchWithRetry(url: string, init: RequestInit): Promise<Response> {
  let lastError: unknown;
  // ponytail: one retry for network errors / 5xx only
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

async function sendSms(input: BroadcastInput): Promise<DeliveryOutcome> {
  if (!env.twilioFromNumber) {
    return { ok: false, note: 'TWILIO_FROM_NUMBER missing' };
  }
  try {
    const recipients = input.recipientNumbers?.length
      ? input.recipientNumbers
      : [env.twilioDefaultToNumber].filter(Boolean);
    const text = `${input.title}\n\n${input.body}`.slice(0, SMS_MAX_CHARS);
    let sent = 0;
    for (let i = 0; i < recipients.length; i += RECIPIENT_BATCH_SIZE) {
      const results = await Promise.all(
        recipients.slice(i, i + RECIPIENT_BATCH_SIZE).map(async (to) => {
          const res = await fetchWithRetry(`https://api.twilio.com/2010-04-01/Accounts/${env.twilioAccountSid}/Messages.json`, {
            method: 'POST',
            headers: {
              Authorization: `Basic ${Buffer.from(`${env.twilioAccountSid}:${env.twilioAuthToken}`).toString('base64')}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({ To: to, From: env.twilioFromNumber!, Body: text }).toString(),
          });
          return res.ok;
        }),
      );
      sent += results.filter(Boolean).length;
    }
    return { ok: sent > 0, note: `sent ${sent}/${recipients.length}` };
  } catch {
    return { ok: false, note: 'SMS delivery failed' };
  }
}

async function sendWhatsApp(input: BroadcastInput): Promise<DeliveryOutcome> {
  if (!env.whatsappPhoneNumberId) {
    return { ok: false, note: 'WHATSAPP_PHONE_NUMBER_ID missing' };
  }
  try {
    const recipients = input.recipientNumbers?.length
      ? input.recipientNumbers
      : [env.whatsappDefaultToNumber].filter(Boolean);
    let sent = 0;
    for (let i = 0; i < recipients.length; i += RECIPIENT_BATCH_SIZE) {
      const results = await Promise.all(
        recipients.slice(i, i + RECIPIENT_BATCH_SIZE).map(async (to) => {
          const res = await fetchWithRetry(`https://graph.facebook.com/v19.0/${env.whatsappPhoneNumberId}/messages`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${env.whatsappCloudApiToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              messaging_product: 'whatsapp',
              to,
              type: 'text',
              text: { body: `${input.title}\n\n${input.body}` },
            }),
          });
          return res.ok;
        }),
      );
      sent += results.filter(Boolean).length;
    }
    return { ok: sent > 0, note: `sent ${sent}/${recipients.length}` };
  } catch {
    return { ok: false, note: 'WhatsApp delivery failed' };
  }
}
