import { describe, it, expect, vi } from 'vitest';
import type { Request, Response } from 'express';
import { errorHandler } from '../src/middleware/errorHandler.js';

describe('errorHandler', () => {
  it('sanitizes 500 error messages and hides sensitive internal error details', () => {
    const sensitiveErr = new Error('Database connection failed: secret_password_123');
    const req = { method: 'GET', originalUrl: '/api/v1/test' } as Request;

    let responseStatus = 0;
    let jsonPayload: any = null;

    const res = {
      status(code: number) {
        responseStatus = code;
        return this;
      },
      json(data: any) {
        jsonPayload = data;
        return this;
      },
    } as unknown as Response;

    const next = vi.fn();

    errorHandler(sensitiveErr, req, res, next);

    expect(responseStatus).toBe(500);
    expect(jsonPayload).toBeDefined();
    expect(jsonPayload.success).toBe(false);
    expect(jsonPayload.error.message).toBe('Internal server error');
    expect(jsonPayload.error.message).not.toContain('secret_password_123');
  });
});
