import { cx } from '../../lib/cx';
import { Icon } from './Icon';
import { Spinner } from './Spinner';

interface ChipProps {
  children: string;
  /** Hover text; defaults to the chip text so a truncated tag can still be read in full. */
  title?: string;
  /** Adds a remove button with this accessible name. */
  onRemove?: () => void;
  removeLabel?: string;
  removing?: boolean;
  variant?: 'tag' | 'more';
  className?: string;
}

export function Chip({ children, title, onRemove, removeLabel, removing = false, variant = 'tag', className }: ChipProps) {
  return (
    <span className={cx('ui-chip', `ui-chip--${variant}`, className)} title={title ?? children}>
      <span className="ui-chip__text">{children}</span>
      {onRemove && (
        <button
          type="button"
          className="ui-chip__remove"
          aria-label={removeLabel ?? `Remove ${children}`}
          disabled={removing}
          aria-busy={removing || undefined}
          onClick={onRemove}
        >
          {removing ? <Spinner /> : <Icon name="x" size="sm" />}
        </button>
      )}
    </span>
  );
}
