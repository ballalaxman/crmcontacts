import { useRef } from 'react';
import { Button, Dialog, RelativeTime } from '../../../components/ui';
import { EDITABLE_FIELDS, type ContactDto, type EditableField } from '../../../contracts/api-types';
import { fieldLabel, formatValue } from '../../../lib/format';

interface ConflictDialogProps {
  /** The fields the user tried to save. */
  mine: Partial<Record<EditableField, string | null>>;
  /** The contact as it is now on the server. */
  latest: ContactDto;
  /** The contact as the user saw it when they started editing. Lets us tell real conflicts from untouched fields. */
  base?: ContactDto;
  busy?: boolean;
  /** Throw away my edits and show the latest values. */
  onDiscard: () => void;
  /** Save my edits again, on top of the latest version (an explicit, informed overwrite). */
  onApplyMine: () => void;
  /** Close and keep my edits in the form (Escape does the same). Saving again will ask again. */
  onKeepEditing?: () => void;
}

export function ConflictDialog({ mine, latest, base, busy = false, onDiscard, onApplyMine, onKeepEditing }: ConflictDialogProps) {
  // Focus starts on the choice that can't overwrite anyone else's work.
  const discardRef = useRef<HTMLButtonElement>(null);

  const rows = EDITABLE_FIELDS.filter((field) => field in mine).map((field) => {
    const yours = mine[field] ?? null;
    const theirs = latest[field] ?? null;
    // Without a base we can't know who changed what, so any difference counts.
    const changedByOthers = base ? (base[field] ?? null) !== theirs : yours !== theirs;
    return { field, yours, theirs, changedByOthers, conflict: changedByOthers && yours !== theirs };
  });

  return (
    <Dialog
      open
      role="alertdialog"
      title="This contact was changed by someone else"
      initialFocus={discardRef}
      onClose={onKeepEditing}
      description={
        <>
          It is now at version {latest.version} (updated <RelativeTime iso={latest.updatedAt} />). Nothing of yours was
          saved. Fields in red were changed by someone else after you opened this contact.
        </>
      }
      footer={
        <>
          {onKeepEditing && (
            <Button variant="ghost" disabled={busy} onClick={onKeepEditing}>
              Keep editing
            </Button>
          )}
          <Button ref={discardRef} disabled={busy} onClick={onDiscard}>
            Discard mine &amp; reload
          </Button>
          <Button variant="primary" loading={busy} onClick={onApplyMine}>
            {busy ? 'Applying…' : 'Apply my changes on top'}
          </Button>
        </>
      }
    >
      <div className="table-wrap">
        <table className="conflict-table">
          <thead>
            <tr>
              <th scope="col">Field</th>
              <th scope="col">Your value</th>
              <th scope="col">Latest value</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.field} data-conflict={r.conflict}>
                <th scope="row">{fieldLabel(r.field)}</th>
                <td>{formatValue(r.yours)}</td>
                <td>
                  <span className="conflict-table__value">{formatValue(r.theirs)}</span>
                  {r.conflict && <span className="conflict-table__note"> · changed by someone else</span>}
                  {!r.conflict && !r.changedByOthers && <span className="conflict-table__note muted"> · not changed by them</span>}
                  {!r.conflict && r.changedByOthers && <span className="conflict-table__note muted"> · same as yours</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Dialog>
  );
}
