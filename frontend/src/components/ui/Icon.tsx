import type { ReactNode } from 'react';

/** A small inline SVG set (stroke icons on a 24px grid). Decorative: always hidden from assistive tech. */
const PATHS = {
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>,
  filter: <path d="M4 5h16l-6 7.5V19l-4 1.5v-8z" />,
  x: <path d="M6 6l12 12M18 6 6 18" />,
  chevronLeft: <path d="m15 18-6-6 6-6" />,
  chevronRight: <path d="m9 18 6-6-6-6" />,
  chevronDown: <path d="m6 9 6 6 6-6" />,
  arrowLeft: <path d="M19 12H5m6-6-6 6 6 6" />,
  arrowUp: <path d="M12 19V5m-6 6 6-6 6 6" />,
  arrowDown: <path d="M12 5v14m-6-6 6 6 6-6" />,
  sort: <path d="M8 4v16m-4-4 4 4 4-4M16 20V4m-4 4 4-4 4 4" />,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  alert: <><path d="M12 3.5 2.5 20h19z" /><path d="M12 10v4.5m0 2.5h.01" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5m0-8h.01" /></>,
  tag: <><path d="M3 12V4h8l9.5 9.5-8 8z" /><circle cx="7.5" cy="8.5" r="1.25" /></>,
  edit: <path d="M4 20h4L19 9l-4-4L4 16zm9.5-13.5 4 4" />,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  wifiOff: <><path d="m3 3 18 18M8.5 16.5a5 5 0 0 1 7 0M5 12.5a10 10 0 0 1 4-2.3m10 2.3a10 10 0 0 0-3-1.9M2 8.8a15 15 0 0 1 5-3m15 3A15 15 0 0 0 11 5" /><path d="M12 20h.01" /></>,
  inbox: <><path d="M3 13h5l1.5 3h5l1.5-3h5" /><path d="M5.5 5h13L21 13v6H3v-6z" /></>,
  refresh: <path d="M20 11a8 8 0 1 0-2.3 5.7M20 5v6h-6" />,
  users: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7m2 2.5a6 6 0 0 1 3.5 6" /></>,
  userX: <><circle cx="10" cy="8" r="3.5" /><path d="M3.5 20a6.5 6.5 0 0 1 11-4.7M17 14l4 4m0-4-4 4" /></>,
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof PATHS;

const SIZES = { sm: 16, md: 20, lg: 32 } as const;

interface IconProps {
  name: IconName;
  size?: keyof typeof SIZES;
  className?: string;
}

export function Icon({ name, size = 'md', className }: IconProps) {
  const px = SIZES[size];
  return (
    <svg
      viewBox="0 0 24 24"
      width={px}
      height={px}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      {PATHS[name]}
    </svg>
  );
}
