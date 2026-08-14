/** Async route handler wrapper to forward rejected promises to the error middleware. */
import type { RequestHandler } from 'express';

export function asyncHandler(
  fn: (req: Parameters<RequestHandler>[0], res: Parameters<RequestHandler>[1], next: Parameters<RequestHandler>[2]) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}