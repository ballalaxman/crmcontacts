import { renderHook, act } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { createContactsApi, type ContactListParams } from '../features/contacts/api/contacts-api';
import { ApiError, createHttpClient, type HttpClient } from '../api/http-client';
import { contactFormSchema, phoneSchema, tagSchema } from '../contracts/validation';
import { useCursorPagination } from '../features/contacts/list/useCursorPagination';
import { describeError } from '../lib/error-messages';
import { formatRelative, formatTotal } from '../lib/format';
import { toFieldErrors } from '../features/contacts/detail/field-errors';
import { API, errorBody } from './msw-handlers';
import { server } from './server';

describe('createHttpClient', () => {
  const client = createHttpClient(API, () => 'User A');

  it('sends JSON and the X-Actor header', async () => {
    let seen: { actor: string | null; type: string | null; body: unknown } | undefined;
    server.use(
      http.patch(`${API}/x`, async ({ request }) => {
        seen = { actor: request.headers.get('x-actor'), type: request.headers.get('content-type'), body: await request.json() };
        return HttpResponse.json({ ok: true });
      }),
    );

    await expect(client.patch('/x', { a: 1 })).resolves.toEqual({ ok: true });
    expect(seen).toEqual({ actor: 'User A', type: 'application/json', body: { a: 1 } });
  });

  it('turns an error body into an ApiError with code and details', async () => {
    server.use(http.get(`${API}/x`, () => HttpResponse.json(errorBody('EMAIL_TAKEN', 'taken', { field: 'email' }), { status: 409 })));

    const error = await client.get('/x').catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 409, code: 'EMAIL_TAKEN', message: 'taken', details: { field: 'email' } });
  });

  it('reports a network failure as NETWORK_ERROR (status 0)', async () => {
    server.use(http.get(`${API}/x`, () => HttpResponse.error()));
    await expect(client.get('/x')).rejects.toMatchObject({ status: 0, code: 'NETWORK_ERROR' });
  });

  it('copes with a non-JSON error response', async () => {
    server.use(http.get(`${API}/x`, () => new HttpResponse('Bad gateway', { status: 502, statusText: 'Bad Gateway' })));
    await expect(client.get('/x')).rejects.toMatchObject({ status: 502, code: 'UNKNOWN' });
  });

  it('omits the actor header when none is set', async () => {
    let actor: string | null = 'unset';
    server.use(http.get(`${API}/x`, ({ request }) => { actor = request.headers.get('x-actor'); return HttpResponse.json({}); }));
    await createHttpClient(API, () => undefined).get('/x');
    expect(actor).toBeNull();
  });
});

describe('createContactsApi', () => {
  const calls: string[] = [];
  const fake: HttpClient = {
    get: async (p) => { calls.push(`GET ${p}`); return {} as never; },
    post: async (p, b) => { calls.push(`POST ${p} ${JSON.stringify(b)}`); return {} as never; },
    patch: async (p, b) => { calls.push(`PATCH ${p} ${JSON.stringify(b)}`); return {} as never; },
    del: async (p) => { calls.push(`DELETE ${p}`); return {} as never; },
  };
  const api = createContactsApi(fake); // a fake transport: the API layer is testable without any network

  const params: ContactListParams = { q: '', tags: [], tagMode: 'any', company: '', sortBy: 'createdAt', order: 'desc', limit: 25 };

  it('builds the list query string, leaving out empty values', async () => {
    await api.list(params, null);
    expect(calls.at(-1)).toBe('GET /contacts?tagMode=any&sortBy=createdAt&order=desc&limit=25');
  });

  it('joins tags and appends the cursor', async () => {
    await api.list({ ...params, q: 'john smi', tags: ['vip', 'lead'], createdFrom: '2026-01-01' }, 'abc');
    const query = new URLSearchParams(calls.at(-1)!.split('?')[1]);
    expect(Object.fromEntries(query)).toMatchObject({ q: 'john smi', tags: 'vip,lead', createdFrom: '2026-01-01', cursor: 'abc' });
  });

  it('maps the other calls onto the contract paths', async () => {
    await api.removeTag('c1', 'a b');
    await api.addTag('c1', 'vip');
    await api.bulkAddTag(['c1', 'c2'], 'vip');
    await api.activities('c1');
    expect(calls.slice(-4)).toEqual([
      'DELETE /contacts/c1/tags/a%20b',
      'POST /contacts/c1/tags {"tag":"vip"}',
      'POST /contacts/bulk/tags {"contactIds":["c1","c2"],"tag":"vip"}',
      'GET /contacts/c1/activities?limit=20',
    ]);
  });
});

describe('validation (mirror of the backend rules)', () => {
  it('normalizes and validates tags', () => {
    expect(tagSchema.parse('  VIP ')).toBe('vip');
    for (const bad of ['', 'has space', '-lead', 'a'.repeat(31), 'ünï']) expect(tagSchema.safeParse(bad).success, bad).toBe(false);
    expect(tagSchema.safeParse('a'.repeat(30)).success).toBe(true);
  });

  it('validates phone numbers', () => {
    for (const ok of ['+1 (555) 010-1234', '555-0100', '+44 20 7946 0958']) expect(phoneSchema.safeParse(ok).success, ok).toBe(true);
    for (const bad of ['123', 'call me', '+1 555 abc 1234', '1'.repeat(16)]) expect(phoneSchema.safeParse(bad).success, bad).toBe(false);
  });

  it('accepts empty optional fields but not empty names', () => {
    const base = { firstName: 'A', lastName: 'B', email: '', phone: '', company: '' };
    expect(contactFormSchema.safeParse(base).success).toBe(true);
    expect(contactFormSchema.safeParse({ ...base, firstName: '  ' }).success).toBe(false);
    expect(contactFormSchema.parse({ ...base, email: ' A@B.COM ' }).email).toBe('a@b.com');
  });
});

describe('useCursorPagination', () => {
  it('stacks cursors for Next and pops them for Previous', () => {
    const { result } = renderHook(() => useCursorPagination('k'));
    expect(result.current).toMatchObject({ cursor: null, pageNumber: 1, canPrev: false });

    act(() => result.current.next('c2'));
    act(() => result.current.next('c3'));
    expect(result.current).toMatchObject({ cursor: 'c3', pageNumber: 3, canPrev: true });

    act(() => result.current.prev());
    expect(result.current).toMatchObject({ cursor: 'c2', pageNumber: 2 });
    act(() => result.current.prev());
    act(() => result.current.prev()); // already at the start: stays put
    expect(result.current).toMatchObject({ cursor: null, pageNumber: 1 });
  });

  it('is already back on page one in the very render where the key changes (no stale cursor)', () => {
    const { result, rerender } = renderHook(({ key }) => useCursorPagination(key), { initialProps: { key: 'a' } });
    act(() => result.current.next('c2'));
    expect(result.current.cursor).toBe('c2');

    rerender({ key: 'b' });
    expect(result.current).toMatchObject({ cursor: null, pageNumber: 1 });

    act(() => result.current.next('c9'));
    expect(result.current.cursor).toBe('c9');
  });
});

describe('error helpers', () => {
  it('maps server field errors onto form fields', () => {
    const validation = new ApiError(400, 'VALIDATION_ERROR', 'Invalid request', {
      fieldErrors: { email: ['Invalid email'], bogus: ['ignored'], phone: [] },
    });
    expect(toFieldErrors(validation)).toEqual([{ field: 'email', message: 'Invalid email' }]);
    expect(toFieldErrors(new ApiError(409, 'EMAIL_TAKEN', 'x'))).toEqual([
      { field: 'email', message: 'Another contact already uses this email.' },
    ]);
    expect(toFieldErrors(new ApiError(500, 'INTERNAL_ERROR', 'x'))).toBeUndefined();
    expect(toFieldErrors(new Error('x'))).toBeUndefined();
  });

  it('gives friendly messages, falling back to the server message', () => {
    expect(describeError(new ApiError(0, 'NETWORK_ERROR', 'raw'))).toMatch(/Cannot reach the server/);
    expect(describeError(new ApiError(418, 'TEAPOT', 'I am a teapot'))).toBe('I am a teapot');
    expect(describeError('weird')).toBe('Unexpected error');
  });
});

describe('format helpers', () => {
  it('formats totals', () => {
    expect(formatTotal({ count: 1250, capped: false })).toBe('1,250');
    expect(formatTotal({ count: 10000, capped: true })).toBe('10,000+');
  });

  it('formats relative times', () => {
    const now = Date.parse('2026-10-15T12:00:00Z');
    expect(formatRelative('2026-10-15T11:59:40Z', now)).toBe('just now');
    expect(formatRelative('2026-10-15T11:55:00Z', now)).toMatch(/5 minutes ago/);
    expect(formatRelative('2026-10-13T12:00:00Z', now)).toMatch(/2 days ago/);
  });
});
