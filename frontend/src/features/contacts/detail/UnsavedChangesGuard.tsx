import { useEffect } from 'react';
import { useBlocker } from 'react-router-dom';
import { ConfirmDialog } from '../../../components/ui';

/**
 * Mounted only while the form has unsaved edits, so no navigation blocker exists the rest of the time.
 * - In-app navigation to another page waits for "Leave" (React Router's blocker; Escape or "Stay" cancels).
 * - Closing or reloading the tab triggers the browser's own "Leave site?" prompt.
 */
export function UnsavedChangesGuard({ subject }: { subject: string }) {
  const blocker = useBlocker(({ currentLocation, nextLocation }) => currentLocation.pathname !== nextLocation.pathname);

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Older browsers need a returnValue to show the prompt.
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, []);

  return (
    <ConfirmDialog
      open={blocker.state === 'blocked'}
      title="Leave without saving?"
      description={`Your changes to ${subject} haven't been saved and will be lost.`}
      confirmLabel="Leave"
      cancelLabel="Stay"
      confirmVariant="danger"
      onConfirm={() => blocker.proceed?.()}
      onCancel={() => blocker.reset?.()}
    />
  );
}
