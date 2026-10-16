import { createContext, useContext, type ReactNode } from 'react';
import type { ContactsApi } from '../features/contacts/api/contacts-api';

const ApiContext = createContext<ContactsApi | null>(null);

/** Dependency injection: hooks get the API from context, so tests can pass a fake. */
export const ApiProvider = ({ api, children }: { api: ContactsApi; children: ReactNode }) => (
  <ApiContext.Provider value={api}>{children}</ApiContext.Provider>
);

export function useApi(): ContactsApi {
  const api = useContext(ApiContext);
  if (!api) throw new Error('useApi must be used inside ApiProvider');
  return api;
}
