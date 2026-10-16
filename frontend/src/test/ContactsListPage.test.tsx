import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { API, errorBody, makeContact, makePage } from './msw-handlers';
import { renderApp } from './render';
import { server } from './server';

const john = makeContact({ id: 'c1', firstName: 'John', lastName: 'Smith' });
const jane = makeContact({ id: 'c2', firstName: 'Jane', lastName: 'Doe', email: undefined, tags: ['vip'] });
const rows = () => screen.getAllByRole('row').slice(1); // without the header row
const location = () => screen.getByTestId('location').textContent;

describe('contacts list: states', () => {
  it('shows skeleton rows first, then the contacts and the total', async () => {
    server.use(http.get(`${API}/contacts`, () => HttpResponse.json(makePage([john, jane]))));
    renderApp('/');

    expect(screen.getByRole('status', { name: 'Loading contacts' })).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: 'John Smith' })).toBeInTheDocument();
    expect(screen.getByText(/2 contacts/)).toBeInTheDocument();
    expect(within(screen.getByRole('table')).getByText('vip')).toBeInTheDocument(); // Jane's tag chip
  });

  it('shows "10,000+" when the backend capped the count', async () => {
    server.use(http.get(`${API}/contacts`, () => HttpResponse.json(makePage([john], { total: { count: 10000, capped: true } }))));
    renderApp('/');
    expect(await screen.findByText(/10,000\+ contacts/)).toBeInTheDocument();
  });

  it('shows the empty state for no matches and "Clear filters" resets the URL and the search box', async () => {
    server.use(
      http.get(`${API}/contacts`, ({ request }) =>
        HttpResponse.json(makePage(new URL(request.url).searchParams.get('q') ? [] : [john])),
      ),
    );
    const { user } = renderApp('/?q=zzz');

    expect(await screen.findByText('No contacts match your filters')).toBeInTheDocument();
    expect(screen.getByLabelText('Search')).toHaveValue('zzz');

    await user.click(screen.getByRole('button', { name: 'Clear filters' }));

    expect(await screen.findByRole('link', { name: 'John Smith' })).toBeInTheDocument();
    expect(location()).toBe('/');
    expect(screen.getByLabelText('Search')).toHaveValue('');
  });

  it('shows a different message when there are no contacts at all', async () => {
    server.use(http.get(`${API}/contacts`, () => HttpResponse.json(makePage([]))));
    renderApp('/');
    expect(await screen.findByText('No contacts yet')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Clear filters' })).not.toBeInTheDocument();
  });

  it('shows the error banner for a server error and recovers on Retry', async () => {
    let calls = 0;
    server.use(
      http.get(`${API}/contacts`, () =>
        ++calls === 1
          ? HttpResponse.json(errorBody('INTERNAL_ERROR', 'boom'), { status: 500 })
          : HttpResponse.json(makePage([john])),
      ),
    );
    const { user } = renderApp('/');

    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong on our side.');
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('link', { name: 'John Smith' })).toBeInTheDocument();
  });

  it('explains a network failure', async () => {
    server.use(http.get(`${API}/contacts`, () => HttpResponse.error()));
    renderApp('/');
    expect(await screen.findByRole('alert')).toHaveTextContent('Cannot reach the server');
  });
});

describe('contacts list: URL parameters', () => {
  it('sends sanitized values when the URL was edited by hand', async () => {
    let requested: URLSearchParams | undefined;
    server.use(
      http.get(`${API}/contacts`, ({ request }) => {
        requested = new URL(request.url).searchParams;
        return HttpResponse.json(makePage([john]));
      }),
    );
    renderApp('/?sortBy=bogus&order=sideways&tagMode=x&limit=999');

    await screen.findByRole('link', { name: 'John Smith' });
    expect(requested!.get('sortBy')).toBe('createdAt');
    expect(requested!.get('order')).toBe('desc');
    expect(requested!.get('tagMode')).toBe('any');
    expect(requested!.get('limit')).toBe('25');
  });

  it('writes sort changes to the URL and asks the API for them', async () => {
    const seen: string[] = [];
    server.use(
      http.get(`${API}/contacts`, ({ request }) => {
        seen.push(new URL(request.url).search);
        return HttpResponse.json(makePage([john, jane]));
      }),
    );
    const { user } = renderApp('/');
    await screen.findByRole('link', { name: 'John Smith' });

    await user.click(screen.getByRole('button', { name: /Name/ }));

    await waitFor(() => expect(location()).toBe('/?sortBy=name&order=asc'));
    await waitFor(() => expect(seen.at(-1)).toContain('sortBy=name&order=asc'));
    expect(screen.getByRole('columnheader', { name: /Name/ })).toHaveAttribute('aria-sort', 'ascending');

    await user.click(screen.getByRole('button', { name: /Name/ }));
    await waitFor(() => expect(location()).toBe('/?sortBy=name&order=desc'));
  });

  it('debounces typing in the search box into a single URL update', async () => {
    const queries: (string | null)[] = [];
    server.use(
      http.get(`${API}/contacts`, ({ request }) => {
        queries.push(new URL(request.url).searchParams.get('q'));
        return HttpResponse.json(makePage([john]));
      }),
    );
    const { user } = renderApp('/');
    await screen.findByRole('link', { name: 'John Smith' });

    await user.type(screen.getByLabelText('Search'), 'john');

    await waitFor(() => expect(location()).toBe('/?q=john'));
    expect(queries.filter((q) => q !== null)).toEqual(['john']); // not one request per keystroke
  });
});

describe('contacts list: cursor pagination', () => {
  it('moves through pages with Next/Previous and keeps the total from page one', async () => {
    const cursors: (string | null)[] = [];
    server.use(
      http.get(`${API}/contacts`, ({ request }) => {
        const cursor = new URL(request.url).searchParams.get('cursor');
        cursors.push(cursor);
        return cursor === 'cursor-2'
          ? HttpResponse.json({ items: [makeContact({ id: 'c3', firstName: 'Third', lastName: 'Page' })], nextCursor: null })
          : HttpResponse.json(makePage([john, jane], { nextCursor: 'cursor-2', total: { count: 3, capped: false } }));
      }),
    );
    const { user } = renderApp('/');

    await screen.findByRole('link', { name: 'John Smith' });
    expect(screen.getByRole('button', { name: /Previous/ })).toBeDisabled();
    expect(screen.getByText(/Page 1 · 3 contacts/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Next/ }));

    expect(await screen.findByRole('link', { name: 'Third Page' })).toBeInTheDocument();
    expect(screen.getByText(/Page 2 · 3 contacts/)).toBeInTheDocument(); // total remembered
    expect(screen.getByRole('button', { name: /Next/ })).toBeDisabled();
    expect(cursors).toEqual([null, 'cursor-2']);

    await user.click(screen.getByRole('button', { name: /Previous/ }));
    expect(await screen.findByRole('link', { name: 'John Smith' })).toBeInTheDocument();
    expect(screen.getByText(/Page 1/)).toBeInTheDocument();
  });

  it('goes back to page one when a filter changes', async () => {
    const cursors: (string | null)[] = [];
    server.use(
      http.get(`${API}/contacts`, ({ request }) => {
        const url = new URL(request.url);
        cursors.push(url.searchParams.get('cursor'));
        return HttpResponse.json(makePage([john], { nextCursor: url.searchParams.get('cursor') ? null : 'cursor-2' }));
      }),
    );
    const { user } = renderApp('/');
    await screen.findByRole('link', { name: 'John Smith' });
    await user.click(screen.getByRole('button', { name: /Next/ }));
    await screen.findByText(/Page 2/);

    await user.type(screen.getByLabelText('Company'), 'acme');

    await screen.findByText(/Page 1/);
    // The new filter is never requested together with the old page's cursor.
    expect(cursors.at(-1)).toBeNull();
  });
});

describe('contacts list: bulk tagging', () => {
  it('tags the selected rows and reports the counts', async () => {
    let body: unknown;
    server.use(
      http.get(`${API}/contacts`, () => HttpResponse.json(makePage([john, jane]))),
      http.post(`${API}/contacts/bulk/tags`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ requested: 2, updated: 1, alreadyTagged: 1, notFound: 0 });
      }),
    );
    const { user } = renderApp('/');
    await screen.findByRole('link', { name: 'John Smith' });
    expect(screen.queryByRole('form', { name: 'Bulk actions' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('checkbox', { name: 'Select all contacts on this page' }));
    const bar = screen.getByRole('form', { name: 'Bulk actions' });
    expect(within(bar).getByText('2 selected')).toBeInTheDocument();
    expect(within(bar).getByRole('button', { name: 'Apply' })).toBeDisabled(); // no tag yet

    await user.type(within(bar).getByLabelText('Add tag'), 'VIP');
    await user.click(within(bar).getByRole('button', { name: 'Apply' }));

    expect(await screen.findByText('Tagged 1 · 1 already tagged · 0 not found')).toBeInTheDocument();
    expect(body).toEqual({ contactIds: ['c1', 'c2'], tag: 'vip' }); // normalized
    expect(screen.queryByRole('form', { name: 'Bulk actions' })).not.toBeInTheDocument(); // selection cleared
  });

  it('rejects an invalid tag before sending anything', async () => {
    server.use(http.get(`${API}/contacts`, () => HttpResponse.json(makePage([john]))));
    const { user } = renderApp('/');
    await screen.findByRole('link', { name: 'John Smith' });

    await user.click(screen.getByRole('checkbox', { name: 'Select John Smith' }));
    const bar = screen.getByRole('form', { name: 'Bulk actions' });
    await user.type(within(bar).getByLabelText('Add tag'), 'has space');

    expect(within(bar).getByRole('alert')).toHaveTextContent('Tag must be 1–30 chars');
    expect(within(bar).getByRole('button', { name: 'Apply' })).toBeDisabled();
  });

  it('clears the selection when the page changes', async () => {
    server.use(
      http.get(`${API}/contacts`, ({ request }) =>
        HttpResponse.json(makePage([john], { nextCursor: new URL(request.url).searchParams.get('cursor') ? null : 'cursor-2' })),
      ),
    );
    const { user } = renderApp('/');
    await screen.findByRole('link', { name: 'John Smith' });
    await user.click(screen.getByRole('checkbox', { name: 'Select John Smith' }));
    expect(screen.getByRole('form', { name: 'Bulk actions' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Next/ }));

    await screen.findByText(/Page 2/);
    expect(screen.queryByRole('form', { name: 'Bulk actions' })).not.toBeInTheDocument();
    expect(rows()).toHaveLength(1);
  });
});
