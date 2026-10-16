import { builtinEnvironments, type Environment } from 'vitest/environments';

/**
 * The standard jsdom environment, except that Node's own AbortController/AbortSignal are kept.
 *
 * jsdom installs its own AbortSignal, and Node's fetch (which MSW intercepts in tests) rejects it with
 * "Expected signal to be an instance of AbortSignal". The app passes TanStack Query's abort signal to fetch
 * so stale requests are cancelled; a browser has only one AbortSignal, so this matters only under test.
 */
const environment: Environment = {
  name: 'jsdom-node-abort',
  transformMode: 'web',
  async setup(global, options) {
    const { AbortController, AbortSignal } = global;
    const jsdom = await builtinEnvironments.jsdom.setup(global, options);
    global.AbortController = AbortController;
    global.AbortSignal = AbortSignal;
    return jsdom;
  },
};

export default environment;
