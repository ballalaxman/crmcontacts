import { PageHeader } from '../components/layout/PageHeader';
import { SlowServerNotice } from '../components/layout/Notices';
import { useTags } from '../features/contacts/hooks/queries';
import { BulkActionBar } from '../features/contacts/list/BulkActionBar';
import { ContactListResults } from '../features/contacts/list/ContactListResults';
import { ListToolbar } from '../features/contacts/list/ListToolbar';
import { useBulkSelection } from '../features/contacts/list/useBulkSelection';
import { useBulkTagAction } from '../features/contacts/list/useBulkTagAction';
import { useContactList } from '../features/contacts/list/useContactList';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { useSlowFlag } from '../hooks/useSlowFlag';
import { MEDIA } from '../lib/breakpoints';

/** Composes the list feature: header, toolbar, results and the bulk bar. No logic of its own. */
export function ContactsListPage() {
  useDocumentTitle('Contacts');
  const compact = useMediaQuery(MEDIA.compact);
  const list = useContactList();
  const visibleIds = list.items.map((c) => c.id);
  const selection = useBulkSelection(visibleIds, list.viewKey);
  const bulk = useBulkTagAction(selection);
  const tags = useTags();
  const slow = useSlowFlag(list.isInitialLoading);

  return (
    <>
      <PageHeader title="Contacts" meta="Search, filter and tag your contacts." />
      <ListToolbar
        params={list.params}
        onChange={list.setParams}
        onSortChange={list.setSort}
        onClear={list.clearFilters}
        hasFilters={list.hasFilters}
        activeFilterCount={list.activeFilterCount}
        collapsible={compact}
      />
      {slow && <SlowServerNotice />}
      <ContactListResults list={list} selection={selection} compact={compact} />
      {selection.count > 0 && (
        <BulkActionBar
          count={selection.count}
          suggestions={tags.data ?? []}
          pending={bulk.pending}
          onApply={bulk.apply}
          onClearSelection={selection.clear}
        />
      )}
    </>
  );
}
