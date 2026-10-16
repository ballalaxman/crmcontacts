import { useId } from 'react';
import { Button, Checkbox, Popover, SegmentedControl } from '../../../components/ui';
import { TAG_MODES, type TagMode } from '../../../contracts/api-types';

const MODE_LABELS: Record<TagMode, string> = { any: 'Any of these', all: 'All of these' };
const MODE_OPTIONS = TAG_MODES.map((value) => ({ value, label: MODE_LABELS[value] }));

interface TagFilterProps {
  available: string[];
  selected: string[];
  mode: TagMode;
  onChange: (patch: { tags?: string[]; tagMode?: TagMode }) => void;
}

export function TagFilter({ available, selected, mode, onChange }: TagFilterProps) {
  const labelId = useId();
  const summary = selected.length === 0 ? 'Any tag' : selected.length <= 2 ? selected.join(', ') : `${selected.length} tags`;

  const toggle = (tag: string) =>
    onChange({ tags: selected.includes(tag) ? selected.filter((t) => t !== tag) : [...selected, tag] });

  return (
    <div className="ui-field tag-filter">
      <span id={labelId} className="ui-field__label">Tags</span>
      <Popover
        label={<span className="tag-filter__summary">{summary}</span>}
        labelledBy={labelId}
        panelLabel="Filter by tags"
        count={selected.length}
      >
        <div className="tag-filter__panel">
          <SegmentedControl legend="Match" name="tagMode" value={mode} options={MODE_OPTIONS} onChange={(tagMode) => onChange({ tagMode })} />
          <div className="tag-filter__list" role="group" aria-label="Tags">
            {available.length === 0 && <p className="muted text-sm">No tags yet</p>}
            {available.map((tag) => (
              <Checkbox key={tag} label={tag} checked={selected.includes(tag)} onChange={() => toggle(tag)} />
            ))}
          </div>
          {selected.length > 0 && (
            <Button size="sm" variant="ghost" icon="x" onClick={() => onChange({ tags: [] })}>
              Clear tags
            </Button>
          )}
        </div>
      </Popover>
    </div>
  );
}
