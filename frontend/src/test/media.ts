import { vi } from 'vitest';

/**
 * Emulates a viewport for components that read media queries: `compact` true means a phone.
 * Returns a function that flips the match later, firing the 'change' event like a real resize.
 */
export function mockViewport({ compact }: { compact: boolean }) {
  let matches = compact;
  const listeners = new Set<() => void>();
  window.matchMedia = vi.fn((query: string) => ({
    matches: query.includes('max-width') ? matches : !matches,
    media: query,
    onchange: null,
    addEventListener: (_: string, l: () => void) => listeners.add(l),
    removeEventListener: (_: string, l: () => void) => listeners.delete(l),
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;

  return (nextCompact: boolean) => {
    matches = nextCompact;
    listeners.forEach((l) => l());
  };
}
