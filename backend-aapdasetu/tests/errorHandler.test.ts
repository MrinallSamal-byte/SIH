import { describe, it, expect } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { notFoundHandler } from '../src/middleware/errorHandler.js';

describe('notFoundHandler log injection protection', () => {
  it('strips newlines from originalUrl and method in error message', () => {
    const req = {
      method: 'GET\r\nHeader: injected',
      originalUrl: '/test\r\n[CRITICAL] Fake log entry',
    } as unknown as Request;

    const res = {} as Response;

    let capturedError: Error & { status?: number } | undefined;
    const next: NextFunction = (err?: unknown) => {
      capturedError = err as Error & { status?: number };
    };

    notFoundHandler(req, res, next);

    expect(capturedError).toBeDefined();
    expect(capturedError?.status).toBe(404);
    expect(capturedError?.message).toBe('Route not found: GETHeader: injected /test[CRITICAL] Fake log entry');
    expect(capturedError?.message).not.toContain('\r');
    expect(capturedError?.message).not.toContain('\n');
  });
});
