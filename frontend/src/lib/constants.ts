/** UI timing and size constants, in one place so behaviour is easy to tune and to explain. */

/** Wait this long after the last keystroke before searching. */
export const SEARCH_DEBOUNCE_MS = 300;

/** Show the slow-server notice when a first load takes longer than this. */
export const SLOW_REQUEST_MS = 3000;

/** How long toasts stay up. Errors stay longer because they usually need reading. */
export const TOAST_DURATION_MS = { default: 5000, error: 8000 } as const;
export const TOAST_MAX_VISIBLE = 4;

/** Tags shown per table row before collapsing into "+N" (two fit the column at every width). */
export const ROW_TAGS_VISIBLE = 2;

/** Entries loaded in the activity timeline. */
export const ACTIVITY_PAGE_SIZE = 20;

/** Product name used in document titles. */
export const APP_NAME = 'CRM';
