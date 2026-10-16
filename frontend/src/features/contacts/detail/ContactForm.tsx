import { useEffect, useId, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, TextField } from '../../../components/ui';
import { EDITABLE_FIELDS, LIMITS, type ContactDto, type EditableField, type UpdateContactInput } from '../../../contracts/api-types';
import { contactFormSchema, type ContactFormValues } from '../../../contracts/validation';
import { FIELD_LABELS } from '../../../lib/format';
import type { FieldError } from './field-errors';

interface ContactFormProps {
  contact: ContactDto;
  onSubmit: (input: UpdateContactInput) => void;
  saving: boolean;
  /** Errors reported by the server (e.g. EMAIL_TAKEN), shown inline under the field. */
  serverErrors?: FieldError[];
  /** Lets the page warn before leaving with unsaved edits. */
  onDirtyChange?: (dirty: boolean) => void;
}

const FIELD_PROPS: Record<EditableField, { type: string; autoComplete: string; maxLength: number; wide?: boolean }> = {
  firstName: { type: 'text', autoComplete: 'given-name', maxLength: LIMITS.nameMax },
  lastName: { type: 'text', autoComplete: 'family-name', maxLength: LIMITS.nameMax },
  email: { type: 'email', autoComplete: 'off', maxLength: LIMITS.emailMax, wide: true },
  phone: { type: 'tel', autoComplete: 'off', maxLength: LIMITS.phoneMax },
  company: { type: 'text', autoComplete: 'off', maxLength: LIMITS.companyMax },
};

const toFormValues = (c: ContactDto): ContactFormValues => ({
  firstName: c.firstName,
  lastName: c.lastName,
  email: c.email ?? '',
  phone: c.phone ?? '',
  company: c.company ?? '',
});

/** Only the fields whose value really changed; '' means "cleared" and is sent as null. */
function changedFields(values: ContactFormValues, contact: ContactDto) {
  const patch: Partial<Record<EditableField, string | null>> = {};
  for (const field of EDITABLE_FIELDS) {
    const next = values[field] === '' ? null : values[field];
    if (next !== (contact[field] ?? null)) patch[field] = next;
  }
  return patch;
}

export function ContactForm({ contact, onSubmit, saving, serverErrors, onDirtyChange }: ContactFormProps) {
  const headingId = useId();
  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: toFormValues(contact),
    // Validate on blur and on change, with the same rules as the backend. Save stays disabled while
    // anything is invalid, and every reason is visible under its field.
    mode: 'all',
  });
  const { register, handleSubmit, reset, setError, formState: { errors, isDirty, isValid } } = form;

  // Reload the form when the contact's profile changes (a save, or "discard mine" after a conflict).
  // Keyed on version, not on the object: adding a tag replaces the object but must not wipe typed edits.
  const latest = useRef(contact);
  useEffect(() => {
    latest.current = contact;
  });
  useEffect(() => {
    reset(toFormValues(latest.current));
  }, [contact.id, contact.version, reset]);

  useEffect(() => {
    serverErrors?.forEach((e) => setError(e.field, { type: 'server', message: e.message }));
  }, [serverErrors, setError]);

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  const submit = handleSubmit((values) => {
    if (saving) return; // a second Enter while the first save is in flight
    const patch = changedFields(values, contact);
    if (Object.keys(patch).length === 0) {
      reset(toFormValues(contact)); // e.g. only whitespace changed
      return;
    }
    onSubmit({ version: contact.version, ...patch });
  });

  return (
    <form className="card contact-form" onSubmit={submit} noValidate aria-label="Edit contact" aria-describedby={headingId}>
      <div className="card__header">
        <h2 id={headingId}>Details</h2>
      </div>
      <div className="contact-form__grid">
        {EDITABLE_FIELDS.map((name) => {
          const { wide, ...inputProps } = FIELD_PROPS[name];
          return (
            <TextField
              key={name}
              label={FIELD_LABELS[name]}
              className={wide ? 'contact-form__wide' : undefined}
              error={errors[name]?.message}
              {...inputProps}
              {...register(name)}
            />
          );
        })}
      </div>
      <div className="card__footer">
        <Button variant="ghost" disabled={!isDirty || saving} onClick={() => reset(toFormValues(contact))}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" icon="check" loading={saving} disabled={!isDirty || !isValid}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </form>
  );
}
