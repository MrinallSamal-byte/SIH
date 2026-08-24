/**
 * Damage Assessment ML service client (FastAPI).
 * Isolated behind this interface so the inference implementation can change
 * without touching the rest of the backend.
 */
import { env } from '../config/env.js';
import { ServiceUnavailableError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';

export type DamageClassification =
  | 'MINOR_DAMAGE'
  | 'MAJOR_STRUCTURAL_DAMAGE'
  | 'FULLY_DESTROYED';

export interface DamagePrediction {
  classification: DamageClassification;
  confidence: number;
  damageScore?: number;
  huggingFaceModel?: string;
}

export interface DamagePredictRequest {
  imageBase64: string;
  mimeType?: string;
  metadata?: {
    reportedLatitude?: number;
    reportedLongitude?: number;
    exifLatitude?: number;
    exifLongitude?: number;
    imageHash?: string;
  };
}

export class DamageMlClient {
  constructor(
    private readonly baseUrl: string = env.damageMlBaseUrl,
    private readonly timeoutMs: number = env.damageMlTimeoutMs,
  ) {}

  async health(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/health`, { signal: AbortSignal.timeout(5000) });
      return res.ok;
    } catch {
      return false;
    }
  }

  async predict(request: DamagePredictRequest): Promise<DamagePrediction> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await fetch(`${this.baseUrl}/api/v1/damage-assessment/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Damage ML service HTTP ${res.status}: ${body.slice(0, 300)}`);
      }

      const data = (await res.json()) as DamagePrediction;
      if (!isValidPrediction(data)) {
        throw new Error('Damage ML service returned an invalid prediction payload');
      }
      return data;
    } catch (err) {
      logger.error('Damage ML predict failed', { error: (err as Error).message });
      throw new ServiceUnavailableError('Damage assessment ML service is unavailable');
    } finally {
      clearTimeout(timer);
    }
  }
}

function isValidPrediction(p: unknown): p is DamagePrediction {
  if (typeof p !== 'object' || p === null) return false;
  const obj = p as Record<string, unknown>;
  const validClass = ['MINOR_DAMAGE', 'MAJOR_STRUCTURAL_DAMAGE', 'FULLY_DESTROYED'].includes(
    String(obj.classification),
  );
  return validClass && typeof obj.confidence === 'number';
}

export const damageMlClient = new DamageMlClient();