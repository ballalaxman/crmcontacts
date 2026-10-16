import type { ReactNode } from 'react';
import { act, renderHook } from '@testing-library/react';
import { delay, http, HttpResponse } from 'msw';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { MAX_RETRIES, retryDelay, shouldRetry } from '../app/query-client';
import { ApiError, createHttpClient, isApiError } from '../api/http-client';
import { toListQuery } from '../features/contacts/api/contacts-api';
import { countPanelFilters, fromSortValue, parseListParams } from '../features/contacts/list/list-params';
import { useBulkSelection } from '../features/contacts/list/useBulkSelection';
import { useContactListParams } from '../features/contacts/list/useContactListParams';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { readBackSearch } from '../lib/navigation';
import { mockViewport } from './media';
import { API, errorBody } from './msw-handlers';
import { server } from './server';

describe('parseListParams (URL sanitization)', () => {
  const parse = (qs: string) => parseListParams(new URLSearchParams(qs));

  it('applies defaults for an empty URL', () => {
    expect(parse('')).toEqual({
      q: '', tags: [], tagMode: 'any', company: '', createdFrom: '', createdTo: '', sortBy: 'createdAt', order: 'desc', limit: 25,
    });
  });

  it('replaces values the API would reject with safe defaults', () => {
    expect(parse('sortBy=email&order=up&tagMode=some&limit=0')).toMatchObject({ sortBy: 'createdAt', order: 'desc', tagMode: 'any', limit: 25 });
    expect(parse('limit=101').limit).toBe(25);
    expect(parse('limit=2.5').limit).toBe(25);
    expect(parse('limit=50').limit).toBe(50);
  });

  it('defaults the order to match the sort (names A–Z, dates newest first)', () => {
    expect(parse('sortBy=name').order).toBe('asc');
    expect(parse('sortBy=name&order=desc').order).toBe('desc');
  });

  it('keeps only real YYYY-MM-DD dates', () => {
    expect(parse('createdFrom=2026-01-31&createdTo=2026-13-01')).toMatchObject({ createdFrom: '2026-01-31', createdTo: '' });
    expect(parse('createdFrom=yesterday').createdFrom).toBe('');
  });

  it('normalizes tags and caps text lengths', () => {
    expect(parse('tags= VIP,lead,,vip ').tags).toEqual(['vip', 'lead']);
    expect(parse(`q=${'x'.repeat(150)}`).q).toHaveLength(100);
  });

  it('counts only the filters behind the Filters toggle', () => {
    expect(countPanelFilters(parse('q=jo'))).toBe(0);
    expect(countPanelFilters(parse('q=jo&tags=vip&company=a&createdFrom=2026-01-01'))).toBe(3);
  });

  it('round-trips sort menu values and rejects junk', () => {
    expect(fromSortValue('name:desc')).toEqual({ sortBy: 'name', order: 'desc' });
    expect(fromSortValue('bogus')).toEqual({ sortBy: 'createdAt', order: 'desc' });
  });
});

describe('useContactListParams', () => {
  const wrapper = (initial: string) =>
    function Wrapper({ children }: { children: ReactNode }) {
      return <MemoryRouter initialEntries={[initial]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>{children}</MemoryRouter>;
    };

  const useBoth = () => ({ ...useContactListParams(), search: useLocation().search });

  it('reads the URL and reports active filters', () => {
    const { result } = renderHook(useBoth, { wrapper: wrapper('/?q=jo&tags=vip&sortBy=bogus') });
    expect(result.current.params).toMatchObject({ q: 'jo', tags: ['vip'], sortBy: 'createdAt' });
    expect(result.current.hasFilters).toBe(true);
    expect(result.current.activeFilterCount).toBe(1);
  });

  it('merges two updates made in the same tick instead of losing one', () => {
    const { result } = renderHook(useBoth, { wrapper: wrapper('/') });
    act(() => {
      result.current.setParams({ q: 'jo' });
      result.current.setParams({ company: 'acme' });
    });
    expect(result.current.search).toBe('?q=jo&company=acme');
  });

  it('removes a parameter when it is set to empty, and clears everything', () => {
    const { result } = renderHook(useBoth, { wrapper: wrapper('/?q=jo&tags=vip,lead') });
    act(() => result.current.setParams({ q: '', tags: [] }));
    expect(result.current.search).toBe('');
    act(() => result.current.setSort('name', 'desc'));
    expect(result.current.search).toBe('?sortBy=name&order=desc');
    act(() => result.current.clear());
    expect(result.current.search).toBe('');
    expect(result.current.hasFilters).toBe(false);
  });
});

describe('useBulkSelection', () => {
  const setup = (ids: string[], view = 'v1') =>
    renderHook(({ ids, view }) => useBulkSelection(ids, view), { initialProps: { ids, view } });

  it('toggles single rows and reports partial selection', () => {
    const { result } = setup(['a', 'b', 'c']);
    act(() => result.current.toggle('a'));
    expect(result.current).toMatchObject({ count: 1, someSelected: true, allSelected: false });
    expect(result.current.isSelected('a')).toBe(true);
    act(() => result.current.toggle('a'));
    expect(result.current.count).toBe(0);
  });

  it('select-all picks every visible row, and a second press clears them', () => {
    const { result } = setup(['a', 'b']);
    act(() => result.current.toggleAll());
    expect(result.current).toMatchObject({ count: 2, allSelected: true, someSelected: false });
    act(() => result.current.toggleAll());
    expect(result.current.count).toBe(0);
  });

  it('drops the selection when the view (filters, sort or page) changes', () => {
    const { result, rerender } = setup(['a', 'b']);
    act(() => result.current.toggleAll());
    rerender({ ids: ['c', 'd'], view: 'v2' });
    expect(result.current.count).toBe(0);
  });

  it('never counts ids that are no longer on screen', () => {
    const { result, rerender } = setup(['a', 'b']);
    act(() => result.current.toggleAll());
    rerender({ ids: ['a'], view: 'v1' }); // same view, but a row disappeared after a refetch
    expect(result.current.ids).toEqual(['a']);
    expect(result.current.allSelected).toBe(true);
  });

  it('is never "all selected" with nothing on screen', () => {
    const { result } = setup([]);
    expect(result.current.allSelected).toBe(false);
  });
});

describe('useMediaQuery', () => {
  it('is false without matchMedia (wide layout), follows the query when present, and updates on change', () => {
    expect(renderHook(() => useMediaQuery('(max-width: 767.98px)')).result.current).toBe(false);

    const setCompact = mockViewport({ compact: true });
    const { result } = renderHook(() => useMediaQuery('(max-width: 767.98px)'));
    expect(result.current).toBe(true);
    act(() => setCompact(false));
    expect(result.current).toBe(false);
  });
});

describe('retry policy', () => {
  it.each([
    ['network error', new ApiError(0, 'NETWORK_ERROR', 'x'), true],
    ['timeout', new ApiError(0, 'TIMEOUT', 'x'), true],
    ['500', new ApiError(500, 'INTERNAL_ERROR', 'x'), true],
    ['503', new ApiError(503, 'UNKNOWN', 'x'), true],
    ['400', new ApiError(400, 'VALIDATION_ERROR', 'x'), false],
    ['404', new ApiError(404, 'NOT_FOUND', 'x'), false],
    ['409', new ApiError(409, 'VERSION_CONFLICT', 'x'), false],
    ['429', new ApiError(429, 'RATE_LIMITED', 'x'), false],
    ['a non-API error (a bug)', new TypeError('boom'), false],
  ])('%s → retry: %s', (_, error, expected) => {
    expect(shouldRetry(0, error)).toBe(expected);
  });

  it(`stops after ${MAX_RETRIES} retries and backs off exponentially, capped`, () => {
    const transient = new ApiError(0, 'NETWORK_ERROR', 'x');
    expect(shouldRetry(MAX_RETRIES - 1, transient)).toBe(true);
    expect(shouldRetry(MAX_RETRIES, transient)).toBe(false);
    expect([0, 1, 2, 3, 10].map(retryDelay)).toEqual([1000, 2000, 4000, 8000, 8000]);
  });
});

describe('http client', () => {
  it('times out with a TIMEOUT error', async () => {
    server.use(http.get(`${API}/slow`, async () => {
      await delay(500);
      return HttpResponse.json({});
    }));
    const client = createHttpClient(API, () => undefined, { timeoutMs: 50 });
    await expect(client.get('/slow')).rejects.toMatchObject({ status: 0, code: 'TIMEOUT', isNetworkError: true });
  });

  it('rejects with the abort itself (not an ApiError) when the caller cancels', async () => {
    let serverSawAbort = false;
    server.use(http.get(`${API}/slow`, async ({ request }) => {
      await delay(300);
      serverSawAbort = request.signal.aborted;
      return HttpResponse.json({});
    }));
    const controller = new AbortController();
    const pending = createHttpClient(API, () => undefined).get('/slow', { signal: controller.signal });
    controller.abort();
    const error = await pending.catch((e: unknown) => e);
    expect(error).not.toBeInstanceOf(ApiError);
    expect((error as Error).name).toBe('AbortError');
    await delay(350);
    expect(serverSawAbort).toBe(true);
  });

  it('parses field errors from a validation response', async () => {
    server.use(http.patch(`${API}/x`, () =>
      HttpResponse.json(errorBody('VALIDATION_ERROR', 'Invalid request', { formErrors: [], fieldErrors: { email: ['Invalid email', 'Too long'], phone: [] } }), { status: 400 })));
    const error = await createHttpClient(API, () => undefined).patch('/x', {}).catch((e: unknown) => e);
    expect(isApiError(error, 'VALIDATION_ERROR')).toBe(true);
    expect((error as ApiError).fieldErrors).toEqual({ email: ['Invalid email', 'Too long'] });
    expect((error as ApiError).isClientError).toBe(true);
  });

  it('copes with a JSON error body that has the wrong shape', async () => {
    server.use(http.get(`${API}/x`, () => HttpResponse.json({ error: { code: 42, message: null } }, { status: 500, statusText: 'Server Error' })));
    await expect(createHttpClient(API, () => undefined).get('/x')).rejects.toMatchObject({ status: 500, code: 'UNKNOWN', isServerError: true });
  });
});

describe('small helpers', () => {
  it('builds list query strings without empty values', () => {
    expect(toListQuery({ q: '', tags: [], tagMode: 'any', sortBy: 'name', order: 'asc', limit: 25 }, null)).toBe('tagMode=any&sortBy=name&order=asc&limit=25');
  });

  it('only accepts back-navigation state the app wrote itself', () => {
    expect(readBackSearch({ from: '?q=jo' })).toBe('?q=jo');
    expect(readBackSearch({ from: 'https://evil.example' })).toBe('');
    expect(readBackSearch(null)).toBe('');
    expect(readBackSearch('?q=jo')).toBe('');
  });
});
