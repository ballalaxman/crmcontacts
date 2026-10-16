import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useApi } from '../../../api/ApiProvider';
import { ACTIVITY_PAGE_SIZE } from '../../../lib/constants';
import type { ContactListParams } from '../api/contacts-api';
import { contactKeys } from '../api/query-keys';

/** One page of contacts. Keeps the previous page on screen while the next one loads (no flicker). */
export function useContacts(params: ContactListParams, cursor: string | null) {
  const api = useApi();
  return useQuery({
    queryKey: contactKeys.list(params, cursor),
    queryFn: ({ signal }) => api.list(params, cursor, signal),
    placeholderData: keepPreviousData,
  });
}

export function useContact(id: string) {
  const api = useApi();
  return useQuery({ queryKey: contactKeys.detail(id), queryFn: ({ signal }) => api.get(id, signal) });
}

export function useActivities(contactId: string) {
  const api = useApi();
  return useQuery({
    queryKey: contactKeys.activities(contactId),
    queryFn: ({ signal }) => api.activities(contactId, ACTIVITY_PAGE_SIZE, signal),
  });
}

/** All known tags, for the filter and autocomplete. Changes rarely, so it stays fresh for a minute. */
export function useTags() {
  const api = useApi();
  return useQuery({ queryKey: contactKeys.tags(), queryFn: ({ signal }) => api.tags(signal), staleTime: 60_000 });
}
