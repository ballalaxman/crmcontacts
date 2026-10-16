export const ACTIVITY_TYPES = ['CONTACT_UPDATED', 'TAG_ADDED', 'TAG_REMOVED'] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export const LIMITS = {
  pageSizeMax: 100,
  bulkMax: 500,
  activitiesMax: 100,
  searchMax: 100,
} as const;

export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_JSON: 'INVALID_JSON',
  INVALID_CURSOR: 'INVALID_CURSOR',
  NOT_FOUND: 'NOT_FOUND',
  EMAIL_TAKEN: 'EMAIL_TAKEN',
  VERSION_CONFLICT: 'VERSION_CONFLICT',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;
