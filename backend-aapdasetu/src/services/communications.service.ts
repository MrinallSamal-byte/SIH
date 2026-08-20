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
  const channelKey = input.channels.includes('all')
    ? 'all'
    : input.channels.filter((c) => c !== 'web').join(',') || 'public';
  const channel = input.channels.includes('sms') && input.channels.includes('whatsapp') ? 'all' : channelKey;

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

async function sendSms(input: BroadcastInput): Promise<DeliveryOutcome> {
  try {
    const recipients = input.recipientNumbers?.length
      ? input.recipientNumbers
      : [env.twilioDefaultToNumber].filter(Boolean);
    let sent = 0;
    for (const to of recipients) {
      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${env.twilioAccountSid}/Messages.json`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${env.twilioAccountSid}:${env.twilioAuthToken}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ To: to, From: env.twilioFromNumber!, Body: `${input.title}\n\n${input.body}` }).toString(),
      });
      if (res.ok) sent += 1;
    }
    return { ok: sent > 0, note: `sent ${sent}/${recipients.length}` };
  } catch {
    return { ok: false, note: 'SMS delivery failed' };
  }
}

async function sendWhatsApp(input: BroadcastInput): Promise<DeliveryOutcome> {
  try {
    const recipients = input.recipientNumbers?.length
      ? input.recipientNumbers
      : [env.whatsappDefaultToNumber].filter(Boolean);
    let sent = 0;
    for (const to of recipients) {
      const res = await fetch(`https://graph.facebook.com/v19.0/${env.whatsappPhoneNumberId}/messages`, {
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
      if (res.ok) sent += 1;
    }
    return { ok: sent > 0, note: `sent ${sent}/${recipients.length}` };
  } catch {
    return { ok: false, note: 'WhatsApp delivery failed' };
  }
}
