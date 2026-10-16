import { useEffect, useState } from 'react';
import type { ContactDto, Page } from '../../../contracts/api-types';
import { isApiError } from '../../../api/http-client';
import { useToast } from '../../../components/ui';
import { useContacts } from '../hooks/queries';
import { useContactListParams } from './useContactListParams';
import { useCursorPagination } from './useCursorPagination';

type Total = NonNullable<Page<ContactDto>['total']>;

/** The backend sends the total only with the first page; remember it while the user pages on. */
function useRememberedTotal(key: string, page: Page<ContactDto> | undefined, isPlaceholder: boolean) {
  const [saved, setSaved] = useState<{ key: string; total: Total } | null>(null);
  useEffect(() => {
    if (page?.total && !isPlaceholder) setSaved({ key, total: page.total });
  }, [key, page, isPlaceholder]);
  return saved?.key === key ? saved.total : null;
}

/** The last page that loaded successfully, shown (dimmed) if a later request fails. */
function useLastGoodPage(page: Page<ContactDto> | undefined, isPlaceholder: boolean) {
  const [lastGood, setLastGood] = useState<Page<ContactDto>>();
  useEffect(() => {
    if (page && !isPlaceholder) setLastGood(page);
  }, [page, isPlaceholder]);
  return lastGood;
}

/**
 * Everything the list screen shows, in one place: URL params, cursor stack, the query, the remembered
 * total and the recovery rules (expired cursor → page 1; failed refetch → keep the previous rows).
 */
export function useContactList() {
  const { params, setParams, setSort, clear, hasFilters, activeFilterCount } = useContactListParams();
  const resetKey = JSON.stringify(params);
  const pager = useCursorPagination(resetKey);
  const query = useContacts(params, pager.cursor);
  const toast = useToast();

  const total = useRememberedTotal(resetKey, query.data, query.isPlaceholderData);
  const lastGood = useLastGoodPage(query.data, query.isPlaceholderData);

  // An expired or tampered cursor: start again from page 1 instead of showing an error.
  const cursorRejected = pager.cursor !== null && isApiError(query.error, 'INVALID_CURSOR');
  const { reset } = pager;
  useEffect(() => {
    if (!cursorRejected) return;
    reset();
    toast.push('That page has expired, so the list went back to page 1.', 'info');
  }, [cursorRejected, reset, toast]);

  const page = query.data ?? (query.isError ? lastGood : undefined);
  const isStale = query.isPlaceholderData || (!query.data && page !== undefined);
  const items = page?.items ?? [];
  const rangeStart = (pager.pageNumber - 1) * params.limit + 1;

  return {
    params,
    setParams,
    setSort,
    clearFilters: clear,
    hasFilters,
    activeFilterCount,
    /** Changes whenever the visible rows belong to a different view (filters, sort or page). */
    viewKey: `${resetKey}|${pager.cursor ?? ''}`,
    items,
    total,
    hasData: page !== undefined,
    isInitialLoading: query.isLoading,
    isFetching: query.isFetching,
    /** Rows on screen are from a previous view (loading the next one, or it failed). */
    isStale,
    error: cursorRejected ? null : query.error,
    retry: () => void query.refetch(),
    pagination: {
      pageNumber: pager.pageNumber,
      canPrev: pager.canPrev,
      // Never page on from stale rows: their cursor belongs to another view.
      hasNext: Boolean(page?.nextCursor) && !isStale,
      next: () => {
        if (page?.nextCursor) pager.next(page.nextCursor);
      },
      prev: pager.prev,
      range: items.length ? { from: rangeStart, to: rangeStart + items.length - 1 } : null,
    },
  };
}

export type ContactListView = ReturnType<typeof useContactList>;
