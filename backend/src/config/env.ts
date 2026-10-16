import 'dotenv/config';
import { z } from 'zod';

/** `z.coerce.boolean()` would turn the string "false" into true, so parse the text explicitly. */
const booleanFromText = (fallback: boolean) =>
  z
    .enum(['true', 'false', '1', '0'])
    .optional()
    .transform((v) => (v === undefined ? fallback : v === 'true' || v === '1'));

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  MONGODB_URI: z.string().min(1),
  CORS_ORIGINS: z.string().default('http://localhost:5173'), // comma-separated
  SYNC_INDEXES_ON_BOOT: booleanFromText(true),
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),
});

export type Env = z.infer<typeof envSchema>;
export const loadEnv = (source: NodeJS.ProcessEnv = process.env): Env => envSchema.parse(source);
