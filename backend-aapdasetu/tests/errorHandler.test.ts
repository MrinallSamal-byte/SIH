import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { errorHandler } from '../src/middleware/errorHandler.js';
import { HttpError } from '../src/lib/errors.js';

describe('errorHandler middleware security', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let jsonFn: ReturnType<typeof vi.fn>;
  let statusFn: ReturnType<typeof vi.fn>;
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    jsonFn = vi.fn();
    statusFn = vi.fn().mockReturnValue({ json: jsonFn });
    mockRequest = {
      method: 'GET',
      originalUrl: '/api/test',
    };
    mockResponse = {
      status: statusFn,
    };
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it('sanitizes non-Http 500 error messages in production', () => {
    process.env.NODE_ENV = 'production';
    const secretError = new Error('Database password failed at secret_db_host:5432');

    errorHandler(secretError, mockRequest as Request, mockResponse as Response, vi.fn() as NextFunction);

    expect(statusFn).toHaveBeenCalledWith(500);
    expect(jsonFn).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      },
    });
  });

  it('preserves HttpError messages for 500 status when intentionally thrown', () => {
    process.env.NODE_ENV = 'production';
    const httpError = new HttpError(503, 'Service unavailable', 'SERVICE_UNAVAILABLE');

    errorHandler(httpError, mockRequest as Request, mockResponse as Response, vi.fn() as NextFunction);

    expect(statusFn).toHaveBeenCalledWith(503);
    expect(jsonFn).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: 'Service unavailable',
      },
    });
  });

  it('includes stack traces only in non-production environments for status >= 500', () => {
    process.env.NODE_ENV = 'development';
    const testError = new Error('Something crashed internally');

    errorHandler(testError, mockRequest as Request, mockResponse as Response, vi.fn() as NextFunction);

    expect(statusFn).toHaveBeenCalledWith(500);
    expect(jsonFn).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
          stack: expect.any(String),
        }),
      }),
    );
  });
});
