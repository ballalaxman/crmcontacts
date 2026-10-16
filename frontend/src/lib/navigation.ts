import { isRecord } from './guards';

/**
 * The list's query string travels to the detail page in router state, so "Back to contacts" returns to the
 * same search, filters and sort.
 */
export interface BackState { from: string }

export const backState = (search: string): BackState => ({ from: search });

/** Reads router state written by `backState`; anything else (a pasted link, a reload) means no filters. */
export const readBackSearch = (state: unknown): string =>
  isRecord(state) && typeof state.from === 'string' && state.from.startsWith('?') ? state.from : '';
