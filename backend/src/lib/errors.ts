/**
 * AppError — an error carrying an HTTP status code.
 *
 * Services throw these for expected failures (validation, not-found) so the
 * central error handler can map them to the right status. Anything that's NOT
 * an AppError is treated as an unexpected 500.
 */

export class AppError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
  }
}
