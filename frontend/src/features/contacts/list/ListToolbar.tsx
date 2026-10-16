import { useId, useState } from 'react';
import { Button, SelectField, TextField } from '../../../components/ui';
import { LIMITS, type SortBy, type SortOrder } from '../../../contracts/api-types';
import { cx } from '../../../lib/cx';
import type { ContactListParams } from '../api/contacts-api';
import { useTags } from '../hooks/queries';
import { DebouncedField } from './DebouncedField';
import { SORT_OPTIONS, fromSortValue, toSortValue } from './list-params';
import { TagFilter } from './TagFilter';

interface ListToolbarProps {
  params: ContactListParams;
  onChange: (patch: Partial<ContactListParams>) => void;
  onSortChange: (sortBy: SortBy, order: SortOrder) => void;
  onClear: () => void;
  hasFilters: boolean;
  activeFilterCount: number;
  /** Phones: filters fold away behind a "Filters" toggle. */
  collapsible: boolean;
}

export function ListToolbar({ params, onChange, onSortChange, onClear, hasFilters, activeFilterCount, collapsible }: ListToolbarProps) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const panelId = useId();
  const tags = useTags();
  const showFilters = !collapsible || filtersOpen;
  const dateRangeInvalid = Boolean(params.createdFrom && params.createdTo && params.createdFrom > params.createdTo);

  return (
    <section className="list-toolbar" aria-label="Search, sort and filter">
      <div className="list-toolbar__primary" role="search">
        <DebouncedField
          className="list-toolbar__search"
          label="Search"
          hideLabel
          type="search"
          icon="search"
          placeholder="Search name, email or phone"
          maxLength={LIMITS.searchMax}
          value={params.q ?? ''}
          onCommit={(q) => onChange({ q })}
        />
        <SelectField
          className="list-toolbar__sort"
          label="Sort by"
          hideLabel
          options={SORT_OPTIONS}
          value={toSortValue(params.sortBy, params.order)}
          onChange={(e) => {
            const { sortBy, order } = fromSortValue(e.target.value);
            onSortChange(sortBy, order);
          }}
        />
        {collapsible && (
          <Button
            icon="filter"
            aria-expanded={filtersOpen}
            aria-controls={panelId}
            onClick={() => setFiltersOpen((o) => !o)}
            className={cx(activeFilterCount > 0 && 'ui-popover__trigger--active')}
          >
            Filters
            {activeFilterCount > 0 && <span className="ui-count">{activeFilterCount}</span>}
          </Button>
        )}
      </div>

      <div id={panelId} className="list-toolbar__filters" hidden={!showFilters}>
        <TagFilter available={tags.data ?? []} selected={params.tags} mode={params.tagMode} onChange={onChange} />
        <DebouncedField
          label="Company"
          placeholder="Starts with…"
          maxLength={LIMITS.companyMax}
          value={params.company ?? ''}
          onCommit={(company) => onChange({ company })}
        />
        <DateFilter label="Created from" value={params.createdFrom} onChange={(createdFrom) => onChange({ createdFrom })} />
        <DateFilter
          label="Created to"
          value={params.createdTo}
          onChange={(createdTo) => onChange({ createdTo })}
          error={dateRangeInvalid ? 'Ends before the start date' : undefined}
        />
        {hasFilters && (
          <Button variant="ghost" icon="x" className="list-toolbar__clear" onClick={onClear}>
            Clear all
          </Button>
        )}
      </div>
    </section>
  );
}

interface DateFilterProps {
  label: string;
  value?: string;
  onChange: (value: string) => void;
  error?: string;
}

/** A native date input (YYYY-MM-DD) inside the standard field shell. */
function DateFilter({ label, value, onChange, error }: DateFilterProps) {
  return <TextField type="date" label={label} value={value ?? ''} error={error} onChange={(e) => onChange(e.target.value)} />;
}
