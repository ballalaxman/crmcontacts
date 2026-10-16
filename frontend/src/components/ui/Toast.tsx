import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { TOAST_DURATION_MS, TOAST_MAX_VISIBLE } from '../../lib/constants';
import { cx } from '../../lib/cx';
import { IconButton } from './Button';
import { Icon, type IconName } from './Icon';

export type ToastTone = 'success' | 'error' | 'warning' | 'info';
interface ToastItem { id: number; message: string; tone: ToastTone }
interface ToastApi { push: (message: string, tone?: ToastTone) => void }

const ICONS: Record<ToastTone, IconName> = { success: 'check', error: 'alert', warning: 'alert', info: 'info' };

const ToastContext = createContext<ToastApi | null>(null);

/** Short feedback after an action. Errors are announced assertively, everything else politely. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(0);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setItems((all) => all.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (message: string, tone: ToastTone = 'info') => {
      const id = ++nextId.current;
      setItems((all) => [...all, { id, message, tone }].slice(-TOAST_MAX_VISIBLE));
      const duration = tone === 'error' ? TOAST_DURATION_MS.error : TOAST_DURATION_MS.default;
      timers.current.set(id, setTimeout(() => dismiss(id), duration));
    },
    [dismiss],
  );

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  const api = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="ui-toasts" role="region" aria-label="Notifications" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={cx('ui-toast', `ui-toast--${t.tone}`)} role={t.tone === 'error' ? 'alert' : 'status'}>
            <Icon name={ICONS[t.tone]} size="sm" className="ui-toast__icon" />
            <span className="ui-toast__message">{t.message}</span>
            <IconButton icon="x" label="Dismiss notification" size="sm" className="ui-toast__close" onClick={() => dismiss(t.id)} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}
