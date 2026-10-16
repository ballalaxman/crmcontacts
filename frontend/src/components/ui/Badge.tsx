import type { ReactNode } from 'react';
import { cx } from '../../lib/cx';
import { Icon, type IconName } from './Icon';

export type Tone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info';

interface BadgeProps {
  tone?: Tone;
  icon?: IconName;
  children: ReactNode;
  className?: string;
}

/** A short status label (version, "Unsaved changes", activity type). */
export function Badge({ tone = 'neutral', icon, children, className }: BadgeProps) {
  return (
    <span className={cx('ui-badge', `ui-badge--${tone}`, className)}>
      {icon && <Icon name={icon} size="sm" />}
      {children}
    </span>
  );
}
