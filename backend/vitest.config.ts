import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['test/setup.ts'],
    // One in-memory replica set per file, so files must not run at the same time.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 120_000, // first run may have to unpack the mongod binary
  },
});
