import { useEffect } from 'react';
import { APP_NAME } from '../lib/constants';

/** Sets the tab title to "<title> · CRM" while the component is mounted. */
export function useDocumentTitle(title: string) {
  useEffect(() => {
    document.title = `${title} · ${APP_NAME}`;
  }, [title]);
}
