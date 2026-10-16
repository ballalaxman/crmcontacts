import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  /** Second line: counts, status badges, timestamps. */
  meta?: ReactNode;
  actions?: ReactNode;
}

/** The same header on every screen: one h1, then meta, then actions aligned to the right. */
export function PageHeader({ title, meta, actions }: PageHeaderProps) {
  return (
    <header className="page-header">
      <div className="page-header__titles">
        <h1 className="page-header__title">{title}</h1>
        {meta && <div className="page-header__meta">{meta}</div>}
      </div>
      {actions && <div className="page-header__actions">{actions}</div>}
    </header>
  );
}
