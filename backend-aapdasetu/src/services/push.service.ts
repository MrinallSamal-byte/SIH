/**
 * Web Push subscription registry.
 *
 * Citizens opt in from the Alerts page; subscriptions persist here so a
 * configured sender can fan critical bulletins out even when the app is
 * closed. Actual delivery needs VAPID keys plus a push sender worker —
 * UPGRADE PATH: add the `web-push` package, set VAPID keys, and send stored
 * subscriptions in `notifyPushSubscribers()` below (currently it reports
 * honest queued/skipped counts so the broadcaster never pretends).
 */
import { prisma } from '../lib/prisma.js';
import { env } from '../config/env.js';
import { BadRequestError } from '../lib/errors.js';

export interface PushSubscriptionInput {
  endpoint: string;
  p256dh?: string;
  auth?: string;
  userAgent?: string;
}

function isValidEndpoint(endpoint: string): boolean {
  if (typeof endpoint !== 'string' || endpoint.length > 2000) return false;
  try {
    const url = new URL(endpoint);
    return url.protocol === 'https:' && endpoint.length >= 20;
  } catch {
    return false;
  }
}

export async function savePushSubscription(input: PushSubscriptionInput) {
  if (!isValidEndpoint(input.endpoint)) {
    throw new BadRequestError('Invalid push endpoint');
  }
  return prisma.pushSubscription.upsert({
    where: { endpoint: input.endpoint },
    update: {
      p256dh: input.p256dh?.slice(0, 500),
      auth: input.auth?.slice(0, 500),
      userAgent: input.userAgent?.slice(0, 300),
    },
    create: {
      endpoint: input.endpoint,
      p256dh: input.p256dh?.slice(0, 500),
      auth: input.auth?.slice(0, 500),
      userAgent: input.userAgent?.slice(0, 300),
    },
  });
}

export async function removePushSubscription(endpoint: string): Promise<boolean> {
  if (!isValidEndpoint(endpoint)) return false;
  const res = await prisma.pushSubscription.deleteMany({ where: { endpoint } });
  return res.count > 0;
}

export async function countPushSubscriptions(): Promise<number> {
  return prisma.pushSubscription.count();
}

export function pushSenderStatus(): { configured: boolean; provider: string } {
  return {
    configured: Boolean(env.vapidPublicKey),
    provider: env.vapidPublicKey ? 'vapid' : 'none',
  };
}

export interface PushNotifyResult {
  queued: number;
  delivered: boolean;
  note: string;
}

/**
 * Records the intent to notify push subscribers about an alert. Delivery
 * itself is a no-op until the sender worker lands — the returned note always
 * says so explicitly.
 */
export async function notifyPushSubscribers(_alertId: string): Promise<PushNotifyResult> {
  const queued = await countPushSubscriptions().catch(() => 0);
  if (!env.vapidPublicKey) {
    return { queued, delivered: false, note: 'VAPID keys not configured — subscriptions stored only' };
  }
  return { queued, delivered: false, note: 'push sender worker not deployed — subscriptions stored only' };
}
