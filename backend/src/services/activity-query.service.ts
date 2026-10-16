import type { ActivityReader, ContactReader } from '../domain/ports.js';
import { NotFoundError } from '../domain/errors.js';

export class ActivityQueryService {
  constructor(private readonly contacts: ContactReader, private readonly activities: ActivityReader) {}

  async listForContact(contactId: string, limit: number) {
    if (!(await this.contacts.findById(contactId))) throw new NotFoundError('Contact');
    return this.activities.listForContact(contactId, limit);
  }
}
