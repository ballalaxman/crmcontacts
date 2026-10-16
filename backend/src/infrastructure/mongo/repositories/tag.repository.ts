import type { TagRegistry, TxContext } from '../../../domain/ports.js';
import { TagModel } from '../models/tag.model.js';
import { sessionOf } from '../unit-of-work.js';

export class MongoTagRepository implements TagRegistry {
  async ensure(tag: string, tx?: TxContext) {
    await TagModel.updateOne(
      { name: tag },
      { $setOnInsert: { name: tag } },
      { upsert: true, session: sessionOf(tx) },
    );
  }

  async list() {
    const tags = await TagModel.find({}, { name: 1 }).sort({ name: 1 }).lean();
    return tags.map((t) => t.name);
  }
}
