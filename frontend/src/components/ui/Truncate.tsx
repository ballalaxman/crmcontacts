import { cx } from '../../lib/cx';

/** One line of text with an ellipsis when it doesn't fit; the full text is in the hover tooltip. */
export function Truncate({ text, className }: { text: string; className?: string }) {
  return (
    <span className={cx('truncate', className)} title={text}>
      {text}
    </span>
  );
}
