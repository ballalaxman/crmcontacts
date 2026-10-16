import { useEffect, useState } from 'react';
import { SEARCH_DEBOUNCE_MS } from '../lib/constants';

export function useDebouncedValue<T>(value: T, ms = SEARCH_DEBOUNCE_MS) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}
