/**
 * Media queries shared with CSS. The pixel values must match the @media rules in the stylesheets
 * (CSS custom properties can't be used inside @media).
 */
export const MEDIA = {
  /** Phones: card list instead of table, filters collapsed. */
  compact: '(max-width: 767.98px)',
} as const;
