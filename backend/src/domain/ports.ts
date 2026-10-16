import type { ActivityType, ListContactsQuery } from '../contracts/index.js';
import type { Contact, ContactPatch, FieldChange } from './contact.js';

/** Opaque transaction handle; the domain never knows it's a Mongo session. */
export interface TxContext { readonly handle: unknown; }

export interface UnitOfWork {
  run<T>(work: (tx: TxContext) => Promise<T>): Promise<T>;
}

export interface PageResult<T> {
  items: T[];
  nextCursor: string | null;
  total?: { count: number; capped: boolean };
}

export interface ContactReader {
  findById(id: string, tx?: TxContext): Promise<Contact | null>;
  list(query: ListContactsQuery): Promise<PageResult<Contact>>;
  /** Of the given ids: which exist, and which of those lack the tag. */
  partitionByTag(ids: string[], tag: string, tx?: TxContext):
    Promise<{ existing: string[]; missingTag: string[] }>;
}

export interface ContactWriter {
  /** Applies patch only if version matches; returns null on mismatch/not found. Throws EmailTakenError. */
  updateIfVersionMatches(id: string, version: number, patch: ContactPatch, tx?: TxContext): Promise<Contact | null>;
  /** Returns null if contact not found. */
  addTag(id: string, tag: string, tx?: TxContext): Promise<{ contact: Contact; changed: boolean } | null>;
  removeTag(id: string, tag: string, tx?: TxContext): Promise<{ contact: Contact; changed: boolean } | null>;
  addTagToMany(ids: string[], tag: string, tx?: TxContext): Promise<number>;
}

export interface NewActivity {
  contactId: string;
  type: ActivityType;
  changes?: FieldChange[];
  tag?: string;
  actor?: string;
}

export interface Activity extends NewActivity { id: string; createdAt: Date; }

export interface ActivityWriter { record(entries: NewActivity[], tx?: TxContext): Promise<void>; }
export interface ActivityReader { listForContact(contactId: string, limit: number): Promise<Activity[]>; }

export interface TagRegistry {
  ensure(tag: string, tx?: TxContext): Promise<void>;
  list(): Promise<string[]>;
}
