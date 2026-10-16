import {
  LIMITS, SORT_FIELDS, SORT_ORDERS, TAG_MODES, type SortBy, type SortOrder,
} from '../../../contracts/api-types';
import type { ContactListParams } from '../api/contacts-api';

/** Anything in the URL can be hand-edited, so only whitelisted values ever reach the API. */
const pick = <T extends string>(value: string | null, allowed: readonly T[], fallback: T): T =>
  (allowed as readonly string[]).includes(value ?? '') ? (value as T) : fallback;

function parseLimit(value: string | null) {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= LIMITS.pageSizeMax ? n : LIMITS.pageSizeDefault;
}

/** Date inputs produce YYYY-MM-DD; anything else (e.g. "yesterday") would be a 400, so it is dropped. */
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const parseDate = (value: string | null) =>
  value && DATE_ONLY.test(value) && !Number.isNaN(Date.parse(value)) ? value : '';

const parseTags = (value: string | null) =>
  [...new Set((value ?? '').split(',').map((t) => t.trim().toLowerCase()).filter(Boolean))];

export const defaultOrderFor = (sortBy: SortBy): SortOrder => (sortBy === 'name' ? 'asc' : 'desc');

export function parseListParams(sp: URLSearchParams): ContactListParams {
  const sortBy = pick(sp.get('sortBy'), SORT_FIELDS, 'createdAt');
  return {
    q: (sp.get('q') ?? '').slice(0, LIMITS.searchMax),
    tags: parseTags(sp.get('tags')),
    tagMode: pick(sp.get('tagMode'), TAG_MODES, 'any'),
    company: (sp.get('company') ?? '').slice(0, LIMITS.companyMax),
    createdFrom: parseDate(sp.get('createdFrom')),
    createdTo: parseDate(sp.get('createdTo')),
    sortBy,
    order: pick(sp.get('order'), SORT_ORDERS, defaultOrderFor(sortBy)),
    limit: parseLimit(sp.get('limit')),
  };
}

/** Filters behind the "Filters" toggle (search is always visible, so it isn't counted). */
export const countPanelFilters = (p: ContactListParams) =>
  (p.tags.length ? 1 : 0) + (p.company ? 1 : 0) + (p.createdFrom ? 1 : 0) + (p.createdTo ? 1 : 0);

export const hasAnyFilter = (p: ContactListParams) => Boolean(p.q) || countPanelFilters(p) > 0;

/** The sort menu: one entry per sort field and direction. */
export const SORT_OPTIONS = [
  { value: 'createdAt:desc', label: 'Newest first' },
  { value: 'createdAt:asc', label: 'Oldest first' },
  { value: 'name:asc', label: 'Name A–Z' },
  { value: 'name:desc', label: 'Name Z–A' },
] as const;

export const toSortValue = (sortBy: SortBy, order: SortOrder) => `${sortBy}:${order}`;

export function fromSortValue(value: string): { sortBy: SortBy; order: SortOrder } {
  const [sortBy, order] = value.split(':');
  const by = pick(sortBy ?? null, SORT_FIELDS, 'createdAt');
  return { sortBy: by, order: pick(order ?? null, SORT_ORDERS, defaultOrderFor(by)) };
}
