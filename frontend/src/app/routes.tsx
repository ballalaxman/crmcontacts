import { Navigate, createBrowserRouter, type RouteObject } from 'react-router-dom';
import { ContactDetailPage } from '../pages/ContactDetailPage';
import { ContactsListPage } from '../pages/ContactsListPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { AppShell } from './AppShell';
import { RouteErrorPage } from './RouteErrorPage';

/** Shared by the app and the tests, so tests run the real routes. */
export const routes: RouteObject[] = [
  {
    path: '/',
    element: <AppShell />,
    errorElement: <RouteErrorPage />,
    children: [
      { index: true, element: <ContactsListPage /> },
      { path: 'contacts', element: <Navigate to="/" replace /> },
      { path: 'contacts/:id', element: <ContactDetailPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];

/** Opt in to React Router v7 behaviour now (and silence its deprecation warnings). */
export const ROUTER_FUTURE = {
  v7_relativeSplatPath: true,
  v7_fetcherPersist: true,
  v7_normalizeFormMethod: true,
  v7_partialHydration: true,
  v7_skipActionErrorRevalidation: true,
} as const;
export const PROVIDER_FUTURE = { v7_startTransition: true } as const;

/** A data router: needed for useBlocker (the unsaved-changes guard) and ScrollRestoration. */
export const createAppRouter = () => createBrowserRouter(routes, { future: ROUTER_FUTURE });
