import { cx } from '../../lib/cx';

interface SkeletonProps {
  /** Shape and height. */
  variant?: 'text' | 'title' | 'control' | 'block' | 'circle';
  /** Width as a share of the container. */
  width?: 'xs' | 'sm' | 'md' | 'lg' | 'full';
  className?: string;
}

/** A shimmering placeholder. Decorative: the surrounding container carries role="status". */
export function Skeleton({ variant = 'text', width = 'full', className }: SkeletonProps) {
  return <span className={cx('ui-skeleton', `ui-skeleton--${variant}`, `ui-skeleton--w-${width}`, className)} aria-hidden="true" />;
}

const WIDTHS = ['lg', 'md', 'full', 'sm'] as const;

/** Varies widths in a fixed pattern so a skeleton list looks like text, not stripes. */
export const skeletonWidth = (i: number) => WIDTHS[i % WIDTHS.length];
