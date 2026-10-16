import mongoose from 'mongoose';
import { loadEnv } from './config/env.js';
import { buildContainer } from './container.js';
import { createApp } from './app.js';
import { ContactModel } from './infrastructure/mongo/models/contact.model.js';
import { ActivityModel } from './infrastructure/mongo/models/activity.model.js';
import { TagModel } from './infrastructure/mongo/models/tag.model.js';

async function main() {
  const env = loadEnv();
  await mongoose.connect(env.MONGODB_URI, { autoIndex: false });
  if (env.SYNC_INDEXES_ON_BOOT) {
    await Promise.all([ContactModel.syncIndexes(), ActivityModel.syncIndexes(), TagModel.syncIndexes()]);
  }
  const app = createApp(buildContainer(mongoose.connection), {
    corsOrigins: env.CORS_ORIGINS.split(',').map((s) => s.trim()),
    trustProxy: env.TRUST_PROXY,
  });
  const server = app.listen(env.PORT, () => console.log(`API on http://localhost:${env.PORT}/api`));

  const shutdown = async () => {
    server.close();
    await mongoose.disconnect();
    process.exit(0);
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((e) => { console.error(e); process.exit(1); });
