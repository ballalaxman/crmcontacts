import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryRouter, useLocation, type RouteObject } from 'react-router-dom';
import { AppProviders } from '../app/AppProviders';
import { createQueryClient } from '../app/query-client';
import { PROVIDER_FUTURE, ROUTER_FUTURE, routes } from '../app/routes';
import { createHttpClient } from '../api/http-client';
import { createContactsApi } from '../features/contacts/api/contacts-api';
import { getStoredActor } from '../lib/actor';
import { API } from './msw-handlers';

/**
 * Exposes the router location so tests can assert on the URL. Rendered inside the routes (in step with the
 * page) and `hidden`, so it is not part of the page that accessibility checks look at.
 */
function LocationProbe() {
  const { pathname, search } = useLocation();
  return <output data-testid="location" hidden>{pathname + search}</output>;
}

/** The real routes, with the probe added next to the root layout. */
const testRoutes: RouteObject[] = routes.map((route) => ({
  ...route,
  element: (
    <>
      {route.element}
      <LocationProbe />
    </>
  ),
}));

/**
 * The whole app with the real routes and providers, pointed at the MSW-faked API and a fresh query cache.
 * Retries are off so error states appear immediately.
 */
export function renderApp(route = '/', { timeoutMs }: { timeoutMs?: number } = {}) {
  const queryClient = createQueryClient({ queries: { retry: false } });
  const api = createContactsApi(createHttpClient(API, getStoredActor, { timeoutMs }));
  const router = createMemoryRouter(testRoutes, { initialEntries: [route], future: ROUTER_FUTURE });
  const user = userEvent.setup();

  const utils = render(
    <AppProviders api={api} queryClient={queryClient}>
      <RouterProvider router={router} future={PROVIDER_FUTURE} />
    </AppProviders>,
  );
  return { user, router, queryClient, ...utils };
}
