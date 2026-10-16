import { Link } from 'react-router-dom';
import { EmptyState, buttonClassName } from '../components/ui';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export function NotFoundPage() {
  useDocumentTitle('Page not found');
  return (
    <EmptyState
      icon="search"
      title="Page not found"
      description="The address may be mistyped, or the page has moved."
      action={<Link to="/" className={buttonClassName({ variant: 'primary' })}>Back to contacts</Link>}
    />
  );
}
