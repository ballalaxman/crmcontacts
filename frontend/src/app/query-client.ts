import { QueryClient, type QueryClientConfig } from '@tanstack/react-query';
import { ApiError } from '../api/http-client';

/** Extra attempts after the first failure, for errors that might succeed on a second try. */
export const MAX_RETRIES = 2;

/**
 * Retry policy for queries:
 * - never for 4xx: bad input, not found, conflict and rate limiting won't change by asking again;
 * - up to MAX_RETRIES for network failures, timeouts and 5xx, which are often transient.
 */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (!(error instanceof ApiError)) return false;
  if (error.isClientError) return false;
  return failureCount < MAX_RETRIES;
}

/** 1s, 2s, 4s… capped at 8s. */
export const retryDelay = (attempt: number) => Math.min(1000 * 2 ** attempt, 8000);

export function createQueryClient(overrides: QueryClientConfig['defaultOptions'] = {}) {
  return new QueryClient({
    defaultOptions: {
      ...overrides,
      queries: { retry: shouldRetry, retryDelay, staleTime: 10_000, ...overrides.queries },
      // Mutations are never retried automatically: a retried PATCH could apply twice or hide a conflict.
      mutations: { retry: false, ...overrides.mutations },
    },
  });
}
