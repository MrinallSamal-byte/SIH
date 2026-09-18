/** Multi-channel alert broadcaster (Web Push / SMS / WhatsApp / Web). */
import { env } from '../config/env.js';
import { createAlert } from './alerts.service.js';
import { writeAuditLog } from './audit.service.js';
import { sendSmsBatch } from './sms.service.js';
import { countPushSubscriptions } from './push.service.js';

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
 * are configured, attempts real push / SMS / WhatsApp delivery.
 * Without credentials each channel reports delivered:false with an honest
 * note instead of throwing — the bulletin is never lost.
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
    const recipients = input.recipientNumbers?.length
      ? input.recipientNumbers
      : [env.twilioDefaultToNumber, env.whatsappDefaultToNumber].filter(Boolean) as string[];
    const sms = await sendSmsBatch({ to: recipients, text: `${input.title}\n\n${input.body}` });
    details.push({ channel: 'sms', delivered: sms.sent > 0, note: sms.note ?? `provider: ${sms.provider}` });
    if (sms.sent > 0) {
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

  if (input.channels.includes('push')) {
    const subs = await countPushSubscriptions().catch(() => 0);
    const pushReady = Boolean(env.vapidPublicKey) && subs > 0;
    details.push({
      channel: 'push',
      delivered: false,
      note: pushReady
        ? `${subs} device(s) subscribed — delivery needs the push sender worker`
        : subs > 0
          ? `${subs} device(s) subscribed — VAPID keys not configured`
          : 'no push subscriptions yet',
    });
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
