import { useId, type FormEvent } from 'react';
import { Button, TextField } from '../../../components/ui';
import { LIMITS } from '../../../contracts/api-types';
import { useTagDraft } from './useTagDraft';

interface TagInputProps {
  /** Tags the contact already has (rejected before any request is made). */
  existing: string[];
  /** All known tags, offered as autocomplete. */
  suggestions: string[];
  pending: boolean;
  onAdd: (tag: string) => void;
}

export function TagInput({ existing, suggestions, pending, onAdd }: TagInputProps) {
  const draft = useTagDraft(existing);
  const listId = useId();
  const errorId = useId();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (draft.tag && !pending) {
      onAdd(draft.tag);
      draft.reset();
    }
  };

  return (
    <form className="tag-input" onSubmit={submit} aria-label="Add a tag">
      <div className="tag-input__row">
        <TextField
          label="New tag"
          hideLabel
          className="tag-input__field"
          value={draft.value}
          list={listId}
          placeholder="Add tag…"
          maxLength={LIMITS.tagMax}
          autoComplete="off"
          aria-invalid={draft.error ? true : undefined}
          aria-describedby={draft.error ? errorId : undefined}
          onChange={(e) => draft.setValue(e.target.value)}
        />
        <datalist id={listId}>
          {suggestions.filter((s) => !existing.includes(s)).map((s) => <option key={s} value={s} />)}
        </datalist>
        <Button type="submit" icon="plus" loading={pending} disabled={!draft.tag}>
          {pending ? 'Adding…' : 'Add'}
        </Button>
      </div>
      {draft.error && (
        <p id={errorId} className="ui-field__error" role="alert">
          {draft.error}
        </p>
      )}
    </form>
  );
}
