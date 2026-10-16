export abstract class AppError extends Error {
  abstract readonly status: number;
  abstract readonly code: string;
  constructor(message: string, readonly details?: unknown) {
    super(message);
    this.name = new.target.name;
  }
}

export class ValidationError extends AppError {
  readonly status = 400;
  readonly code = 'VALIDATION_ERROR';
}
export class InvalidCursorError extends AppError {
  readonly status = 400;
  readonly code = 'INVALID_CURSOR';
  constructor() { super('Invalid pagination cursor'); }
}
export class NotFoundError extends AppError {
  readonly status = 404;
  readonly code = 'NOT_FOUND';
  constructor(entity = 'Resource') { super(`${entity} not found`); }
}
export class EmailTakenError extends AppError {
  readonly status = 409;
  readonly code = 'EMAIL_TAKEN';
  constructor() { super('Another contact already uses this email', { field: 'email' }); }
}
export class VersionConflictError extends AppError {
  readonly status = 409;
  readonly code = 'VERSION_CONFLICT';
  constructor(current: unknown) {
    super('Contact was modified by someone else', { current });
  }
}
