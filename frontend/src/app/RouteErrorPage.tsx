import { Link, useRouteError } from 'react-router-dom';
import { ErrorState, buttonClassName } from '../components/ui';

/** Last line of defence: a render error anywhere in a route shows this instead of a blank page. */
export function RouteErrorPage() {
  const error = useRouteError();
  const detail = error instanceof Error ? error.message : undefined;
  return (
    <main className="page">
      <ErrorState
        variant="block"
        title="Something went wrong"
        message={detail ? `The page crashed: ${detail}` : 'The page crashed unexpectedly.'}
        onRetry={() => window.location.reload()}
      >
        <Link to="/" className={buttonClassName({ size: 'sm' })}>Back to contacts</Link>
      </ErrorState>
    </main>
  );
}
