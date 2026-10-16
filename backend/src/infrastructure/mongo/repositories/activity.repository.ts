import { Types } from 'mongoose';
import type { ActivityType } from '../../../contracts/index.js';
import type { FieldChange } from '../../../domain/contact.js';
import type {
  Activity, ActivityReader, ActivityWriter, NewActivity, TxContext,
} from '../../../domain/ports.js';
import { ActivityModel } from '../models/activity.model.js';
import { sessionOf } from '../unit-of-work.js';

export class MongoActivityRepository implements ActivityWriter, ActivityReader {
  async record(entries: NewActivity[], tx?: TxContext) {
    if (!entries.length) return;
    await ActivityModel.insertMany(
      entries.map((e) => ({ ...e, contactId: new Types.ObjectId(e.contactId) })),
      { session: sessionOf(tx) },
    );
  }

  async listForContact(contactId: string, limit: number): Promise<Activity[]> {
    const docs = await ActivityModel.find({ contactId })
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit)
      .lean();
    return docs.map((d) => ({
      id: String(d._id),
      contactId: String(d.contactId),
      type: d.type as ActivityType,
      changes: d.changes?.length ? (d.changes as unknown as FieldChange[]) : undefined,
      tag: d.tag ?? undefined,
      actor: d.actor ?? undefined,
      createdAt: d.createdAt,
    }));
  }
}
