import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { delay, http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import type { ActivityDto } from '../contracts/api-types';
import { API, errorBody, makeContact, makePage } from './msw-handlers';
import { renderApp } from './render';
import { server } from './server';

const john = makeContact({ id: 'c1', version: 1, tags: ['vip'] });
const location = () => screen.getByTestId('location').textContent;
const saveButton = () => screen.getByRole('button', { name: 'Save' });

/** GET /contacts/c1 → john; PATCH → whatever the test returns, with every body recorded. */
function arrangeContact(onPatch: (body: unknown, n: number) => Response | Promise<Response> = () => HttpResponse.json({ ...john, version: 2 })) {
  const patches: unknown[] = [];
  server.use(
    http.get(`${API}/contacts/c1`, () => HttpResponse.json(john)),
    http.patch(`${API}/contacts/c1`, async ({ request }) => {
      const body = await request.json();
      patches.push(body);
      return onPatch(body, patches.length);
    }),
  );
  return patches;
}

async function changeField(user: ReturnType<typeof renderApp>['user'], label: string, value: string) {
  const input = await screen.findByLabelText(label);
  await user.clear(input);
  await user.type(input, value);
  return input;
}

describe('contact page: loading and missing contacts', () => {
  it('shows the page skeleton, then the contact', async () => {
    arrangeContact();
    renderApp('/contacts/c1');
    expect(screen.getByRole('status', { name: 'Loading contact' })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { level: 1, name: 'John Smith' })).toBeInTheDocument();
    expect(screen.queryByRole('status', { name: 'Loading contact' })).not.toBeInTheDocument();
  });

  it('shows the created and updated dates, with the exact time on hover', async () => {
    arrangeContact();
    renderApp('/contacts/c1');
    await screen.findByRole('heading', { level: 1, name: 'John Smith' });

    const created = document.querySelector(`time[datetime="${john.createdAt}"]`);
    expect(created).not.toBeNull();
    expect(created!.closest('span')).toHaveTextContent(/^created /);
    expect(created!.getAttribute('title')).toMatch(/2026/);
    expect(document.querySelector(`time[datetime="${john.updatedAt}"]`)).not.toBeNull();
  });

  it.each([
    ['an unknown id (404)', '64b7f0000000000000000000', 404, 'NOT_FOUND'],
    ['a malformed id (400)', 'not-an-id', 400, 'VALIDATION_ERROR'],
  ] as const)('says "Contact not found" for %s', async (_, id, status, code) => {
    server.use(http.get(`${API}/contacts/${id}`, () => HttpResponse.json(errorBody(code, 'nope'), { status })));
    renderApp(`/contacts/${id}`);
    expect(await screen.findByRole('heading', { name: 'Contact not found' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to contacts' })).toHaveAttribute('href', '/');
  });

  it('offers Retry when loading fails for another reason', async () => {
    let calls = 0;
    server.use(
      http.get(`${API}/contacts/c1`, () =>
        ++calls === 1 ? HttpResponse.error() : HttpResponse.json(john)),
    );
    const { user } = renderApp('/contacts/c1');
    expect(await screen.findByRole('alert')).toHaveTextContent('Cannot reach the server');
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'John Smith' })).toBeInTheDocument();
  });

  it('returns to the same list view with "Back to contacts"', async () => {
    server.use(
      http.get(`${API}/contacts`, () => HttpResponse.json(makePage([john]))),
      http.get(`${API}/contacts/c1`, () => HttpResponse.json(john)),
    );
    const { user } = renderApp('/?q=jo&sortBy=name&order=asc');
    await user.click(await screen.findByRole('link', { name: 'John Smith' }));
    await screen.findByRole('heading', { level: 1, name: 'John Smith' });

    await user.click(screen.getByRole('link', { name: /Back to contacts/ }));
    await waitFor(() => expect(location()).toBe('/?q=jo&sortBy=name&order=asc'));
  });
});

describe('contact page: saving', () => {
  it('saves only the changed fields, confirms it, and refreshes the activity', async () => {
    let activityCalls = 0;
    const patches = arrangeContact(() => HttpResponse.json({ ...john, version: 2, company: 'Globex' }));
    server.use(http.get(`${API}/contacts/c1/activities`, () => {
      activityCalls++;
      return HttpResponse.json([] satisfies ActivityDto[]);
    }));
    const { user } = renderApp('/contacts/c1');

    await changeField(user, 'Company', 'Globex');
    await user.click(saveButton());

    expect(await screen.findByText('Changes saved')).toBeInTheDocument();
    expect(patches).toEqual([{ version: 1, company: 'Globex' }]);
    expect(await screen.findByText(/version 2/)).toBeInTheDocument();
    await waitFor(() => expect(activityCalls).toBeGreaterThan(1)); // refetched after the save
    expect(saveButton()).toBeDisabled(); // form is clean again
  });

  it('shows server validation errors under the matching field', async () => {
    arrangeContact(() =>
      HttpResponse.json(errorBody('VALIDATION_ERROR', 'Invalid request', { formErrors: [], fieldErrors: { phone: ['Invalid phone number'] } }), { status: 400 }));
    const { user } = renderApp('/contacts/c1');

    const phone = await changeField(user, 'Phone', '+1 555 0199');
    await user.click(saveButton());

    expect(await screen.findByText('Invalid phone number')).toBeInTheDocument();
    expect(phone).toHaveAttribute('aria-invalid', 'true');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument(); // shown on the field, not as a banner
  });

  it('shows a taken email under the email field', async () => {
    arrangeContact(() => HttpResponse.json(errorBody('EMAIL_TAKEN', 'taken', { field: 'email' }), { status: 409 }));
    const { user } = renderApp('/contacts/c1');

    const email = await changeField(user, 'Email', 'jane@acme.com');
    await user.click(saveButton());

    expect(await screen.findByText('Another contact already uses this email.')).toBeInTheDocument();
    expect(email).toHaveValue('jane@acme.com'); // nothing lost
    expect(email).toHaveAttribute('aria-describedby', expect.stringContaining('error'));
  });

  it('keeps the edits after a server failure and resends the same change on Retry', async () => {
    const patches = arrangeContact((_, n) =>
      n === 1 ? HttpResponse.json(errorBody('INTERNAL_ERROR', 'boom'), { status: 500 }) : HttpResponse.json({ ...john, version: 2, company: 'Globex' }));
    const { user } = renderApp('/contacts/c1');

    await changeField(user, 'Company', 'Globex');
    await user.click(saveButton());

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent("Couldn't save your changes");
    expect(screen.getByLabelText('Company')).toHaveValue('Globex');

    await user.click(within(alert).getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('Changes saved')).toBeInTheDocument();
    expect(patches).toEqual([{ version: 1, company: 'Globex' }, { version: 1, company: 'Globex' }]);
  });

  it('prevents double submits: one PATCH however often Save or Enter is pressed', async () => {
    const patches = arrangeContact(async () => {
      await delay(150);
      return HttpResponse.json({ ...john, version: 2, company: 'Globex' });
    });
    const { user } = renderApp('/contacts/c1');

    const company = await changeField(user, 'Company', 'Globex');
    await user.click(saveButton());
    expect(await screen.findByRole('button', { name: 'Saving…' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Saving…' }));
    fireEvent.submit(company.closest('form')!); // Enter in a field while saving

    expect(await screen.findByText('Changes saved')).toBeInTheDocument();
    expect(patches).toHaveLength(1);
  });
});

describe('contact page: unsaved changes', () => {
  it('asks before leaving with unsaved edits; Stay keeps them, Leave navigates', async () => {
    arrangeContact();
    server.use(http.get(`${API}/contacts`, () => HttpResponse.json(makePage([john]))));
    const { user } = renderApp('/contacts/c1');

    await changeField(user, 'Company', 'Globex');
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
    const back = screen.getByRole('link', { name: /Back to contacts/ });

    await user.click(back);
    const dialog = await screen.findByRole('alertdialog', { name: 'Leave without saving?' });
    await user.click(within(dialog).getByRole('button', { name: 'Stay' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(location()).toBe('/contacts/c1');
    expect(screen.getByLabelText('Company')).toHaveValue('Globex');

    await user.click(back);
    await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Leave' }));
    await waitFor(() => expect(location()).toBe('/'));
  });

  it('Escape answers "Stay"', async () => {
    arrangeContact();
    const { user } = renderApp('/contacts/c1');
    await changeField(user, 'Company', 'Globex');
    await user.click(screen.getByRole('link', { name: /Back to contacts/ }));
    await screen.findByRole('alertdialog');

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(location()).toBe('/contacts/c1');
  });

  it('does not ask when there is nothing to lose', async () => {
    arrangeContact();
    server.use(http.get(`${API}/contacts`, () => HttpResponse.json(makePage([john]))));
    const { user } = renderApp('/contacts/c1');
    await screen.findByRole('heading', { level: 1, name: 'John Smith' });

    await user.click(screen.getByRole('link', { name: /Back to contacts/ }));
    await waitFor(() => expect(location()).toBe('/'));
  });

  it('arms the browser "Leave site?" prompt only while there are unsaved edits', async () => {
    arrangeContact();
    const { user } = renderApp('/contacts/c1');
    await screen.findByRole('heading', { level: 1, name: 'John Smith' });
    const unload = () => {
      const e = new Event('beforeunload', { cancelable: true });
      window.dispatchEvent(e);
      return e.defaultPrevented;
    };

    expect(unload()).toBe(false);
    await changeField(user, 'Company', 'Globex');
    expect(unload()).toBe(true);
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(unload()).toBe(false);
  });
});

describe('contact page: conflict dialog keyboard behaviour', () => {
  const latest = { ...john, version: 2, phone: '+1 555 0199' };

  async function openConflict() {
    arrangeContact(() => HttpResponse.json(errorBody('VERSION_CONFLICT', 'changed', { current: latest }), { status: 409 }));
    const view = renderApp('/contacts/c1');
    await changeField(view.user, 'Phone', '+1 555 0000');
    await view.user.click(saveButton());
    await screen.findByRole('alertdialog');
    return view;
  }

  it('Escape closes it, keeps the edits in the form and returns focus to Save', async () => {
    const { user } = await openConflict();

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Phone')).toHaveValue('+1 555 0000');
    expect(saveButton()).toHaveFocus();
  });

  it('traps Tab inside the dialog', async () => {
    const { user } = await openConflict();
    const dialog = screen.getByRole('alertdialog');
    const buttons = within(dialog).getAllByRole('button');
    const [first, last] = [buttons[0], buttons[buttons.length - 1]];

    last.focus();
    await user.tab();
    expect(first).toHaveFocus();
    await user.tab({ shift: true });
    expect(last).toHaveFocus();
  });

  it('"Keep editing" closes it too', async () => {
    const { user } = await openConflict();
    await user.click(screen.getByRole('button', { name: 'Keep editing' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });
});

describe('contact page: tags', () => {
  it('adds a tag with feedback and refreshes the chips', async () => {
    let body: unknown;
    arrangeContact();
    server.use(
      http.post(`${API}/contacts/c1/tags`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ ...john, tags: ['vip', 'lead'] });
      }),
    );
    const { user } = renderApp('/contacts/c1');

    await user.type(await screen.findByLabelText('New tag'), 'Lead{Enter}');

    expect(await screen.findByText('Added tag “lead”')).toBeInTheDocument();
    expect(body).toEqual({ tag: 'lead' });
    expect(screen.getByRole('button', { name: 'Remove tag lead' })).toBeInTheDocument();
    expect(screen.getByLabelText('New tag')).toHaveValue('');
  });

  it('removes a tag', async () => {
    arrangeContact();
    server.use(http.delete(`${API}/contacts/c1/tags/vip`, () => HttpResponse.json({ ...john, tags: [] })));
    const { user } = renderApp('/contacts/c1');

    await user.click(await screen.findByRole('button', { name: 'Remove tag vip' }));

    expect(await screen.findByText('Removed tag “vip”')).toBeInTheDocument();
    expect(screen.getByText('No tags yet. Add one below.')).toBeInTheDocument();
  });

  it('rejects an invalid or duplicate tag before sending anything', async () => {
    arrangeContact();
    const { user } = renderApp('/contacts/c1');
    const input = await screen.findByLabelText('New tag');
    const add = screen.getByRole('button', { name: 'Add' });

    await user.type(input, 'has space');
    expect(screen.getByRole('alert')).toHaveTextContent('Tag must be 1–30 chars');
    expect(add).toBeDisabled();

    await user.clear(input);
    await user.type(input, 'VIP');
    expect(screen.getByRole('alert')).toHaveTextContent('Already tagged');
    expect(add).toBeDisabled();
  });

  it('tells the user when a tag change fails', async () => {
    arrangeContact();
    server.use(http.post(`${API}/contacts/c1/tags`, () => HttpResponse.error()));
    const { user } = renderApp('/contacts/c1');

    await user.type(await screen.findByLabelText('New tag'), 'lead{Enter}');

    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't add “lead”: Cannot reach the server");
  });
});

describe('contact page: activity timeline', () => {
  it('shows each entry with who, what and when (exact time on hover)', async () => {
    arrangeContact();
    server.use(
      http.get(`${API}/contacts/c1/activities`, () =>
        HttpResponse.json([
          { id: 'a2', contactId: 'c1', type: 'TAG_ADDED', tag: 'vip', actor: 'User A', createdAt: new Date().toISOString() },
          {
            id: 'a1', contactId: 'c1', type: 'CONTACT_UPDATED', actor: 'User B', createdAt: '2026-01-02T10:00:00.000Z',
            changes: [{ field: 'phone', from: '+1 555 0100', to: null }],
          },
        ] satisfies ActivityDto[])),
    );
    renderApp('/contacts/c1');

    await screen.findByText('User A');
    const entries = screen.getAllByRole('listitem').filter((li) => li.classList.contains('timeline__item'));
    expect(entries).toHaveLength(2);
    expect(entries[0]).toHaveTextContent('User A');
    expect(entries[0]).toHaveTextContent('Tag added');
    expect(entries[1]).toHaveTextContent('User B');
    expect(entries[1]).toHaveTextContent('Updated');
    expect(entries[1]).toHaveTextContent('Phone');
    expect(entries[1]).toHaveTextContent('—'); // cleared value
    const time = entries[1].querySelector('time')!;
    expect(time).toHaveAttribute('dateTime', '2026-01-02T10:00:00.000Z');
    expect(time.getAttribute('title')).toMatch(/2026/);
  });

  it('says so when there is no activity yet', async () => {
    arrangeContact();
    renderApp('/contacts/c1');
    expect(await screen.findByText(/No activity yet/)).toBeInTheDocument();
  });
});
