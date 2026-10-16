import { Link, useLocation } from 'react-router-dom';
import { Checkbox, Truncate } from '../../../components/ui';
import type { ContactDto } from '../../../contracts/api-types';
import { formatDate, fullName } from '../../../lib/format';
import { backState } from '../../../lib/navigation';
import { RowTags } from '../tags/RowTags';
import type { BulkSelection } from './useBulkSelection';

interface ContactCardListProps {
  contacts: ContactDto[];
  selection: BulkSelection;
}

/** Phone layout: one card per contact. The whole card opens the contact; the checkbox sits above that. */
export function ContactCardList({ contacts, selection }: ContactCardListProps) {
  const { search } = useLocation();

  return (
    <div className="contact-cards">
      <div className="contact-cards__toolbar">
        <Checkbox
          label="Select all contacts on this page"
          checked={selection.allSelected}
          indeterminate={selection.someSelected}
          onChange={selection.toggleAll}
        />
      </div>
      <ul className="contact-cards__list">
        {contacts.map((c) => {
          const name = fullName(c);
          const selected = selection.isSelected(c.id);
          return (
            <li key={c.id} className="contact-card" data-selected={selected || undefined}>
              <Checkbox
                className="contact-card__check"
                label={`Select ${name}`}
                hideLabel
                checked={selected}
                onChange={() => selection.toggle(c.id)}
              />
              <div className="contact-card__body">
                <div className="contact-card__head">
                  <Link to={`/contacts/${c.id}`} state={backState(search)} className="contact-link contact-card__link" title={name}>
                    {name}
                  </Link>
                  <span className="contact-card__date muted">{formatDate(c.createdAt)}</span>
                </div>
                <dl className="contact-card__details">
                  <CardDetail label="Email" value={c.email} />
                  {c.phone && <CardDetail label="Phone" value={c.phone} />}
                  {c.company && <CardDetail label="Company" value={c.company} />}
                </dl>
                <RowTags tags={c.tags} />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function CardDetail({ label, value }: { label: string; value?: string }) {
  return (
    <div className="contact-card__detail">
      <dt className="sr-only">{label}</dt>
      <dd>{value ? <Truncate text={value} /> : <span className="muted">No {label.toLowerCase()}</span>}</dd>
    </div>
  );
}
