import type { ErrorCode } from '../contracts/api-types';
import { isRecord } from '../lib/guards';

export type FieldErrors = Record<string, string[]>;

/** Pulls `details.fieldErrors` (Zod's flatten() shape) out of an error body, keeping only string messages. */
function parseFieldErrors(details: unknown): FieldErrors {
  if (!isRecord(details) || !isRecord(details.fieldErrors)) return {};
  const out: FieldErrors = {};
  for (const [field, messages] of Object.entries(details.fieldErrors)) {
    if (Array.isArray(messages)) {
      const strings = messages.filter((m): m is string => typeof m === 'string');
      if (strings.length) out[field] = strings;
    }
  }
  return out;
}

/**
 * The one error type the UI handles. Every failure (HTTP error, network, timeout) becomes an ApiError,
 * so components read `code`, `status` and `fieldErrors` instead of raw responses.
 */
export class ApiError extends Error {
  readonly fieldErrors: FieldErrors;

  constructor(
    readonly status: number,
    readonly code: ErrorCode | (string & {}),
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
    this.fieldErrors = parseFieldErrors(details);
  }

  /** No usable answer at all: offline, connection refused, or timed out. */
  get isNetworkError() { return this.status === 0; }
  get isClientError() { return this.status >= 400 && this.status < 500; }
  get isServerError() { return this.status >= 500; }
}

export const isApiError = (e: unknown, code?: ErrorCode): e is ApiError =>
  e instanceof ApiError && (code === undefined || e.code === code);

export interface RequestOptions {
  /** Cancels the request (TanStack Query passes one, so a newer query aborts the stale one). */
  signal?: AbortSignal;
}

export interface HttpClient {
  get<T>(path: string, options?: RequestOptions): Promise<T>;
  post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T>;
  patch<T>(path: string, body: unknown, options?: RequestOptions): Promise<T>;
  del<T>(path: string, options?: RequestOptions): Promise<T>;
}

export interface HttpClientOptions {
  /** Give up after this long and report TIMEOUT. */
  timeoutMs?: number;
}

export const DEFAULT_TIMEOUT_MS = 30_000;

/** Transport only: JSON in, JSON out, every failure turned into an ApiError. */
export function createHttpClient(
  baseUrl: string,
  getActor: () => string | undefined,
  { timeoutMs = DEFAULT_TIMEOUT_MS }: HttpClientOptions = {},
): HttpClient {
  async function request<T>(method: string, path: string, body: unknown, { signal }: RequestOptions = {}): Promise<T> {
    // One controller aborts the fetch for either reason: the caller cancelled, or the timeout fired.
    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);
    const forwardAbort = () => controller.abort();
    if (signal?.aborted) controller.abort();
    else signal?.addEventListener('abort', forwardAbort, { once: true });

    try {
      let res: Response;
      try {
        const actor = getActor();
        res = await fetch(`${baseUrl}${path}`, {
          method,
          headers: {
            ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
            ...(actor ? { 'X-Actor': actor } : {}),
          },
          body: body === undefined ? undefined : JSON.stringify(body),
          signal: controller.signal,
        });
      } catch (e) {
        // Cancelled by the caller: rethrow as-is so TanStack Query treats it as a cancellation, not an error.
        if (signal?.aborted) throw e;
        if (timedOut) {
          throw new ApiError(0, 'TIMEOUT', `The server didn't answer within ${Math.round(timeoutMs / 1000)} seconds.`);
        }
        throw new ApiError(0, 'NETWORK_ERROR', 'Cannot reach the server. Check your connection and try again.');
      }

      const json: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        // Read the { error: { code, message, details } } body defensively: a proxy may answer with HTML.
        const err = isRecord(json) && isRecord(json.error) ? json.error : undefined;
        const code = typeof err?.code === 'string' ? err.code : 'UNKNOWN';
        const message = typeof err?.message === 'string' ? err.message : res.statusText;
        throw new ApiError(res.status, code, message, err?.details);
      }
      return json as T;
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', forwardAbort);
    }
  }

  return {
    get: (p, o) => request('GET', p, undefined, o),
    post: (p, b, o) => request('POST', p, b, o),
    patch: (p, b, o) => request('PATCH', p, b, o),
    del: (p, o) => request('DELETE', p, undefined, o),
  };
}
