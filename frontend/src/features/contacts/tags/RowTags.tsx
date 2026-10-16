import { Chip, EmptyValue } from '../../../components/ui';
import { ROW_TAGS_VISIBLE } from '../../../lib/constants';

/** Tags in a list row: the first few as chips, the rest folded into "+N" (all listed in its tooltip). */
export function RowTags({ tags }: { tags: string[] }) {
  if (tags.length === 0) return <EmptyValue label="No tags" />;
  const shown = tags.slice(0, ROW_TAGS_VISIBLE);
  const hidden = tags.slice(ROW_TAGS_VISIBLE);
  return (
    <ul className="chip-list" aria-label="Tags">
      {shown.map((tag) => (
        <li key={tag}><Chip>{tag}</Chip></li>
      ))}
      {hidden.length > 0 && (
        <li>
          <Chip variant="more" title={`Also: ${hidden.join(', ')}`}>{`+${hidden.length}`}</Chip>
        </li>
      )}
    </ul>
  );
}
