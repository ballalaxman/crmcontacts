import type { Contact } from '../../domain/contact.js';

/** The fields of a lean contact document that the mapper reads. */
export interface ContactRecord {
  _id: unknown;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  tags?: string[] | null;
  version?: number | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export const toContact = (d: ContactRecord): Contact => ({
  id: String(d._id),
  firstName: d.firstName,
  lastName: d.lastName,
  email: d.email ?? undefined,
  phone: d.phone ?? undefined,
  company: d.company ?? undefined,
  tags: d.tags ?? [],
  version: d.version ?? 0,
  createdAt: d.createdAt as Date,
  updatedAt: d.updatedAt as Date,
});

/** True for an E11000 error on the given index key (e.g. "email"). */
export function isDuplicateKey(e: unknown, key: string): boolean {
  if (typeof e !== 'object' || e === null) return false;
  const err = e as { code?: unknown; keyPattern?: Record<string, unknown>; message?: string };
  if (err.code !== 11000) return false;
  if (err.keyPattern) return key in err.keyPattern;
  return typeof err.message === 'string' && err.message.includes(`${key}_`);
}
