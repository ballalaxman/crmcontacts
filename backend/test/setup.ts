import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { beforeAll, afterAll, beforeEach } from 'vitest';
import { ContactModel } from '../src/infrastructure/mongo/models/contact.model.js';
import { ActivityModel } from '../src/infrastructure/mongo/models/activity.model.js';
import { TagModel } from '../src/infrastructure/mongo/models/tag.model.js';

let rs: MongoMemoryReplSet; // replica set => transactions work, same as production

beforeAll(async () => {
  rs = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });
  await mongoose.connect(rs.getUri());
  await Promise.all([ContactModel.syncIndexes(), ActivityModel.syncIndexes(), TagModel.syncIndexes()]);
});

beforeEach(async () => {
  await Promise.all([ContactModel.deleteMany({}), ActivityModel.deleteMany({}), TagModel.deleteMany({})]);
});

afterAll(async () => {
  await mongoose.disconnect();
  await rs.stop();
});
