import type { ReactNode } from 'react';
import { cx } from '../../lib/cx';
import { Button } from './Button';
import { Icon, type IconName } from './Icon';

interface ErrorStateProps {
  message: string;
  title?: string;
  onRetry?: () => void;
  retrying?: boolean;
  /** inline: a banner above content. block: replaces the content area. */
  variant?: 'inline' | 'block';
  icon?: IconName;
  /** Extra actions next to Retry. */
  children?: ReactNode;
}

/** An error the user can act on. role="alert", so it is announced when it appears. */
export function ErrorState({ message, title, onRetry, retrying = false, variant = 'inline', icon = 'alert', children }: ErrorStateProps) {
  return (
    <div className={cx('ui-error', `ui-error--${variant}`)} role="alert">
      <span className="ui-error__icon"><Icon name={icon} size={variant === 'block' ? 'lg' : 'md'} /></span>
      <div className="ui-error__body">
        {title && <p className="ui-error__title">{title}</p>}
        <p className="ui-error__message">{message}</p>
      </div>
      {(onRetry || children) && (
        <div className="ui-error__actions">
          {onRetry && (
            <Button size="sm" icon="refresh" loading={retrying} onClick={onRetry}>
              Retry
            </Button>
          )}
          {children}
        </div>
      )}
    </div>
  );
}
