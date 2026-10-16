import { Chip } from '../../../components/ui';

interface TagChipsProps {
  tags: string[];
  onRemove: (tag: string) => void;
  /** The tag whose removal is in flight. */
  removing?: string | null;
}

/** A contact's tags, each with a remove button (40px hit area). */
export function TagChips({ tags, onRemove, removing }: TagChipsProps) {
  if (tags.length === 0) return <p className="muted text-sm">No tags yet. Add one below.</p>;
  return (
    <ul className="chip-list chip-list--roomy" aria-label="Tags">
      {tags.map((tag) => (
        <li key={tag}>
          <Chip removeLabel={`Remove tag ${tag}`} removing={removing === tag} onRemove={() => onRemove(tag)}>
            {tag}
          </Chip>
        </li>
      ))}
    </ul>
  );
}
