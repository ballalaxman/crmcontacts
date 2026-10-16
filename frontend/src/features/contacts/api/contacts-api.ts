import type {
  ActivityDto, BulkTagResult, ContactDto, Page, SortBy, SortOrder, TagMode, UpdateContactInput,
} from '../../../contracts/api-types';
import type { HttpClient } from '../../../api/http-client';

export type { SortBy, SortOrder, TagMode };

/** What the list screen asks for. Mirrors the GET /contacts query parameters. */
export interface ContactListParams {
  q?: string;
  tags: string[];
  tagMode: TagMode;
  company?: string;
  createdFrom?: string;
  createdTo?: string;
  sortBy: SortBy;
  order: SortOrder;
  limit: number;
}

/**
 * The only thing the UI knows about the backend. Read calls take an AbortSignal so TanStack Query can
 * cancel a request whose result is no longer wanted. Tests swap in a fake transport.
 */
export interface ContactsApi {
  list(params: ContactListParams, cursor: string | null, signal?: AbortSignal): Promise<Page<ContactDto>>;
  get(id: string, signal?: AbortSignal): Promise<ContactDto>;
  update(id: string, input: UpdateContactInput): Promise<ContactDto>;
  addTag(id: string, tag: string): Promise<ContactDto>;
  removeTag(id: string, tag: string): Promise<ContactDto>;
  bulkAddTag(contactIds: string[], tag: string): Promise<BulkTagResult>;
  activities(id: string, limit?: number, signal?: AbortSignal): Promise<ActivityDto[]>;
  tags(signal?: AbortSignal): Promise<string[]>;
}

/** Builds the query string, leaving out empty values so URLs stay short and cache keys stay stable. */
export function toListQuery(params: ContactListParams, cursor: string | null) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (Array.isArray(v)) {
      if (v.length) qs.set(k, v.join(','));
    } else if (v !== undefined && v !== '') {
      qs.set(k, String(v));
    }
  });
  if (cursor) qs.set('cursor', cursor);
  return qs.toString();
}

export function createContactsApi(http: HttpClient): ContactsApi {
  const contact = (id: string) => `/contacts/${encodeURIComponent(id)}`;
  return {
    list: (p, cursor, signal) => http.get(`/contacts?${toListQuery(p, cursor)}`, { signal }),
    get: (id, signal) => http.get(contact(id), { signal }),
    update: (id, input) => http.patch(contact(id), input),
    addTag: (id, tag) => http.post(`${contact(id)}/tags`, { tag }),
    removeTag: (id, tag) => http.del(`${contact(id)}/tags/${encodeURIComponent(tag)}`),
    bulkAddTag: (contactIds, tag) => http.post('/contacts/bulk/tags', { contactIds, tag }),
    activities: (id, limit = 20, signal) => http.get(`${contact(id)}/activities?limit=${limit}`, { signal }),
    tags: (signal) => http.get('/tags', { signal }),
  };
}
