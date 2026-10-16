import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { ConflictDialog } from '../features/contacts/detail/ConflictDialog';
import { API, errorBody, makeContact } from './msw-handlers';
import { renderApp } from './render';
import { server } from './server';

describe('ConflictDialog (component)', () => {
  const base = makeContact({ version: 1, phone: '+1 555 0100', company: 'Acme' });
  const latest = makeContact({ version: 2, phone: '+1 555 0199', company: 'Acme' });

  it('marks only the fields someone else changed as conflicts', () => {
    render(
      <ConflictDialog
        base={base}
        latest={latest}
        mine={{ phone: '+1 555 0000', company: 'Globex' }}
        onDiscard={() => {}}
        onApplyMine={() => {}}
      />,
    );

    const phone = screen.getByRole('row', { name: /Phone/ });
    expect(phone).toHaveAttribute('data-conflict', 'true');
    expect(within(phone).getByText(/changed by someone else/)).toBeInTheDocument();

    const company = screen.getByRole('row', { name: /Company/ });
    expect(company).toHaveAttribute('data-conflict', 'false');
    expect(within(company).getByText(/not changed by them/)).toBeInTheDocument();
  });

  it('shows cleared values as a dash and lets the user pick either action', async () => {
    const onDiscard = vi.fn();
    const onApplyMine = vi.fn();
    render(
      <ConflictDialog base={base} latest={latest} mine={{ company: null }} onDiscard={onDiscard} onApplyMine={onApplyMine} />,
    );

    expect(within(screen.getByRole('row', { name: /Company/ })).getAllByRole('cell')[0]).toHaveTextContent('—');

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Discard mine & reload' }));
    await user.click(screen.getByRole('button', { name: 'Apply my changes on top' }));
    expect(onDiscard).toHaveBeenCalledOnce();
    expect(onApplyMine).toHaveBeenCalledOnce();
  });

  it('puts focus on the safe choice (discard), not on the overwrite', () => {
    render(<ConflictDialog latest={latest} mine={{ phone: 'x' }} onDiscard={() => {}} onApplyMine={() => {}} />);
    expect(screen.getByRole('button', { name: 'Discard mine & reload' })).toHaveFocus();
  });
});

describe('conflict flow on the contact page', () => {
  const original = makeContact({ version: 1, phone: '+1 555 0100' });
  const latest = makeContact({ version: 2, phone: '+1 555 0199' });

  /** GET returns `original` until a conflict happens; PATCH conflicts once, then succeeds. */
  function arrange() {
    const patches: unknown[] = [];
    server.use(
      http.get(`${API}/contacts/c1`, () => HttpResponse.json(original)),
      http.patch(`${API}/contacts/c1`, async ({ request }) => {
        const body = await request.json();
        patches.push(body);
        if (patches.length === 1) {
          return HttpResponse.json(errorBody('VERSION_CONFLICT', 'Contact was modified by someone else', { current: latest }), { status: 409 });
        }
        return HttpResponse.json(makeContact({ version: 3, phone: '+1 555 0000' }));
      }),
    );
    return patches;
  }

  async function editPhoneAndSave(user: ReturnType<typeof userEvent.setup>) {
    const phone = await screen.findByLabelText('Phone');
    await user.clear(phone);
    await user.type(phone, '+1 555 0000');
    const save = screen.getByRole('button', { name: 'Save' });
    await waitFor(() => expect(save).toBeEnabled());
    await user.click(save);
  }

  it('shows the dialog with the differing field, then re-saves on the latest version when asked', async () => {
    const patches = arrange();
    const { user } = renderApp('/contacts/c1');

    await editPhoneAndSave(user);

    const dialog = await screen.findByRole('alertdialog');
    expect(patches[0]).toEqual({ version: 1, phone: '+1 555 0000' }); // only the changed field is sent
    expect(within(dialog).getByText('+1 555 0000')).toBeInTheDocument(); // my value
    expect(within(dialog).getByText(/\+1 555 0199/)).toBeInTheDocument(); // the latest value
    expect(within(dialog).getByText(/version 2/)).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'Apply my changes on top' }));

    await waitFor(() => expect(patches).toHaveLength(2));
    expect(patches[1]).toEqual({ version: 2, phone: '+1 555 0000' }); // now on the latest version
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(await screen.findByText(/version 3/)).toBeInTheDocument();
  });

  it('discarding reloads the latest values into the form and sends nothing more', async () => {
    const patches = arrange();
    const { user } = renderApp('/contacts/c1');

    await editPhoneAndSave(user);
    const dialog = await screen.findByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: 'Discard mine & reload' }));

    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    await waitFor(() => expect(screen.getByLabelText('Phone')).toHaveValue('+1 555 0199'));
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    expect(patches).toHaveLength(1);
  });
});
