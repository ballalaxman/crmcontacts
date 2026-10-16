import type { FilterQuery } from 'mongoose';
import type { ListContactsQuery } from '../../../contracts/index.js';
import type { ContactDoc } from '../models/contact.model.js';

export interface ContactFilter {
  toQuery(q: ListContactsQuery): FilterQuery<ContactDoc> | null;
}

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Anchored prefix match on lowercased fields: uses the index (no /i flag, no leading wildcard). */
export class SearchFilter implements ContactFilter {
  toQuery({ q }: ListContactsQuery) {
    if (!q) return null;
    const term = q.toLowerCase().replace(/\s+/g, ' ').trim();
    if (!term) return null;
    const prefix = `^${escapeRegex(term)}`;
    // The only email index is the partial unique one (`email: { $type: 'string' }`). MongoDB may use a partial
    // index only when the query implies its filter, so `$type` must be spelled out here. Without it this branch
    // is unindexable, and one unindexable $or branch makes the planner scan the whole sort index instead.
    const or: FilterQuery<ContactDoc>[] = [
      { nameKeys: { $regex: prefix } },
      { email: { $regex: prefix, $type: 'string' } },
    ];
    const digits = term.replace(/\D/g, '');
    if (digits.length >= 3 && /^[\d\s()+\-.]+$/.test(term)) {
      or.push({ phoneKeys: { $regex: `^${digits}` } });
    }
    return { $or: or };
  }
}

export class TagFilter implements ContactFilter {
  toQuery({ tags, tagMode }: ListContactsQuery) {
    if (!tags.length) return null;
    return { tags: tagMode === 'all' ? { $all: tags } : { $in: tags } };
  }
}

export class CompanyFilter implements ContactFilter {
  toQuery({ company }: ListContactsQuery) {
    const term = company?.toLowerCase().replace(/\s+/g, ' ').trim();
    if (!term) return null;
    return { companyLower: { $regex: `^${escapeRegex(term)}` } };
  }
}

export class CreatedDateFilter implements ContactFilter {
  toQuery({ createdFrom, createdTo }: ListContactsQuery) {
    if (!createdFrom && !createdTo) return null;
    return {
      createdAt: {
        ...(createdFrom && { $gte: createdFrom }),
        ...(createdTo && { $lte: createdTo }),
      },
    };
  }
}

export class CompositeContactFilter {
  constructor(private readonly filters: ContactFilter[]) {}

  build(q: ListContactsQuery): FilterQuery<ContactDoc> {
    const parts = this.filters
      .map((f) => f.toQuery(q))
      .filter((p): p is FilterQuery<ContactDoc> => p !== null);
    return parts.length ? { $and: parts } : {};
  }
}
