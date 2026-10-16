import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { buildContainer } from '../src/container.js';
import { ContactModel } from '../src/infrastructure/mongo/models/contact.model.js';
import { deriveSearchFields } from '../src/domain/contact.js';

/** A fresh app on the shared test connection, with the rate limiter out of the way. */
export const makeApp = () =>
  createApp(buildContainer(mongoose.connection), {
    corsOrigins: ['http://localhost:5173'],
    logging: false,
    rateLimitPerMinute: 1_000_000,
  });

export interface SeedContact {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  company?: string;
  tags?: string[];
  createdAt?: Date;
}

/** A contact document shaped like the real ones (derived fields included, absent values omitted). */
export function contactDoc(over: SeedContact = {}) {
  const { tags = [], createdAt = new Date(), ...rest } = over;
  const base = { firstName: 'John', lastName: 'Smith', ...rest };
  const derived = Object.fromEntries(Object.entries(deriveSearchFields(base)).filter(([, v]) => v !== null));
  return { ...base, ...derived, tags, version: 0, createdAt, updatedAt: createdAt };
}

/** Inserts natively (so `createdAt` is kept as given) and returns the new id. */
export async function makeContact(over: SeedContact = {}): Promise<string> {
  const res = await ContactModel.collection.insertOne(contactDoc(over));
  return String(res.insertedId);
}

export async function makeContacts(list: SeedContact[]): Promise<string[]> {
  const res = await ContactModel.collection.insertMany(list.map((c) => contactDoc(c)));
  return Object.values(res.insertedIds).map(String);
}

/** A well-formed ObjectId that no document has. */
export const MISSING_ID = '64b7f0000000000000000000';
