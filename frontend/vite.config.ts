import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  test: {
    // jsdom with Node's AbortSignal, so request cancellation works under MSW (see the file for why).
    environment: './src/test/jsdom-environment.ts',
    setupFiles: ['src/test/setup.ts'],
    globals: true,
    css: false,
  },
});
