import { Router } from 'express';
import {
  listContactsQuerySchema, contactIdParamsSchema, updateContactSchema, addTagBodySchema,
  contactTagParamsSchema, bulkTagBodySchema, activitiesQuerySchema,
} from '../../contracts/index.js';
import { validate } from '../middleware/validate.js';
import type { Controllers } from '../../container.js';

export function buildRoutes(c: Controllers) {
  const r = Router();

  r.get('/health', c.health.check);
  r.get('/tags', c.tags.list);

  r.get('/contacts', validate({ query: listContactsQuerySchema }), c.contacts.list);
  // Registered before '/contacts/:id/...' so "bulk" is never read as an id.
  r.post('/contacts/bulk/tags', validate({ body: bulkTagBodySchema }), c.tags.bulkAdd);
  r.get('/contacts/:id', validate({ params: contactIdParamsSchema }), c.contacts.get);
  r.patch('/contacts/:id', validate({ params: contactIdParamsSchema, body: updateContactSchema }), c.contacts.update);
  r.post('/contacts/:id/tags', validate({ params: contactIdParamsSchema, body: addTagBodySchema }), c.tags.add);
  r.delete('/contacts/:id/tags/:tag', validate({ params: contactTagParamsSchema }), c.tags.remove);
  r.get('/contacts/:id/activities',
    validate({ params: contactIdParamsSchema, query: activitiesQuerySchema }), c.activities.list);

  return r;
}
