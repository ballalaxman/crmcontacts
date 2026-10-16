import { useEffect, useRef, type RefObject } from 'react';

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

const focusablesIn = (root: HTMLElement) => Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE));

// The last element that really had focus. A button that disables itself while its action runs (Save →
// "Saving…") loses focus to <body> in browsers, so document.activeElement alone would forget where the user
// was by the time a dialog opens.
let lastFocused: HTMLElement | null = null;
document.addEventListener(
  'focusin',
  (e) => {
    if (e.target instanceof HTMLElement && e.target !== document.body) lastFocused = e.target;
  },
  true,
);

function currentFocus(): HTMLElement | null {
  const active = document.activeElement;
  return active instanceof HTMLElement && active !== document.body ? active : lastFocused;
}

interface FocusTrapOptions {
  /** Element to focus on open; defaults to the first focusable element. */
  initialFocus?: RefObject<HTMLElement>;
  /** Called on Escape. When omitted, Escape does nothing. */
  onEscape?: () => void;
}

/**
 * Keeps keyboard focus inside `container` while mounted: Tab and Shift+Tab wrap around, Escape calls
 * `onEscape`. On unmount, focus goes back to whatever was focused before (usually the button that opened it).
 */
export function useFocusTrap(container: RefObject<HTMLElement>, { initialFocus, onEscape }: FocusTrapOptions = {}) {
  const onEscapeRef = useRef(onEscape);
  useEffect(() => {
    onEscapeRef.current = onEscape;
  });

  useEffect(() => {
    const root = container.current;
    if (!root) return;
    const previouslyFocused = currentFocus();

    (initialFocus?.current ?? focusablesIn(root)[0] ?? root).focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onEscapeRef.current) {
        e.preventDefault();
        e.stopPropagation();
        onEscapeRef.current();
        return;
      }
      if (e.key !== 'Tab') return;
      const items = focusablesIn(root);
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (!root.contains(active)) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      if (previouslyFocused?.isConnected) previouslyFocused.focus();
    };
    // Runs once per open: the trap must not re-focus the first element on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
