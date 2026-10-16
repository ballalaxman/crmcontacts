import { ApiError } from '../api/http-client';

/** Open/Closed lookup: a new error code is one more line here. */
export const errorMessages: Record<string, string> = {
  NETWORK_ERROR: 'Cannot reach the server. Check your connection and try again.',
  TIMEOUT: 'The server is taking too long to answer. Please retry.',
  VALIDATION_ERROR: 'Please fix the highlighted fields.',
  EMAIL_TAKEN: 'Another contact already uses this email.',
  VERSION_CONFLICT: 'Someone else changed this contact.',
  NOT_FOUND: 'Contact not found.',
  RATE_LIMITED: 'Too many requests — slow down a moment.',
  INTERNAL_ERROR: 'Something went wrong on our side.',
  INVALID_CURSOR: 'That page is no longer valid. Go back to the first page.',
};

export const messageFor = (code: string, fallback = 'Unexpected error') => errorMessages[code] ?? fallback;

/** A user-facing message for anything a query or mutation can throw. */
export const describeError = (e: unknown) => (e instanceof ApiError ? messageFor(e.code, e.message) : 'Unexpected error');
