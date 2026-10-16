import { z } from 'zod';
import { LIMITS } from './constants.js';

export const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

export const tagSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9][a-z0-9-]{0,29}$/, 'Tag must be 1–30 chars: letters, digits, hyphen');

const nameSchema = z.string().trim().min(1, 'Required').max(100);

export const phoneSchema = z
  .string()
  .trim()
  .max(30)
  .refine((v) => {
    const digits = v.replace(/\D/g, '');
    return digits.length >= 7 && digits.length <= 15 && /^[\d\s()+\-.]+$/.test(v);
  }, 'Invalid phone number');

export const updateContactSchema = z
  .object({
    version: z.number().int().nonnegative(),
    firstName: nameSchema.optional(),
    lastName: nameSchema.optional(),
    email: z.string().trim().toLowerCase().email('Invalid email').max(254).nullable().optional(),
    phone: phoneSchema.nullable().optional(),
    company: z.string().trim().max(150).nullable().optional(),
  })
  .strict()
  .refine((o) => Object.keys(o).some((k) => k !== 'version'), 'No fields to update');
export type UpdateContactInput = z.infer<typeof updateContactSchema>;

/** `YYYY-MM-DD` with no time part: `createdTo` of such a value means "through the end of that day". */
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

const createdFromSchema = z.coerce.date().optional();
const createdToSchema = z
  .string()
  .optional()
  .transform((s, ctx) => {
    if (!s) return undefined;
    const d = new Date(DATE_ONLY.test(s) ? `${s}T23:59:59.999Z` : s);
    if (Number.isNaN(d.getTime())) {
      ctx.addIssue({ code: z.ZodIssueCode.invalid_date, message: 'Invalid date' });
      return z.NEVER;
    }
    return d;
  });

export const listContactsQuerySchema = z.object({
  q: z.string().trim().max(LIMITS.searchMax).optional(),
  tags: z
    .string()
    .optional()
    .transform((s) => (s ? s.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean) : [])),
  tagMode: z.enum(['any', 'all']).default('any'),
  company: z.string().trim().max(150).optional(),
  createdFrom: createdFromSchema,
  createdTo: createdToSchema,
  sortBy: z.enum(['name', 'createdAt']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
  limit: z.coerce.number().int().min(1).max(LIMITS.pageSizeMax).default(25),
  cursor: z.string().max(500).optional(),
});
export type ListContactsQuery = z.infer<typeof listContactsQuerySchema>;

export const contactIdParamsSchema = z.object({ id: objectIdSchema });
export const contactTagParamsSchema = z.object({ id: objectIdSchema, tag: tagSchema });
export const addTagBodySchema = z.object({ tag: tagSchema }).strict();

export const bulkTagBodySchema = z
  .object({
    contactIds: z.array(objectIdSchema).min(1).max(LIMITS.bulkMax),
    tag: tagSchema,
  })
  .strict();

export const activitiesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(LIMITS.activitiesMax).default(20),
});
