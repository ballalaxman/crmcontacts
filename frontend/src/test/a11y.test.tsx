import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { mockViewport } from './media';
import { API, errorBody, makeContact, makePage } from './msw-handlers';
import { renderApp } from './render';
import { server } from './server';

// jsdom has no layout or canvas, so axe can't measure colour contrast here (it would only log errors).
// Contrast was measured separately for every token pair; see DECISIONS.md. All other rules run.
const audit = async () =>
  expect(await axe(document.body, { rules: { 'color-contrast': { enabled: false } } })).toHaveNoViolations();

const john = makeContact({ id: 'c1', tags: ['vip', 'lead', 'partner'] });
const jane = makeContact({ id: 'c2', firstName: 'Jane', lastName: 'Doe', email: undefined, phone: undefined, company: undefined });

describe('accessibility (axe)', () => {
  it('contacts list, desktop table, with a row selected', async () => {
    server.use(http.get(`${API}/contacts`, () => HttpResponse.json(makePage([john, jane]))));
    const { user } = renderApp('/');
    await screen.findByRole('link', { name: 'John Smith' });
    await user.click(screen.getByRole('checkbox', { name: 'Select John Smith' }));
    await audit();
  });

  it('contacts list, phone cards with the filters open', async () => {
    mockViewport({ compact: true });
    server.use(http.get(`${API}/contacts`, () => HttpResponse.json(makePage([john, jane]))));
    const { user } = renderApp('/');
    await screen.findByRole('link', { name: 'John Smith' });
    await user.click(screen.getByRole('button', { name: /Filters/ }));
    await audit();
  });

  it('empty results and the error state', async () => {
    server.use(http.get(`${API}/contacts`, () => HttpResponse.json(makePage([]))));
    renderApp('/?q=zzz');
    await screen.findByText('No contacts match your filters');
    await audit();
  });

  it('contact page', async () => {
    server.use(http.get(`${API}/contacts/c1`, () => HttpResponse.json(john)));
    renderApp('/contacts/c1');
    await screen.findByRole('heading', { level: 1, name: 'John Smith' });
    await audit();
  });

  it('conflict dialog', async () => {
    server.use(
      http.get(`${API}/contacts/c1`, () => HttpResponse.json(john)),
      http.patch(`${API}/contacts/c1`, () =>
        HttpResponse.json(errorBody('VERSION_CONFLICT', 'changed', { current: { ...john, version: 2, company: 'Globex' } }), { status: 409 })),
    );
    const { user } = renderApp('/contacts/c1');
    const company = await screen.findByLabelText('Company');
    await user.clear(company);
    await user.type(company, 'Initech');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await screen.findByRole('alertdialog');
    await audit();
  });

  it('leave-without-saving dialog', async () => {
    server.use(http.get(`${API}/contacts/c1`, () => HttpResponse.json(john)));
    const { user } = renderApp('/contacts/c1');
    await user.type(await screen.findByLabelText('Company'), ' Ltd');
    await user.click(screen.getByRole('link', { name: /Back to contacts/ }));
    const dialog = await screen.findByRole('alertdialog', { name: 'Leave without saving?' });
    await waitFor(() => expect(within(dialog).getByRole('button', { name: 'Stay' })).toHaveFocus());
    await audit();
  });
});
