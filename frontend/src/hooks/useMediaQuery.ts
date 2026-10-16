import { useCallback, useSyncExternalStore } from 'react';

/** True while the media query matches; re-renders when it starts or stops matching. */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (typeof window.matchMedia !== 'function') return () => {};
      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    },
    [query],
  );
  // No matchMedia (old browsers, jsdom): behave as the wide layout.
  const getSnapshot = () => (typeof window.matchMedia === 'function' ? window.matchMedia(query).matches : false);
  return useSyncExternalStore(subscribe, getSnapshot);
}
