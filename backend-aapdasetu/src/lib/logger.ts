/** Minimal structured logger with level filtering and field redaction. */

type Level = 'debug' | 'info' | 'warn' | 'error';

const LEVELS: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

const REDACTED_KEYS = new Set(['password', 'token', 'authorization', 'accesscode']);

function resolveMinLevel(): number {
  const configured = (process.env.LOG_LEVEL ?? '').trim().toLowerCase();
  const level: Level =
    configured === 'debug' || configured === 'info' || configured === 'warn' || configured === 'error'
      ? (configured as Level)
      : process.env.NODE_ENV === 'production'
        ? 'info'
        : 'debug';
  return LEVELS[level];
}

const MIN_LEVEL = resolveMinLevel();

function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((item) => redact(item));
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      out[key] = REDACTED_KEYS.has(key.toLowerCase()) ? '[REDACTED]' : redact(val);
    }
    return out;
  }
  return value;
}

function write(level: Level, message: string, meta?: unknown): void {
  if (LEVELS[level] < MIN_LEVEL) return;
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    message,
    ...(meta !== undefined ? { meta: redact(meta) } : {}),
  });
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

export const logger = {
  info: (message: string, meta?: unknown) => write('info', message, meta),
  warn: (message: string, meta?: unknown) => write('warn', message, meta),
  error: (message: string, meta?: unknown) => write('error', message, meta),
  debug: (message: string, meta?: unknown) => write('debug', message, meta),
};
