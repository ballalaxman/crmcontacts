import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ContactDto, UpdateContactInput } from '../../../contracts/api-types';
import { useApi } from '../../../api/ApiProvider';
import { ApiError } from '../../../api/http-client';
import { isRecord } from '../../../lib/guards';
import { contactKeys } from '../api/query-keys';

/** A 409 whose details carry the contact as it is now on the server. */
export const isVersionConflict = (e: unknown): e is ApiError & { details: { current: ContactDto } } =>
  e instanceof ApiError && e.code === 'VERSION_CONFLICT' && isRecord(e.details) && isRecord(e.details.current);

export function useUpdateContact(id: string) {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateContactInput) => api.update(id, input),
    onSuccess: (contact) => {
      qc.setQueryData(contactKeys.detail(id), contact);
      qc.invalidateQueries({ queryKey: contactKeys.activities(id) });
      qc.invalidateQueries({ queryKey: contactKeys.lists() });
    },
  });
}

export function useTagMutations(id: string) {
  const api = useApi();
  const qc = useQueryClient();
  const onSuccess = (contact: ContactDto) => {
    qc.setQueryData(contactKeys.detail(id), contact);
    qc.invalidateQueries({ queryKey: contactKeys.activities(id) });
    qc.invalidateQueries({ queryKey: contactKeys.lists() });
    qc.invalidateQueries({ queryKey: contactKeys.tags() });
  };
  return {
    add: useMutation({ mutationFn: (tag: string) => api.addTag(id, tag), onSuccess }),
    remove: useMutation({ mutationFn: (tag: string) => api.removeTag(id, tag), onSuccess }),
  };
}

export function useBulkTag() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ids, tag }: { ids: string[]; tag: string }) => api.bulkAddTag(ids, tag),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: contactKeys.lists() });
      qc.invalidateQueries({ queryKey: contactKeys.tags() });
    },
  });
}
