import { useCallback, useState } from 'react';

interface Trail { key: string; stack: (string | null)[] }

/**
 * Keeps a stack of cursors so "Previous" works with keyset pagination.
 * Resets to page 1 whenever `resetKey` changes. The reset is derived while rendering, so there is never a
 * render (or request) that pairs the new filters with the old page's cursor.
 */
export function useCursorPagination(resetKey: string) {
  const [trail, setTrail] = useState<Trail>({ key: resetKey, stack: [null] });
  const stack = trail.key === resetKey ? trail.stack : [null];

  const reset = useCallback(() => setTrail({ key: resetKey, stack: [null] }), [resetKey]);

  return {
    cursor: stack[stack.length - 1],
    pageNumber: stack.length,
    canPrev: stack.length > 1,
    next: (cursor: string) => setTrail({ key: resetKey, stack: [...stack, cursor] }),
    prev: () => setTrail({ key: resetKey, stack: stack.length > 1 ? stack.slice(0, -1) : stack }),
    /** Back to page 1 with the same filters (e.g. after the server rejected a cursor). */
    reset,
  };
}
