import { useEffect, useState } from 'react';
import { SLOW_REQUEST_MS } from '../lib/constants';

/** True when `active` has stayed true longer than `ms` (used for the slow-server notice). */
export function useSlowFlag(active: boolean, ms = SLOW_REQUEST_MS) {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (!active) {
      setSlow(false);
      return;
    }
    const t = setTimeout(() => setSlow(true), ms);
    return () => clearTimeout(t);
  }, [active, ms]);
  return slow;
}
