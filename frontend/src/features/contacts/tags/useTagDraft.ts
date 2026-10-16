import { useState } from 'react';
import { tagSchema } from '../../../contracts/validation';

/**
 * A tag being typed: the raw text, the normalized tag once it is valid, and the reason when it isn't.
 * Shared by the tag input on the contact page and the bulk bar, so both apply the backend's rules.
 */
export function useTagDraft(existing: readonly string[] = []) {
  const [value, setValue] = useState('');

  let tag: string | null = null;
  let error: string | null = null;
  if (value) {
    const parsed = tagSchema.safeParse(value);
    if (!parsed.success) error = parsed.error.issues[0]?.message ?? 'Invalid tag';
    else if (existing.includes(parsed.data)) error = 'Already tagged';
    else tag = parsed.data;
  }

  return { value, setValue, tag, error, reset: () => setValue('') };
}
