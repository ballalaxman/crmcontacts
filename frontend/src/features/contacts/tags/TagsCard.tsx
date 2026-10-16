import { useId } from 'react';
import { Badge } from '../../../components/ui';
import { TagChips } from './TagChips';
import { TagInput } from './TagInput';

interface TagsCardProps {
  tags: string[];
  suggestions: string[];
  adding: boolean;
  removing: string | null;
  onAdd: (tag: string) => void;
  onRemove: (tag: string) => void;
}

/** Tag changes are atomic on the server and don't bump the contact's version (no false conflicts). */
export function TagsCard({ tags, suggestions, adding, removing, onAdd, onRemove }: TagsCardProps) {
  const headingId = useId();
  return (
    <section className="card stack" aria-labelledby={headingId}>
      <div className="card__header">
        <h2 id={headingId}>Tags</h2>
        <Badge>{tags.length}</Badge>
      </div>
      <TagChips tags={tags} removing={removing} onRemove={onRemove} />
      <TagInput existing={tags} suggestions={suggestions} pending={adding} onAdd={onAdd} />
    </section>
  );
}
