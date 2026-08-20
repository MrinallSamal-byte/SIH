/** Central error handler + 404 handler. */
import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
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
    details = err.errors;
  } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    status = 400;
    code = 'DB_ERROR';
    message = 'Database request failed';
    if (err.code === 'P2002') {
      status = 409;
      code = 'DUPLICATE';
      message = 'A record with this value already exists';
    } else if (err.code === 'P2025') {
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

  if (status >= 500) {
    logger.error(`${req.method} ${req.originalUrl} -> ${status}`, {
      code,
      message: err.message,
      stack: err.stack,
    });
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