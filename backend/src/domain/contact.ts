export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  company?: string;
  tags: string[];
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export const EDITABLE_FIELDS = ['firstName', 'lastName', 'email', 'phone', 'company'] as const;
export type EditableField = (typeof EDITABLE_FIELDS)[number];
export type EditableValues = Partial<Record<EditableField, string | null>>;

export interface FieldChange { field: EditableField; from: string | null; to: string | null; }

/** A patch the repository can apply: values to $set and fields to $unset. */
export interface ContactPatch { set: Record<string, unknown>; unset: string[]; }

/** Names can be changed but never cleared. */
const REQUIRED_FIELDS: readonly EditableField[] = ['firstName', 'lastName'];

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');

export function deriveSearchFields(c: {
  firstName: string; lastName: string; phone?: string | null; company?: string | null;
}) {
  const f = norm(c.firstName);
  const l = norm(c.lastName);
  const digits = c.phone ? c.phone.replace(/\D/g, '') : '';
  return {
    nameKeys: [`${f} ${l}`, `${l} ${f}`],
    sortName: `${f} ${l}`,
    phoneKeys: digits ? [...new Set([digits, digits.slice(-10)])] : [],
    companyLower: c.company ? norm(c.company) : null,
  };
}

/** The value a field will have once `incoming` is applied (null = absent). */
function effectiveValue(current: Contact, incoming: EditableValues, field: EditableField): string | null {
  const cur = current[field] ?? null;
  if (!(field in incoming)) return cur;
  const v = incoming[field];
  if (v === undefined) return cur;
  if (v === null || v === '') return REQUIRED_FIELDS.includes(field) ? cur : null;
  return v;
}

export function diffContact(current: Contact, incoming: EditableValues): FieldChange[] {
  return EDITABLE_FIELDS.filter((f) => f in incoming)
    .map((f) => ({ field: f, from: current[f] ?? null, to: effectiveValue(current, incoming, f) }))
    .filter((c) => c.from !== c.to);
}

/** Pure: builds the $set/$unset patch, including derived search fields. */
export function buildPatch(current: Contact, incoming: EditableValues): ContactPatch {
  const set: Record<string, unknown> = {};
  const unset: string[] = [];

  for (const f of EDITABLE_FIELDS) {
    if (!(f in incoming)) continue;
    const to = effectiveValue(current, incoming, f);
    if (to === (current[f] ?? null)) continue; // unchanged: don't write it back
    if (to === null) unset.push(f);
    else set[f] = to;
  }

  const derived = deriveSearchFields({
    firstName: effectiveValue(current, incoming, 'firstName') ?? current.firstName,
    lastName: effectiveValue(current, incoming, 'lastName') ?? current.lastName,
    phone: effectiveValue(current, incoming, 'phone'),
    company: effectiveValue(current, incoming, 'company'),
  });
  for (const [k, v] of Object.entries(derived)) {
    if (v === null) unset.push(k);
    else set[k] = v;
  }
  return { set, unset };
}
