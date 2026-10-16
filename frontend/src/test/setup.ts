import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, expect } from 'vitest';
import * as axeMatchers from 'vitest-axe/matchers';
import { server } from './server';

expect.extend(axeMatchers);

// jsdom doesn't implement scrolling; ScrollRestoration calls it on every navigation.
window.scrollTo = () => {};
// jsdom has no canvas. axe probes it for colour checks; returning null makes axe skip them quietly
// instead of jsdom printing "Not implemented" (contrast is measured separately, see DECISIONS.md).
Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', { value: () => null });

// Any request without a handler is a test bug, so fail loudly instead of hitting the network.
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  cleanup();
  server.resetHandlers();
  sessionStorage.clear();
  // Tests that emulate a phone install matchMedia; jsdom has none by default (= wide layout).
  Reflect.deleteProperty(window, 'matchMedia');
});
afterAll(() => server.close());
