import type { ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

interface EmptyStateProps {
  icon?: IconName;
  title: string;
  description?: ReactNode;
  /** The next step, usually one button. */
  action?: ReactNode;
}

export function EmptyState({ icon = 'inbox', title, description, action }: EmptyStateProps) {
  return (
    <div className="ui-empty">
      <span className="ui-empty__icon"><Icon name={icon} size="lg" /></span>
      <h2 className="ui-empty__title">{title}</h2>
      {description && <p className="ui-empty__text">{description}</p>}
      {action && <div className="ui-empty__action">{action}</div>}
    </div>
  );
}
