import { cx } from '../../lib/cx';

interface SpinnerProps {
  size?: 'sm' | 'md';
  /** When given, the spinner is announced as a status; otherwise it is decorative. */
  label?: string;
  className?: string;
}

export function Spinner({ size = 'sm', label, className }: SpinnerProps) {
  return (
    <span
      className={cx('ui-spinner', `ui-spinner--${size}`, className)}
      role={label ? 'status' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    />
  );
}
