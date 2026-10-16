import { useSyncExternalStore } from 'react';
import { formatDateTime, formatRelative } from '../../lib/format';

const TICK_MS = 30_000;

// One shared timer for every <RelativeTime> on screen, started by the first and stopped with the last.
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | undefined;

function subscribe(listener: () => void) {
  listeners.add(listener);
  timer ??= setInterval(() => listeners.forEach((l) => l()), TICK_MS);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = undefined;
    }
  };
}

// Rounded to the tick, so the value is stable between React's repeated reads within one tick.
const getNow = () => Math.floor(Date.now() / TICK_MS) * TICK_MS;

/** "5 minutes ago", kept fresh, with the exact date and time on hover. */
export function RelativeTime({ iso, className }: { iso: string; className?: string }) {
  const now = useSyncExternalStore(subscribe, getNow);
  return (
    <time dateTime={iso} title={formatDateTime(iso)} className={className}>
      {formatRelative(iso, now)}
    </time>
  );
}
