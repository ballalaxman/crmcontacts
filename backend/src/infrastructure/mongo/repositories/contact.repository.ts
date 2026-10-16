import { Types, type UpdateQuery } from 'mongoose';
import type { ListContactsQuery } from '../../../contracts/index.js';
import type { ContactReader, ContactWriter, PageResult, TxContext } from '../../../domain/ports.js';
import type { Contact, ContactPatch } from '../../../domain/contact.js';
import { EmailTakenError } from '../../../domain/errors.js';
import { ContactModel, type ContactDoc } from '../models/contact.model.js';
import { CompositeContactFilter } from '../query/filters.js';
import { keysetCondition, type SortStrategy } from '../query/sorts.js';
import { decodeCursor, encodeCursor } from '../query/cursor.js';
import { sessionOf } from '../unit-of-work.js';
import { isDuplicateKey, toContact } from '../mappers.js';

const COUNT_CAP = 10_000;

export class MongoContactRepository implements ContactReader, ContactWriter {
  constructor(
    private readonly filter: CompositeContactFilter,
    private readonly sorts: Record<ListContactsQuery['sortBy'], SortStrategy>,
  ) {}

  async findById(id: string, tx?: TxContext) {
    const doc = await ContactModel.findById(id).session(sessionOf(tx) ?? null).lean();
    return doc ? toContact(doc) : null;
  }

  async list(q: ListContactsQuery): Promise<PageResult<Contact>> {
    const sort = this.sorts[q.sortBy];
    const dir = q.order === 'asc' ? 1 : -1;
    const sortKey = `${q.sortBy}:${q.order}`;
    const base = this.filter.build(q);

    let filter = base;
    if (q.cursor) {
      const c = decodeCursor(q.cursor, sortKey);
      const after = keysetCondition(sort, q.order, c.v, c.id);
      filter = Object.keys(base).length ? { $and: [base, after] } : after;
    }

    const docs = await ContactModel.find(filter)
      .sort({ [sort.field]: dir, _id: dir })
      .limit(q.limit + 1)
      .lean();

    const hasMore = docs.length > q.limit;
    const page = hasMore ? docs.slice(0, q.limit) : docs;
    const last = page.at(-1);

    return {
      items: page.map(toContact),
      nextCursor: hasMore && last
        ? encodeCursor({ v: sort.cursorValue(last as Record<string, unknown>), id: String(last._id), s: sortKey })
        : null,
      total: q.cursor ? undefined : await this.cappedCount(base),
    };
  }

  private async cappedCount(filter: object) {
    const count = await ContactModel.countDocuments(filter, { limit: COUNT_CAP + 1 });
    return { count: Math.min(count, COUNT_CAP), capped: count > COUNT_CAP };
  }

  async partitionByTag(ids: string[], tag: string, tx?: TxContext) {
    const docs = await ContactModel.find({ _id: { $in: ids } }, { tags: 1 })
      .session(sessionOf(tx) ?? null)
      .lean();
    return {
      existing: docs.map((d) => String(d._id)),
      missingTag: docs.filter((d) => !d.tags?.includes(tag)).map((d) => String(d._id)),
    };
  }

  async updateIfVersionMatches(id: string, version: number, patch: ContactPatch, tx?: TxContext) {
    const update: UpdateQuery<ContactDoc> = { $set: patch.set, $inc: { version: 1 } };
    if (patch.unset.length) update.$unset = Object.fromEntries(patch.unset.map((k) => [k, '']));
    try {
      const doc = await ContactModel.findOneAndUpdate({ _id: id, version }, update, {
        new: true, session: sessionOf(tx), lean: true,
      });
      return doc ? toContact(doc) : null;
    } catch (e) {
      if (isDuplicateKey(e, 'email')) throw new EmailTakenError(); // infra -> domain error
      throw e;
    }
  }

  async addTag(id: string, tag: string, tx?: TxContext) {
    return this.mutateTag(id, { tags: { $ne: tag } }, { $addToSet: { tags: tag } }, tx);
  }

  async removeTag(id: string, tag: string, tx?: TxContext) {
    return this.mutateTag(id, { tags: tag }, { $pull: { tags: tag } }, tx);
  }

  /** Atomic conditional update; distinguishes "changed" vs "no-op" vs "not found". */
  private async mutateTag(id: string, cond: object, update: UpdateQuery<ContactDoc>, tx?: TxContext) {
    const session = sessionOf(tx);
    const changed = await ContactModel.findOneAndUpdate({ _id: id, ...cond }, update, {
      new: true, session, lean: true,
    });
    if (changed) return { contact: toContact(changed), changed: true };
    const existing = await ContactModel.findById(id).session(session ?? null).lean();
    return existing ? { contact: toContact(existing), changed: false } : null;
  }

  async addTagToMany(ids: string[], tag: string, tx?: TxContext) {
    const res = await ContactModel.updateMany(
      { _id: { $in: ids.map((i) => new Types.ObjectId(i)) }, tags: { $ne: tag } },
      { $addToSet: { tags: tag } },
      { session: sessionOf(tx) },
    );
    return res.modifiedCount;
  }
}
