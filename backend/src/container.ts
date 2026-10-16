import type { Connection } from 'mongoose';
import { MongoUnitOfWork } from './infrastructure/mongo/unit-of-work.js';
import { MongoContactRepository } from './infrastructure/mongo/repositories/contact.repository.js';
import { MongoActivityRepository } from './infrastructure/mongo/repositories/activity.repository.js';
import { MongoTagRepository } from './infrastructure/mongo/repositories/tag.repository.js';
import {
  CompositeContactFilter, SearchFilter, TagFilter, CompanyFilter, CreatedDateFilter,
} from './infrastructure/mongo/query/filters.js';
import { sortStrategies } from './infrastructure/mongo/query/sorts.js';
import { ContactQueryService } from './services/contact-query.service.js';
import { ContactUpdateService } from './services/contact-update.service.js';
import { ContactTagService } from './services/contact-tag.service.js';
import { ActivityQueryService } from './services/activity-query.service.js';
import { ContactController } from './http/controllers/contact.controller.js';
import { TagController } from './http/controllers/tag.controller.js';
import { ActivityController } from './http/controllers/activity.controller.js';
import { HealthController } from './http/controllers/health.controller.js';

/** Composition root: the only place that knows the concrete classes. */
export function buildContainer(conn: Connection) {
  // Infrastructure
  const uow = new MongoUnitOfWork(conn);
  const filters = new CompositeContactFilter([
    new SearchFilter(), new TagFilter(), new CompanyFilter(), new CreatedDateFilter(),
  ]); // Open/Closed: add a filter here, nothing else changes
  const contacts = new MongoContactRepository(filters, sortStrategies);
  const activities = new MongoActivityRepository();
  const tags = new MongoTagRepository();

  // Services (depend on interfaces only)
  const contactQuery = new ContactQueryService(contacts);
  const contactUpdate = new ContactUpdateService(contacts, contacts, activities, uow);
  const contactTags = new ContactTagService(contacts, contacts, activities, tags, uow);
  const activityQuery = new ActivityQueryService(contacts, activities);

  return {
    contacts: new ContactController(contactQuery, contactUpdate),
    tags: new TagController(contactTags, tags),
    activities: new ActivityController(activityQuery),
    health: new HealthController(conn),
  };
}
export type Controllers = ReturnType<typeof buildContainer>;
