import { describe, it, expect, vi } from 'vitest';
import type { Request, Response } from 'express';
import { errorHandler } from '../src/middleware/errorHandler.js';
import { UnauthorizedError } from '../src/lib/errors.js';

describe('errorHandler middleware security', () => {
  const mockReq = {
    method: 'GET',
    originalUrl: '/test',
  } as Request;

  const createMockRes = () => {
    const res = {} as Response;
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res;
  };

  it('sanitizes unexpected internal 500 errors and hides sensitive error details', () => {
    const res = createMockRes();
    const next = vi.fn();
    const sensitiveErr = new Error('Sensitive database connection string: postgres://user:pass@localhost:5432/db');

    errorHandler(sensitiveErr, mockReq, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
        }),
      }),
    );
  });

  it('sanitizes non-HttpError objects with 4xx status codes', () => {
    const res = createMockRes();
    const next = vi.fn();
    const customErr = new Error('Sensitive query error detail');
    (customErr as Error & { status: number }).status = 400;

    errorHandler(customErr, mockReq, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'HTTP_ERROR',
        message: 'Request failed',
      },
    });
  });

  it('preserves user-facing message for explicitly handled HttpErrors', () => {
    const res = createMockRes();
    const next = vi.fn();
    const authErr = new UnauthorizedError('Invalid authorization token');

    errorHandler(authErr, mockReq, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid authorization token',
      },
    });
  });
});
