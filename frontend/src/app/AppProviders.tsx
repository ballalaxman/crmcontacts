import type { ReactNode } from 'react';
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { ApiProvider } from '../api/ApiProvider';
import { ToastProvider } from '../components/ui';
import type { ContactsApi } from '../features/contacts/api/contacts-api';

interface AppProvidersProps {
  api: ContactsApi;
  queryClient: QueryClient;
  children: ReactNode;
}

/**
 * The only app-wide context: server-state cache, the API (injected so tests can fake it) and toasts.
 * Everything else is URL state, query state or local component state.
 */
export function AppProviders({ api, queryClient, children }: AppProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <ApiProvider api={api}>
        <ToastProvider>{children}</ToastProvider>
      </ApiProvider>
    </QueryClientProvider>
  );
}
