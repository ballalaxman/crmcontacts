import { Button, Spinner } from '../../../components/ui';
import { formatCount } from '../../../lib/format';

interface ListPaginationProps {
  pageNumber: number;
  canPrev: boolean;
  hasNext: boolean;
  total: { count: number; capped: boolean } | null;
  range: { from: number; to: number } | null;
  busy: boolean;
  onPrev: () => void;
  onNext: () => void;
}

/** Previous / Next over the cursor stack. Keyset pagination has no "jump to page N" by design. */
export function ListPagination({ pageNumber, canPrev, hasNext, total, range, busy, onPrev, onNext }: ListPaginationProps) {
  return (
    <nav className="pagination" aria-label="Pagination">
      <Button icon="chevronLeft" disabled={!canPrev || busy} onClick={onPrev}>
        Previous
      </Button>
      <div className="pagination__status">
        <p aria-live="polite">
          Page {pageNumber}
          {total && ` · ${formatCount(total, 'contact', 'contacts')}`}
        </p>
        {range && <p className="pagination__range muted">Showing {range.from.toLocaleString()}–{range.to.toLocaleString()}</p>}
        {busy && <Spinner label="Loading page" className="pagination__spinner" />}
      </div>
      <Button iconEnd="chevronRight" disabled={!hasNext || busy} onClick={onNext}>
        Next
      </Button>
    </nav>
  );
}
