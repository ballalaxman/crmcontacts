import mongoose from 'mongoose';
import { faker } from '@faker-js/faker';
import { loadEnv } from '../config/env.js';
import { ContactModel } from '../infrastructure/mongo/models/contact.model.js';
import { ActivityModel } from '../infrastructure/mongo/models/activity.model.js';
import { TagModel } from '../infrastructure/mongo/models/tag.model.js';
import { deriveSearchFields } from '../domain/contact.js';

const TOTAL = Number(process.env.SEED_COUNT ?? 5000);
const TAGS = ['lead', 'customer', 'vip', 'prospect', 'partner', 'churned'];

async function main() {
  // Seed before generating anything so every run produces the same data.
  faker.seed(42);
  faker.setDefaultRefDate('2026-10-01T00:00:00.000Z');
  const companies = Array.from({ length: 60 }, () => faker.company.name());

  const env = loadEnv();
  await mongoose.connect(env.MONGODB_URI);

  if (process.argv.includes('--reset')) {
    await Promise.all([ContactModel.deleteMany({}), ActivityModel.deleteMany({}), TagModel.deleteMany({})]);
  } else if (await ContactModel.estimatedDocumentCount()) {
    console.error('The contacts collection is not empty. Run with --reset (npm run seed -- --reset) to replace it.');
    await mongoose.disconnect();
    process.exit(1);
  }
  await Promise.all([ContactModel.syncIndexes(), ActivityModel.syncIndexes(), TagModel.syncIndexes()]);

  const batchSize = 1000;
  for (let start = 0; start < TOTAL; start += batchSize) {
    const docs = Array.from({ length: Math.min(batchSize, TOTAL - start) }, (_, k) => {
      const i = start + k;
      // Deliberate duplicates of names to demo search + sort tie-breaking
      const firstName = i % 250 === 0 ? 'John' : faker.person.firstName();
      const lastName = i % 250 === 0 ? 'Smith' : faker.person.lastName();
      const hasEmail = i % 10 !== 0; // ~10% without email
      const email = hasEmail
        ? `${firstName}.${lastName}.${i}@${faker.internet.domainName()}`.toLowerCase().replace(/[^a-z0-9.@-]/g, '')
        : undefined;
      const phone = faker.helpers.maybe(() => faker.phone.number({ style: 'international' }), { probability: 0.85 });
      const company = faker.helpers.maybe(() => faker.helpers.arrayElement(companies), { probability: 0.9 });
      const createdAt = faker.date.past({ years: 2 });
      const base = { firstName, lastName, phone, company };
      // Absent optional values are left out (never null), exactly like the update path does.
      const derived = Object.fromEntries(Object.entries(deriveSearchFields(base)).filter(([, v]) => v !== null));
      return {
        firstName,
        lastName,
        ...(email && { email }),
        ...(phone && { phone }),
        ...(company && { company }),
        ...derived,
        tags: faker.helpers.arrayElements(TAGS, { min: 0, max: 3 }),
        version: 0,
        createdAt,
        updatedAt: createdAt,
      };
    });
    // Native insert keeps our createdAt values (bypasses Mongoose timestamps)
    await ContactModel.collection.insertMany(docs, { ordered: false });
    console.log(`Inserted ${Math.min(start + batchSize, TOTAL)}/${TOTAL}`);
  }

  await TagModel.bulkWrite(
    TAGS.map((name) => ({
      updateOne: { filter: { name }, update: { $setOnInsert: { name, createdAt: new Date() } }, upsert: true },
    })),
  );

  console.log('Seed complete');
  await mongoose.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
