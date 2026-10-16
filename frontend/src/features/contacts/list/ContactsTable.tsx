import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Checkbox, EmptyValue, Icon, Truncate } from '../../../components/ui';
import type { ContactDto, SortBy, SortOrder } from '../../../contracts/api-types';
import { formatDate, fullName } from '../../../lib/format';
import { backState } from '../../../lib/navigation';
import { RowTags } from '../tags/RowTags';
import type { BulkSelection } from './useBulkSelection';

interface ContactsTableProps {
  contacts: ContactDto[];
  selection: BulkSelection;
  sortBy: SortBy;
  order: SortOrder;
  onSort: (field: SortBy) => void;
}

/** Desktop and tablet layout. Each name is a real link (keyboard, middle-click); the row is also clickable. */
export function ContactsTable({ contacts, selection, sortBy, order, onSort }: ContactsTableProps) {
  const navigate = useNavigate();
  const { search } = useLocation();

  return (
    <div className="table-wrap">
      <table className="contacts-table">
        <caption className="sr-only">Contacts</caption>
        <colgroup>
          <col className="col-check" />
          <col className="col-name" />
          <col className="col-email" />
          <col className="col-phone" />
          <col className="col-company" />
          <col className="col-tags" />
          <col className="col-created" />
        </colgroup>
        <thead>
          <tr>
            <th scope="col">
              <Checkbox
                label="Select all contacts on this page"
                hideLabel
                checked={selection.allSelected}
                indeterminate={selection.someSelected}
                onChange={selection.toggleAll}
              />
            </th>
            <SortHeader label="Name" field="name" sortBy={sortBy} order={order} onSort={onSort} />
            <th scope="col">Email</th>
            <th scope="col">Phone</th>
            <th scope="col">Company</th>
            <th scope="col">Tags</th>
            <SortHeader label="Created" field="createdAt" sortBy={sortBy} order={order} onSort={onSort} />
          </tr>
        </thead>
        <tbody>
          {contacts.map((c) => {
            const name = fullName(c);
            const selected = selection.isSelected(c.id);
            return (
              <tr
                key={c.id}
                className="contacts-table__row"
                data-selected={selected || undefined}
                onClick={() => navigate(`/contacts/${c.id}`, { state: backState(search) })}
              >
                <td onClick={(e) => e.stopPropagation()}>
                  <Checkbox label={`Select ${name}`} hideLabel checked={selected} onChange={() => selection.toggle(c.id)} />
                </td>
                <td>
                  <Link
                    to={`/contacts/${c.id}`}
                    state={backState(search)}
                    className="contact-link"
                    title={name}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {name}
                  </Link>
                </td>
                <td>{c.email ? <Truncate text={c.email} /> : <EmptyValue label="No email" />}</td>
                <td className="nowrap">{c.phone ?? <EmptyValue label="No phone" />}</td>
                <td>{c.company ? <Truncate text={c.company} /> : <EmptyValue label="No company" />}</td>
                <td><RowTags tags={c.tags} /></td>
                <td className="nowrap">{formatDate(c.createdAt)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

interface SortHeaderProps {
  label: string;
  field: SortBy;
  sortBy: SortBy;
  order: SortOrder;
  onSort: (field: SortBy) => void;
}

function SortHeader({ label, field, sortBy, order, onSort }: SortHeaderProps) {
  const active = sortBy === field;
  return (
    <th scope="col" aria-sort={active ? (order === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button type="button" className="sort-button" data-active={active || undefined} onClick={() => onSort(field)}>
        {label}
        <Icon name={active ? (order === 'asc' ? 'arrowUp' : 'arrowDown') : 'sort'} size="sm" />
      </button>
    </th>
  );
}
