/**
 * AppError — an operational error with an HTTP status code. Throw these from
 * services/controllers; the error middleware turns them into clean responses.
 */

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;
  details?: unknown;

  constructor(statusCode: number, message: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.details = details;
    Object.setPrototypeOf(this, AppError.prototype);
  }

  static badRequest(message = 'Bad request', details?: unknown) {
    return new AppError(400, message, details);
  }
  static unauthorized(message = 'Not authenticated') {
    return new AppError(401, message);
  }
  static forbidden(message = 'Not allowed') {
    return new AppError(403, message);
  }
  static notFound(message = 'Not found') {
    return new AppError(404, message);
  }
  static conflict(message = 'Already exists') {
    return new AppError(409, message);
  }
}
