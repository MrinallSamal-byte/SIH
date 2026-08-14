/** Minimal structured logger. */

type Level = 'info' | 'warn' | 'error' | 'debug';

function write(level: Level, message: string, meta?: unknown): void {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    message,
    ...(meta !== undefined ? { meta } : {}),
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