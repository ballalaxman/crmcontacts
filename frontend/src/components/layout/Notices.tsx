import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { Notice } from '../ui';

/** Shown when the first load takes longer than usual, so a slow server doesn't look like a broken page. */
export function SlowServerNotice() {
  return <Notice icon="clock">The server is taking longer than usual to respond — this can take up to a minute.</Notice>;
}

/** Shown while the browser reports no network connection. */
export function OfflineNotice() {
  const online = useOnlineStatus();
  if (online) return null;
  return (
    <Notice tone="warning" icon="wifiOff">
      You're offline. Changes can't be saved until the connection is back.
    </Notice>
  );
}
