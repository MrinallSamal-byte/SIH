/** Zod validation middleware. */
import type { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { HttpError } from '../lib/errors.js';

type Validator = (req: Request, _res: Response, next: NextFunction) => void;

function makeValidator<T>(parse: (req: Request) => T, assign: (req: Request, value: T) => void): Validator {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      assign(req, parse(req));
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

export function validateBody<T>(schema: ZodSchema<T>) {
  return makeValidator((req) => schema.parse(req.body), (req, value) => { req.body = value; });
}

export function validateQuery<T>(schema: ZodSchema<T>) {
  return makeValidator(
    (req) => schema.parse(req.query),
    (req, value) => { (req as Request & { validatedQuery: T }).validatedQuery = value; },
  );
}

export function validateParams<T>(schema: ZodSchema<T>) {
  return makeValidator(
    (req) => schema.parse(req.params),
    (req, value) => { (req as Request & { validatedParams: T }).validatedParams = value; },
  );
}