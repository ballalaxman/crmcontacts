import type { ListContactsQuery } from '../contracts/index.js';
import type { ContactReader } from '../domain/ports.js';
import { NotFoundError } from '../domain/errors.js';

export class ContactQueryService {
  constructor(private readonly contacts: ContactReader) {}

  list(query: ListContactsQuery) {
    return this.contacts.list(query);
  }

  async get(id: string) {
    const contact = await this.contacts.findById(id);
    if (!contact) throw new NotFoundError('Contact');
    return contact;
  }
}
