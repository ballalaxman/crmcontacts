/** A visible dash for "no value", read out by screen readers as the given phrase (e.g. "No email"). */
export function EmptyValue({ label }: { label: string }) {
  return (
    <span className="muted">
      <span aria-hidden="true">—</span>
      <span className="sr-only">{label}</span>
    </span>
  );
}
