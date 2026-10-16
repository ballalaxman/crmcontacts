// Mirrors the form-related rules in backend/src/contracts/schemas.ts. Keep in sync.
import { z } from 'zod';
import { LIMITS } from './api-types';

export const tagSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9][a-z0-9-]{0,29}$/, `Tag must be 1–${LIMITS.tagMax} chars: letters, digits, hyphen`);

export const phoneSchema = z
  .string()
  .trim()
  .max(LIMITS.phoneMax)
  .refine((v) => {
    const digits = v.replace(/\D/g, '');
    return digits.length >= 7 && digits.length <= 15 && /^[\d\s()+\-.]+$/.test(v);
  }, 'Invalid phone number');

const name = z.string().trim().min(1, 'Required').max(LIMITS.nameMax);

/** Form values use '' for "empty"; the page converts '' to null before sending the PATCH. */
export const contactFormSchema = z.object({
  firstName: name,
  lastName: name,
  email: z.union([z.literal(''), z.string().trim().toLowerCase().email('Invalid email').max(LIMITS.emailMax)]),
  phone: z.union([z.literal(''), phoneSchema]),
  company: z.string().trim().max(LIMITS.companyMax),
});
export type ContactFormValues = z.infer<typeof contactFormSchema>;
