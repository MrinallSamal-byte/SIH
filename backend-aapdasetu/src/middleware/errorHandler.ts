/** Central error handler + 404 handler. */
import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { isHttpError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';

interface ErrorWithDetails extends Error {
  details?: unknown;
}

export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  const err = new Error(`Route not found: ${req.method} ${req.originalUrl}`) as ErrorWithDetails;
  (err as Error & { status: number }).status = 404;
  next(err);
}

export function errorHandler(
  err: ErrorWithDetails,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  let status = 500;
  let message = 'Internal server error';
  let code = 'INTERNAL_ERROR';
  let details: unknown;

  if (isHttpError(err)) {
    status = err.status;
    message = err.message;
    code = err.code;
  } else if (err instanceof ZodError) {
    status = 400;
    message = 'Validation failed';
    code = 'VALIDATION_ERROR';
    details = err.errors.map((issue) => ({ path: issue.path.join('.'), message: issue.message }));
  } else if (typeof (err as { code?: unknown }).code === 'string' && String((err as { code?: unknown }).code).startsWith('P')) {
    status = 400;
    code = 'DB_ERROR';
    message = 'Database request failed';
    const prismaCode = String((err as { code?: unknown }).code);
    if (prismaCode === 'P2002') {
      status = 409;
      code = 'DUPLICATE';
      message = 'A record with this value already exists';
    } else if (prismaCode === 'P2025') {
      status = 404;
      code = 'NOT_FOUND';
      message = 'Record not found';
    }
  } else {
    const statusMaybe = (err as Error & { status?: number }).status;
    if (statusMaybe && statusMaybe >= 400 && statusMaybe < 500) {
      status = statusMaybe;
      message = err.message;
      code = 'HTTP_ERROR';
    }
  }

  // Security: Prevent information disclosure (CWE-209) on internal server errors.
  // Ensure status >= 500 error messages returned to clients do not leak sensitive implementation details.
  if (status >= 500) {
    logger.error(`${req.method} ${req.originalUrl} -> ${status}`, {
      code,
      message: err.message,
      stack: err.stack,
    });

    if (!isHttpError(err)) {
      message = 'Internal server error';
    }
  }

  res.status(status).json({
    success: false,
    error: {
      code,
      message,
      ...(details !== undefined ? { details } : {}),
      ...(process.env.NODE_ENV !== 'production' && status >= 500 ? { stack: err.stack } : {}),
    },
  });
}