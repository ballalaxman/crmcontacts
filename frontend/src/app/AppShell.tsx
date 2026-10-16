import { Link, Outlet, ScrollRestoration } from 'react-router-dom';
import { ActorSwitcher } from '../components/layout/ActorSwitcher';
import { OfflineNotice } from '../components/layout/Notices';
import { Icon } from '../components/ui';

/** Header, offline notice and the routed page. Scroll position is restored on back/forward. */
export function AppShell() {
  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <header className="app-header">
        <div className="app-header__inner">
          <Link to="/" className="app-brand">
            <span className="app-brand__mark"><Icon name="users" size="sm" /></span>
            CRM Contacts
          </Link>
          <ActorSwitcher />
        </div>
      </header>
      <main id="main" className="page" tabIndex={-1}>
        <OfflineNotice />
        <Outlet />
      </main>
      <ScrollRestoration />
    </>
  );
}
