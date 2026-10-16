import { useId, type FormEvent } from 'react';
import { Button, TextField } from '../../../components/ui';
import { LIMITS } from '../../../contracts/api-types';
import { useTagDraft } from '../tags/useTagDraft';

interface BulkActionBarProps {
  count: number;
  suggestions: string[];
  pending: boolean;
  onApply: (tag: string) => void;
  onClearSelection: () => void;
}

/** Floats at the bottom of the list while rows are selected. */
export function BulkActionBar({ count, suggestions, pending, onApply, onClearSelection }: BulkActionBarProps) {
  const draft = useTagDraft();
  const listId = useId();
  const errorId = useId();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (draft.tag && !pending) {
      onApply(draft.tag);
      draft.reset();
    }
  };

  return (
    <form className="bulk-bar" onSubmit={submit} aria-label="Bulk actions">
      <p className="bulk-bar__count">
        <strong>{count} selected</strong>
      </p>
      <div className="bulk-bar__field">
        <TextField
          label="Add tag"
          value={draft.value}
          list={listId}
          placeholder="e.g. vip"
          maxLength={LIMITS.tagMax}
          autoComplete="off"
          aria-invalid={draft.error ? true : undefined}
          aria-describedby={draft.error ? errorId : undefined}
          onChange={(e) => draft.setValue(e.target.value)}
        />
        <datalist id={listId}>
          {suggestions.map((s) => <option key={s} value={s} />)}
        </datalist>
      </div>
      <div className="bulk-bar__actions">
        <Button type="submit" variant="primary" icon="tag" loading={pending} disabled={!draft.tag}>
          {pending ? 'Applying…' : 'Apply'}
        </Button>
        <Button variant="ghost" onClick={onClearSelection}>
          Clear selection
        </Button>
      </div>
      {draft.error && (
        <p id={errorId} className="bulk-bar__error ui-field__error" role="alert">
          {draft.error}
        </p>
      )}
    </form>
  );
}
