import { isEditableField, type EditableField } from '../contracts/api-types';

export const FIELD_LABELS: Record<EditableField, string> = {
  firstName: 'First name',
  lastName: 'Last name',
  email: 'Email',
  phone: 'Phone',
  company: 'Company',
};

export const fieldLabel = (field: string) => (isEditableField(field) ? FIELD_LABELS[field] : field);

const dateFmt = new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
const dateTimeFmt = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });

export const formatDate = (iso: string) => dateFmt.format(new Date(iso));
export const formatDateTime = (iso: string) => dateTimeFmt.format(new Date(iso));

const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 31_536_000], ['month', 2_592_000], ['day', 86_400], ['hour', 3_600], ['minute', 60],
];

export function formatRelative(iso: string, now = Date.now()) {
  const seconds = Math.round((new Date(iso).getTime() - now) / 1000);
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return rtf.format(Math.round(seconds / size), unit);
  }
  return 'just now';
}

export const fullName = (c: { firstName: string; lastName: string }) => `${c.firstName} ${c.lastName}`;

/** A field value for display: absent or empty becomes an em dash. */
export const formatValue = (v: string | null | undefined) => (v === null || v === undefined || v === '' ? '—' : v);

/** "1,250" or "10,000+" when the backend capped the count. */
export const formatTotal = (total: { count: number; capped: boolean }) =>
  `${total.count.toLocaleString()}${total.capped ? '+' : ''}`;

/** "1 contact" / "2 contacts" / "10,000+ contacts". */
export const formatCount = (total: { count: number; capped: boolean }, singular: string, plural: string) =>
  `${formatTotal(total)} ${total.count === 1 && !total.capped ? singular : plural}`;
