/** Narrowing helpers for data we didn't create ourselves (API bodies, router state). */
export const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
