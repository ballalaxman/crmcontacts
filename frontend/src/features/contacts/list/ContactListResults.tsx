import { Button, EmptyState, ErrorState } from '../../../components/ui';
import { describeError } from '../../../lib/error-messages';
import { cx } from '../../../lib/cx';
import { ContactCardList } from './ContactCardList';
import { ContactsTable } from './ContactsTable';
import { ListPagination } from './ListPagination';
import { ListSkeleton } from './ListSkeleton';
import { defaultOrderFor } from './list-params';
import type { BulkSelection } from './useBulkSelection';
import type { ContactListView } from './useContactList';

interface ContactListResultsProps {
  list: ContactListView;
  selection: BulkSelection;
  compact: boolean;
}

/** Picks exactly one state to show: loading, error, empty, or rows (possibly stale, with an inline error). */
export function ContactListResults({ list, selection, compact }: ContactListResultsProps) {
  const { params, setSort } = list;

  if (list.isInitialLoading) return <ListSkeleton compact={compact} />;

  if (list.error && !list.hasData) {
    return (
      <ErrorState
        variant="block"
        title="Couldn't load contacts"
        message={describeError(list.error)}
        onRetry={list.retry}
        retrying={list.isFetching}
      />
    );
  }

  if (list.hasData && list.items.length === 0) {
    return list.hasFilters ? (
      <EmptyState
        icon="search"
        title="No contacts match your filters"
        description="Try a different search, or remove some filters."
        action={<Button variant="primary" icon="x" onClick={list.clearFilters}>Clear filters</Button>}
      />
    ) : (
      <EmptyState icon="users" title="No contacts yet" description="Run the seed script in the backend to add sample data." />
    );
  }

  if (!list.hasData) return null;

  const onSort = (field: typeof params.sortBy) =>
    setSort(field, params.sortBy === field ? (params.order === 'asc' ? 'desc' : 'asc') : defaultOrderFor(field));

  return (
    <>
      {list.error && (
        <ErrorState
          title="Couldn't load the latest results"
          message={`${describeError(list.error)} Showing the previous results.`}
          onRetry={list.retry}
          retrying={list.isFetching}
        />
      )}
      <div className={cx('results', list.isStale && 'results--stale')} aria-busy={list.isFetching}>
        {compact ? (
          <ContactCardList contacts={list.items} selection={selection} />
        ) : (
          <ContactsTable contacts={list.items} selection={selection} sortBy={params.sortBy} order={params.order} onSort={onSort} />
        )}
      </div>
      <ListPagination
        pageNumber={list.pagination.pageNumber}
        canPrev={list.pagination.canPrev}
        hasNext={list.pagination.hasNext}
        total={list.total}
        range={list.pagination.range}
        busy={list.isFetching}
        onPrev={list.pagination.prev}
        onNext={list.pagination.next}
      />
    </>
  );
}
