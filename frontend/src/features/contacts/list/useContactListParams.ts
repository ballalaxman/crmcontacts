import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { SortBy, SortOrder } from '../../../contracts/api-types';
import type { ContactListParams } from '../api/contacts-api';
import { countPanelFilters, hasAnyFilter, parseListParams } from './list-params';

/** The URL is the source of truth for search, filters and sort, so any view can be bookmarked or shared. */
export function useContactListParams() {
  const [sp, setSp] = useSearchParams();
  const params = useMemo(() => parseListParams(sp), [sp]);

  // React Router's setSearchParams(prev => …) hands every call the params of the last *render*, so two
  // updates in the same tick (search and company debounces firing together) would drop the first one.
  // Updates are applied on top of the latest not-yet-rendered params instead.
  const pending = useRef<URLSearchParams | null>(null);
  useEffect(() => {
    pending.current = null; // the router has caught up
  }, [sp]);

  const setParams = useCallback(
    (patch: Partial<ContactListParams>) => {
      const next = new URLSearchParams(pending.current ?? sp);
      Object.entries(patch).forEach(([k, v]) => {
        const val = Array.isArray(v) ? v.join(',') : v;
        if (val === undefined || val === '') next.delete(k);
        else next.set(k, String(val));
      });
      pending.current = next;
      setSp(next, { replace: true });
    },
    [sp, setSp],
  );

  const setSort = useCallback((sortBy: SortBy, order: SortOrder) => setParams({ sortBy, order }), [setParams]);

  const clear = useCallback(() => {
    pending.current = new URLSearchParams();
    setSp(new URLSearchParams(), { replace: true });
  }, [setSp]);

  return {
    params,
    setParams,
    setSort,
    clear,
    hasFilters: hasAnyFilter(params),
    activeFilterCount: countPanelFilters(params),
  };
}
