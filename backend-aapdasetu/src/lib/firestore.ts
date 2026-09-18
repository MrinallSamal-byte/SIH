import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import fs from 'node:fs';
import path from 'node:path';

let app: App;
let db: Firestore;

export const COLLECTIONS = {
  AGENCIES: 'agencies',
  VOLUNTEERS: 'volunteers',
  SHELTERS: 'shelters',
  FACILITIES: 'facilities',
  RESOURCES: 'resources',
  REPORTS: 'reports',
  VERIFICATION_LOGS: 'verification_logs',
  DISPATCHES: 'dispatches',
  ALERTS: 'alerts',
  PUSH_SUBSCRIPTIONS: 'push_subscriptions',
  CHECKINS: 'checkins',
  DAMAGE_ASSESSMENTS: 'damage_assessments',
  MISSING_PERSONS: 'missing_persons',
  MISSING_PERSON_MATCHES: 'missing_person_matches',
  AUDIT_LOGS: 'audit_logs',
  SYSTEM_CONFIGS: 'system_configs',
  OFFLINE_QUEUES: 'offline_queues',
  IDEMPOTENCY_KEYS: 'idempotency_keys',
  ADMIN_USERS: 'admin_users',
} as const;

export function getFirestoreDb(): Firestore {
  if (db) return db;

  if (getApps().length === 0) {
    const projectId = process.env.FIREBASE_PROJECT_ID || 'sihapdasetu';
    const localServiceAccount = path.resolve(process.cwd(), 'serviceAccountKey.json');
    const customServiceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

    if (customServiceAccountPath && fs.existsSync(customServiceAccountPath)) {
      app = initializeApp({
        credential: cert(JSON.parse(fs.readFileSync(customServiceAccountPath, 'utf8'))),
        projectId,
      });
    } else if (fs.existsSync(localServiceAccount)) {
      app = initializeApp({
        credential: cert(JSON.parse(fs.readFileSync(localServiceAccount, 'utf8'))),
        projectId,
      });
    } else if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      // Inlined or base64 service account JSON (common for Vercel/cloud env vars)
      let raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY.trim();
      if (raw.startsWith('{')) {
        app = initializeApp({
          credential: cert(JSON.parse(raw)),
          projectId,
        });
      } else {
        const decoded = Buffer.from(raw, 'base64').toString('utf8');
        app = initializeApp({
          credential: cert(JSON.parse(decoded)),
          projectId,
        });
      }
    } else if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      app = initializeApp({
        credential: cert({
          projectId,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
        projectId,
      });
    } else {
      // Fallback: default project config (works in Google Cloud environments with ADC)
      app = initializeApp({
        projectId,
      });
    }
  } else {
    app = getApps()[0]!;
  }

  db = getFirestore(app);
  db.settings({ ignoreUndefinedProperties: true });
  return db;
}

export { db };
