import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { cx } from '../../lib/cx';
import { Button } from './Button';

interface PopoverProps {
  /** Trigger button content. */
  label: ReactNode;
  /** Id of a visible label; the trigger is then announced as "<label> <trigger text>". */
  labelledBy?: string;
  /** Accessible name of the panel. */
  panelLabel: string;
  /** Count shown on the trigger (e.g. selected tags). */
  count?: number;
  align?: 'start' | 'end';
  children: ReactNode;
}

/**
 * A disclosure panel anchored to its trigger (not modal). Escape or a click outside closes it,
 * and Escape returns focus to the trigger.
 */
export function Popover({ label, labelledBy, panelLabel, count = 0, align = 'start', children }: PopoverProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const triggerId = useId();
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (e.target instanceof Node && !rootRef.current?.contains(e.target)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div className="ui-popover" ref={rootRef}>
      <Button
        ref={triggerRef}
        id={triggerId}
        iconEnd="chevronDown"
        aria-expanded={open}
        aria-controls={panelId}
        aria-labelledby={labelledBy ? `${labelledBy} ${triggerId}` : undefined}
        onClick={() => setOpen((o) => !o)}
        className={cx('ui-popover__trigger', count > 0 && 'ui-popover__trigger--active')}
      >
        {label}
        {count > 0 && <span className="ui-count" aria-hidden="true">{count}</span>}
      </Button>
      <div
        id={panelId}
        role="group"
        aria-label={panelLabel}
        hidden={!open}
        className={cx('ui-popover__panel', `ui-popover__panel--${align}`)}
      >
        {children}
      </div>
    </div>
  );
}
