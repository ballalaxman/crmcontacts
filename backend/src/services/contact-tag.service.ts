import type { BulkTagResult } from '../contracts/index.js';
import type { ActivityWriter, ContactReader, ContactWriter, TagRegistry, UnitOfWork } from '../domain/ports.js';
import { NotFoundError } from '../domain/errors.js';

export class ContactTagService {
  constructor(
    private readonly reader: ContactReader,
    private readonly writer: ContactWriter,
    private readonly activities: ActivityWriter,
    private readonly tags: TagRegistry,
    private readonly uow: UnitOfWork,
  ) {}

  add(id: string, tag: string, actor?: string) {
    return this.uow.run(async (tx) => {
      const result = await this.writer.addTag(id, tag, tx);
      if (!result) throw new NotFoundError('Contact');
      if (result.changed) {
        await this.tags.ensure(tag, tx);
        await this.activities.record([{ contactId: id, type: 'TAG_ADDED', tag, actor }], tx);
      }
      return result.contact;
    });
  }

  remove(id: string, tag: string, actor?: string) {
    return this.uow.run(async (tx) => {
      const result = await this.writer.removeTag(id, tag, tx);
      if (!result) throw new NotFoundError('Contact');
      if (result.changed) {
        await this.activities.record([{ contactId: id, type: 'TAG_REMOVED', tag, actor }], tx);
      }
      return result.contact;
    });
  }

  bulkAdd(contactIds: string[], tag: string, actor?: string): Promise<BulkTagResult> {
    const ids = [...new Set(contactIds)];
    return this.uow.run(async (tx) => {
      const { existing, missingTag } = await this.reader.partitionByTag(ids, tag, tx);
      if (missingTag.length > 0) {
        await this.writer.addTagToMany(missingTag, tag, tx);
        await this.tags.ensure(tag, tx);
        await this.activities.record(
          missingTag.map((contactId) => ({ contactId, type: 'TAG_ADDED' as const, tag, actor })),
          tx,
        );
      }
      return {
        requested: ids.length,
        updated: missingTag.length,
        alreadyTagged: existing.length - missingTag.length,
        notFound: ids.length - existing.length,
      };
    });
  }
}
