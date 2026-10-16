import { act, screen, waitFor, within } from '@testing-library/react';
import { delay, http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { mockViewport } from './media';
import { API, errorBody, makeContact, makePage } from './msw-handlers';
import { renderApp } from './render';
import { server } from './server';

const john = makeContact({ id: 'c1', firstName: 'John', lastName: 'Smith' });
const jane = makeContact({ id: 'c2', firstName: 'Jane', lastName: 'Doe' });
const third = makeContact({ id: 'c3', firstName: 'Third', lastName: 'Page' });
const location = () => screen.getByTestId('location').textContent;

describe('list: failures while paging', () => {
  it('keeps the previous rows on screen with an inline error when the next page fails, and Retry recovers', async () => {
    let page2Calls = 0;
    server.use(
      http.get(`${API}/contacts`, ({ request }) => {
        if (new URL(request.url).searchParams.get('cursor') !== 'cursor-2') {
          return HttpResponse.json(makePage([john, jane], { nextCursor: 'cursor-2' }));
        }
        return ++page2Calls === 1
          ? HttpResponse.json(errorBody('INTERNAL_ERROR', 'boom'), { status: 500 })
          : HttpResponse.json({ items: [third], nextCursor: null });
      }),
    );
    const { user } = renderApp('/');
    await screen.findByRole('link', { name: 'John Smith' });

    await user.click(screen.getByRole('button', { name: /Next/ }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent("Couldn't load the latest results");
    expect(screen.getByRole('link', { name: 'John Smith' })).toBeInTheDocument(); // rows didn't vanish
    expect(screen.getByRole('button', { name: /Next/ })).toBeDisabled(); // never page on from stale rows

    await user.click(within(alert).getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('link', { name: 'Third Page' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('goes back to page 1 with a notice when the server rejects an expired cursor', async () => {
    const cursors: (string | null)[] = [];
    server.use(
      http.get(`${API}/contacts`, ({ request }) => {
        const cursor = new URL(request.url).searchParams.get('cursor');
        cursors.push(cursor);
        return cursor
          ? HttpResponse.json(errorBody('INVALID_CURSOR', 'Invalid pagination cursor'), { status: 400 })
          : HttpResponse.json(makePage([john], { nextCursor: 'stale-cursor' }));
      }),
    );
    const { user } = renderApp('/');
    await screen.findByRole('link', { name: 'John Smith' });

    await user.click(screen.getByRole('button', { name: /Next/ }));

    expect(await screen.findByText('That page has expired, so the list went back to page 1.')).toBeInTheDocument();
    expect(screen.getByText(/Page 1/)).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument(); // handled, not shown as an error
    expect(cursors).toEqual([null, 'stale-cursor']);
  });
});

describe('list: request handling', () => {
  it('cancels a request whose answer is no longer wanted (the user changed the sort meanwhile)', async () => {
    let firstAborted: boolean | undefined;
    server.use(
      http.get(`${API}/contacts`, async ({ request }) => {
        if (new URL(request.url).searchParams.get('sortBy') === 'name') return HttpResponse.json(makePage([jane]));
        await delay(300);
        firstAborted = request.signal.aborted;
        return HttpResponse.json(makePage([john]));
      }),
    );
    const { user } = renderApp('/');

    await user.selectOptions(screen.getByLabelText('Sort by'), 'name:asc');

    expect(await screen.findByRole('link', { name: 'Jane Doe' })).toBeInTheDocument();
    await waitFor(() => expect(firstAborted).toBe(true));
  });

  it('never sends a hand-edited date the API would reject', async () => {
    let requested: URLSearchParams | undefined;
    server.use(
      http.get(`${API}/contacts`, ({ request }) => {
        requested = new URL(request.url).searchParams;
        return HttpResponse.json(makePage([john]));
      }),
    );
    renderApp('/?createdFrom=yesterday&createdTo=2026-02-30x&tags=VIP,,vip');
    await screen.findByRole('link', { name: 'John Smith' });
    expect(requested!.has('createdFrom')).toBe(false);
    expect(requested!.has('createdTo')).toBe(false);
    expect(requested!.get('tags')).toBe('vip'); // lowercased and de-duplicated
  });

  it('times out a request that hangs and offers Retry', async () => {
    let calls = 0;
    server.use(
      http.get(`${API}/contacts`, async () => {
        if (++calls === 1) await delay('infinite');
        return HttpResponse.json(makePage([john]));
      }),
    );
    const { user } = renderApp('/', { timeoutMs: 100 });

    expect(await screen.findByRole('alert')).toHaveTextContent('taking too long');
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('link', { name: 'John Smith' })).toBeInTheDocument();
  });
});

describe('list: toolbar', () => {
  it('changes the sort from the menu and writes it to the URL', async () => {
    server.use(http.get(`${API}/contacts`, () => HttpResponse.json(makePage([john, jane]))));
    const { user } = renderApp('/');
    await screen.findByRole('link', { name: 'John Smith' });

    await user.selectOptions(screen.getByLabelText('Sort by'), 'name:desc');

    await waitFor(() => expect(location()).toBe('/?sortBy=name&order=desc'));
    expect(screen.getByRole('columnheader', { name: /Name/ })).toHaveAttribute('aria-sort', 'descending');
  });

  it('filters by tag from the popover; Escape closes it and returns focus to the trigger', async () => {
    server.use(http.get(`${API}/contacts`, () => HttpResponse.json(makePage([john]))));
    const { user } = renderApp('/');
    await screen.findByRole('link', { name: 'John Smith' });

    const trigger = screen.getByRole('button', { name: 'Tags Any tag' });
    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    const panel = screen.getByRole('group', { name: 'Filter by tags' });
    await user.click(within(panel).getByRole('checkbox', { name: 'vip' }));
    await waitFor(() => expect(location()).toBe('/?tags=vip'));
    await user.click(within(panel).getByRole('radio', { name: 'All of these' }));
    await waitFor(() => expect(location()).toBe('/?tags=vip&tagMode=all'));

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('group', { name: 'Filter by tags' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Tags vip/ })).toHaveFocus();
  });

  it('"Clear all" resets every filter, including the search box', async () => {
    server.use(http.get(`${API}/contacts`, () => HttpResponse.json(makePage([john]))));
    const { user } = renderApp('/?q=jo&company=acme&createdFrom=2026-01-01');
    await screen.findByRole('link', { name: 'John Smith' });
    expect(screen.getByLabelText('Company')).toHaveValue('acme');

    await user.click(screen.getByRole('button', { name: 'Clear all' }));

    await waitFor(() => expect(location()).toBe('/'));
    expect(screen.getByLabelText('Search')).toHaveValue('');
    expect(screen.getByLabelText('Company')).toHaveValue('');
    expect(screen.queryByRole('button', { name: 'Clear all' })).not.toBeInTheDocument();
  });

  it('flags a date range that ends before it starts', async () => {
    server.use(http.get(`${API}/contacts`, () => HttpResponse.json(makePage([]))));
    renderApp('/?createdFrom=2026-05-01&createdTo=2026-04-01');
    expect(await screen.findByText('Ends before the start date')).toBeInTheDocument();
    expect(screen.getByLabelText('Created to')).toHaveAttribute('aria-invalid', 'true');
  });
});

describe('list: phone layout', () => {
  it('shows cards instead of the table and folds the filters behind a toggle', async () => {
    mockViewport({ compact: true });
    server.use(http.get(`${API}/contacts`, () => HttpResponse.json(makePage([john, jane]))));
    const { user } = renderApp('/?company=acme');

    expect(await screen.findByRole('link', { name: 'John Smith' })).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.getAllByRole('listitem').some((li) => li.classList.contains('contact-card'))).toBe(true);

    const toggle = screen.getByRole('button', { name: /Filters/ });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(within(toggle).getByText('1')).toBeInTheDocument(); // one active filter (company)
    expect(screen.queryByRole('textbox', { name: 'Company' })).not.toBeInTheDocument(); // folded away (hidden)

    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('textbox', { name: 'Company' })).toHaveValue('acme');
  });

  it('selects cards for bulk tagging', async () => {
    mockViewport({ compact: true });
    server.use(http.get(`${API}/contacts`, () => HttpResponse.json(makePage([john, jane]))));
    const { user } = renderApp('/');
    await screen.findByRole('link', { name: 'John Smith' });

    await user.click(screen.getByRole('checkbox', { name: 'Select Jane Doe' }));
    expect(within(screen.getByRole('form', { name: 'Bulk actions' })).getByText('1 selected')).toBeInTheDocument();

    await user.click(screen.getByRole('checkbox', { name: 'Select all contacts on this page' }));
    expect(screen.getByText('2 selected')).toBeInTheDocument();
  });

  it('switches layout live when the viewport crosses the breakpoint', async () => {
    const setCompact = mockViewport({ compact: false });
    server.use(http.get(`${API}/contacts`, () => HttpResponse.json(makePage([john]))));
    renderApp('/');
    await screen.findByRole('table');

    act(() => setCompact(true)); // a resize is an external event, so it goes through act()
    await waitFor(() => expect(screen.queryByRole('table')).not.toBeInTheDocument());
    expect(screen.getByRole('link', { name: 'John Smith' })).toBeInTheDocument();
  });
});

describe('list: bulk results', () => {
  const arrange = (response: () => Response) => {
    server.use(
      http.get(`${API}/contacts`, () => HttpResponse.json(makePage([john, jane]))),
      http.post(`${API}/contacts/bulk/tags`, response),
    );
    return renderApp('/');
  };

  async function tagAll(user: ReturnType<typeof renderApp>['user']) {
    await screen.findByRole('link', { name: 'John Smith' });
    await user.click(screen.getByRole('checkbox', { name: 'Select all contacts on this page' }));
    const bar = screen.getByRole('form', { name: 'Bulk actions' });
    await user.type(within(bar).getByLabelText('Add tag'), 'vip');
    await user.click(within(bar).getByRole('button', { name: 'Apply' }));
  }

  it('warns when some contacts no longer exist', async () => {
    const { user } = arrange(() => HttpResponse.json({ requested: 2, updated: 1, alreadyTagged: 0, notFound: 1 }));
    await tagAll(user);
    expect(await screen.findByText(/Tagged 1 · 0 already tagged · 1 not found\. Missing contacts may have been removed\./)).toBeInTheDocument();
    expect(screen.queryByRole('form', { name: 'Bulk actions' })).not.toBeInTheDocument();
  });

  it('reports a failed request and keeps the selection so the user can retry', async () => {
    const { user } = arrange(() => HttpResponse.json(errorBody('RATE_LIMITED', 'slow down'), { status: 429 }));
    await tagAll(user);
    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't tag 2 contacts: Too many requests");
    expect(within(screen.getByRole('form', { name: 'Bulk actions' })).getByText('2 selected')).toBeInTheDocument();
  });

  it('shows "Applying…" and ignores a second submit while the first is in flight', async () => {
    let posts = 0;
    const { user } = arrange(() => {
      posts++;
      return HttpResponse.json({ requested: 2, updated: 2, alreadyTagged: 0, notFound: 0 });
    });
    server.use(
      http.post(`${API}/contacts/bulk/tags`, async () => {
        posts++;
        await delay(150);
        return HttpResponse.json({ requested: 2, updated: 2, alreadyTagged: 0, notFound: 0 });
      }),
    );
    await screen.findByRole('link', { name: 'John Smith' });
    await user.click(screen.getByRole('checkbox', { name: 'Select all contacts on this page' }));
    const bar = screen.getByRole('form', { name: 'Bulk actions' });
    await user.type(within(bar).getByLabelText('Add tag'), 'vip{Enter}');

    expect(await within(bar).findByRole('button', { name: 'Applying…' })).toBeDisabled();
    await user.type(within(bar).getByLabelText('Add tag'), 'lead{Enter}');
    expect(await screen.findByText('Tagged 2 · 0 already tagged · 0 not found')).toBeInTheDocument();
    expect(posts).toBe(1);
  });
});
