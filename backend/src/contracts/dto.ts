import type { ActivityType } from './constants.js';

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

export interface ActivityDto {
  id: string;
  contactId: string;
  type: ActivityType;
  changes?: { field: string; from: unknown; to: unknown }[];
  tag?: string;
  actor?: string;
  createdAt: string;
}

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
  total?: { count: number; capped: boolean };
}

export interface BulkTagResult {
  requested: number;
  updated: number;
  alreadyTagged: number;
  notFound: number;
}

export interface ApiErrorBody {
  error: { code: string; message: string; details?: unknown };
}
