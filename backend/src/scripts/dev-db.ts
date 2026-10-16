/**
 * Local development database: a persistent single-node MongoDB replica set.
 *
 * Transactions need a replica set, so a plain `mongod` is not enough. This reuses the mongod binary that
 * `mongodb-memory-server` downloads for the tests, so no Docker or separate MongoDB install is needed.
 * Data lives in backend/.data/mongo and survives restarts. Stop with Ctrl+C.
 *
 * Matches MONGODB_URI=mongodb://127.0.0.1:27017/crm?replicaSet=rs0&directConnection=true
 */
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { MongoMemoryReplSet } from 'mongodb-memory-server';

const PORT = 27017;
const dbPath = path.resolve('.data', 'mongo');
mkdirSync(dbPath, { recursive: true });

const rs = await MongoMemoryReplSet.create({
  replSet: { name: 'rs0', count: 1, storageEngine: 'wiredTiger' },
  instanceOpts: [{ port: PORT, dbPath, storageEngine: 'wiredTiger' }],
});

console.log(`MongoDB replica set ready on mongodb://127.0.0.1:${PORT}/crm?replicaSet=rs0&directConnection=true`);
console.log(`Data directory: ${dbPath}`);
console.log('Press Ctrl+C to stop.');

const stop = async () => {
  await rs.stop({ doCleanup: false }); // keep the data files
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
