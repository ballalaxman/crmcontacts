// Mirrors backend/src/contracts (constants.ts, dto.ts and the enums in schemas.ts). Keep in sync:
// the backend is the source of truth and validates every request regardless of what this file says.

export const ACTIVITY_TYPES = ['CONTACT_UPDATED', 'TAG_ADDED', 'TAG_REMOVED'] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

/** Codes the API can return in { error: { code } }. */
export const SERVER_ERROR_CODES = [
  'VALIDATION_ERROR', 'INVALID_JSON', 'INVALID_CURSOR', 'NOT_FOUND',
  'EMAIL_TAKEN', 'VERSION_CONFLICT', 'RATE_LIMITED', 'INTERNAL_ERROR',
] as const;
export type ServerErrorCode = (typeof SERVER_ERROR_CODES)[number];
/** Client-side only: the request never got a usable answer. */
export type ClientErrorCode = 'NETWORK_ERROR' | 'TIMEOUT' | 'UNKNOWN';
export type ErrorCode = ServerErrorCode | ClientErrorCode;

/** Profile fields a PATCH may change (backend: domain/contact.ts EDITABLE_FIELDS). */
export const EDITABLE_FIELDS = ['firstName', 'lastName', 'email', 'phone', 'company'] as const;
export type EditableField = (typeof EDITABLE_FIELDS)[number];
export const isEditableField = (value: string): value is EditableField =>
  (EDITABLE_FIELDS as readonly string[]).includes(value);

/** List query enums (backend: listContactsQuerySchema). */
export const SORT_FIELDS = ['name', 'createdAt'] as const;
export type SortBy = (typeof SORT_FIELDS)[number];
export const SORT_ORDERS = ['asc', 'desc'] as const;
export type SortOrder = (typeof SORT_ORDERS)[number];
export const TAG_MODES = ['any', 'all'] as const;
export type TagMode = (typeof TAG_MODES)[number];

export interface ContactDto {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  company?: string;
  tags: string[];
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface FieldChange { field: EditableField; from: string | null; to: string | null }

export interface ActivityDto {
  id: string;
  contactId: string;
  type: ActivityType;
  changes?: FieldChange[];
  tag?: string;
  actor?: string;
  createdAt: string;
}

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
  total?: { count: number; capped: boolean };
}

export interface BulkTagResult { requested: number; updated: number; alreadyTagged: number; notFound: number; }

export interface ApiErrorBody { error: { code: ErrorCode; message: string; details?: unknown } }

/** `details` of a VALIDATION_ERROR: Zod's flatten() output. */
export interface ValidationErrorDetails {
  formErrors: string[];
  fieldErrors: Record<string, string[] | undefined>;
}

/** PATCH body: version + only the changed fields; null clears an optional field. */
export type UpdateContactInput = { version: number } & Partial<Record<EditableField, string | null>>;

/** Request limits (backend: LIMITS in constants.ts plus the max lengths in schemas.ts). */
export const LIMITS = {
  pageSizeDefault: 25,
  pageSizeMax: 100,
  bulkMax: 500,
  activitiesMax: 100,
  searchMax: 100,
  tagMax: 30,
  nameMax: 100,
  emailMax: 254,
  phoneMax: 30,
  companyMax: 150,
} as const;
