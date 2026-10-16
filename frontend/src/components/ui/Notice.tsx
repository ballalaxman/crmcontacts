import type { ReactNode } from 'react';
import { cx } from '../../lib/cx';
import { Icon, type IconName } from './Icon';

interface NoticeProps {
  tone?: 'info' | 'warning';
  icon?: IconName;
  children: ReactNode;
  className?: string;
}

/** A non-blocking status message (slow server, offline). Announced politely. */
export function Notice({ tone = 'info', icon = 'info', children, className }: NoticeProps) {
  return (
    <div className={cx('ui-notice', `ui-notice--${tone}`, className)} role="status">
      <Icon name={icon} size="sm" className="ui-notice__icon" />
      <span>{children}</span>
    </div>
  );
}
