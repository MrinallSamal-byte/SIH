/** Zod validation middleware. */
import type { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { HttpError } from '../lib/errors.js';

export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        next(new HttpError(400, 'Validation failed', 'VALIDATION_ERROR'));
      } else {
        next(err);
      }
    }
  };
}

export function validateQuery<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      (req as Request & { validatedQuery: T }).validatedQuery = schema.parse(req.query);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        next(new HttpError(400, 'Validation failed', 'VALIDATION_ERROR'));
      } else {
        next(err);
      }
    }
  };
}

export function validateParams<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      (req as Request & { validatedParams: T }).validatedParams = schema.parse(req.params);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        next(new HttpError(400, 'Validation failed', 'VALIDATION_ERROR'));
      } else {
        next(err);
      }
    }
  };
}