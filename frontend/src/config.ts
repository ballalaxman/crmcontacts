import { DEFAULT_TIMEOUT_MS } from './api/http-client';

const positiveNumber = (value: string | undefined, fallback: number) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

/** Runtime settings from .env (VITE_* variables are baked in at build time). */
export const config = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api',
  apiTimeoutMs: positiveNumber(import.meta.env.VITE_API_TIMEOUT_MS, DEFAULT_TIMEOUT_MS),
} as const;
