/** Application error with HTTP status code. */
export class HttpError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, message: string, code = 'ERROR') {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
  }
}

export class BadRequestError extends HttpError {
  constructor(message: string, code = 'BAD_REQUEST') {
    super(400, message, code);
  }
}

export class UnauthorizedError extends HttpError {
  constructor(message = 'Unauthorized') {
    super(401, message, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends HttpError {
  constructor(message = 'Forbidden') {
    super(403, message, 'FORBIDDEN');
  }
}

export class NotFoundError extends HttpError {
  constructor(message = 'Not found') {
    super(404, message, 'NOT_FOUND');
  }
}

export class ConflictError extends HttpError {
  constructor(message: string, code = 'CONFLICT') {
    super(409, message, code);
  }
}

export class UnprocessableEntityError extends HttpError {
  constructor(message: string, code = 'UNPROCESSABLE_ENTITY') {
    super(422, message, code);
  }
}

export class ServiceUnavailableError extends HttpError {
  constructor(message = 'Service unavailable') {
    super(503, message, 'SERVICE_UNAVAILABLE');
  }
}

export function isHttpError(err: unknown): err is HttpError {
  return err instanceof HttpError;
}