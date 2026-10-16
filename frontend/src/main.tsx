import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { AppProviders } from './app/AppProviders';
import { createQueryClient } from './app/query-client';
import { PROVIDER_FUTURE, createAppRouter } from './app/routes';
import { createHttpClient } from './api/http-client';
import { config } from './config';
import { createContactsApi } from './features/contacts/api/contacts-api';
import { getStoredActor } from './lib/actor';
import './styles/index.css';

// Real wiring. Tests build the same tree with a fake-backed API (see src/test/render.tsx).
const http = createHttpClient(config.apiBaseUrl, getStoredActor, { timeoutMs: config.apiTimeoutMs });
const api = createContactsApi(http);
const queryClient = createQueryClient();
const router = createAppRouter();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProviders api={api} queryClient={queryClient}>
      <RouterProvider router={router} future={PROVIDER_FUTURE} />
    </AppProviders>
  </StrictMode>,
);
