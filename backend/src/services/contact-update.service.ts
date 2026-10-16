import type { UpdateContactInput } from '../contracts/index.js';
import type { ActivityWriter, ContactReader, ContactWriter, UnitOfWork } from '../domain/ports.js';
import { buildPatch, diffContact, type Contact } from '../domain/contact.js';
import { NotFoundError, VersionConflictError } from '../domain/errors.js';

export class ContactUpdateService {
  constructor(
    private readonly reader: ContactReader,
    private readonly writer: ContactWriter,
    private readonly activities: ActivityWriter,
    private readonly uow: UnitOfWork,
  ) {}

  async update(id: string, input: UpdateContactInput, actor?: string): Promise<Contact> {
    const { version, ...fields } = input;

    return this.uow.run(async (tx) => {
      const current = await this.reader.findById(id, tx);
      if (!current) throw new NotFoundError('Contact');
      if (current.version !== version) throw new VersionConflictError(current);

      const changes = diffContact(current, fields);
      if (changes.length === 0) return current; // no-op: no write, no activity

      const updated = await this.writer.updateIfVersionMatches(id, version, buildPatch(current, fields), tx);
      if (!updated) {
        // Lost a race between read and write
        throw new VersionConflictError(await this.reader.findById(id, tx));
      }

      await this.activities.record([{ contactId: id, type: 'CONTACT_UPDATED', changes, actor }], tx);
      return updated;
    });
  }
}
