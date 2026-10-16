import type { RequestHandler } from 'express';
import type { ZodTypeAny } from 'zod';
import { ValidationError } from '../../domain/errors.js';

type Schemas = Partial<Record<'params' | 'query' | 'body', ZodTypeAny>>;

/** Validated input goes to res.locals.input (Express 5's req.query is read-only). */
export const validate = (schemas: Schemas): RequestHandler => (req, res, next) => {
  const input: Record<string, unknown> = {};
  for (const key of ['params', 'query', 'body'] as const) {
    const schema = schemas[key];
    if (!schema) continue;
    const parsed = schema.safeParse(req[key] ?? {});
    if (!parsed.success) {
      throw new ValidationError('Invalid request', parsed.error.flatten());
    }
    input[key] = parsed.data;
  }
  res.locals.input = input;
  next();
};
