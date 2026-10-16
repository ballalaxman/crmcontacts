import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ContactForm } from '../features/contacts/detail/ContactForm';
import { makeContact } from './msw-handlers';

const setup = (props: Partial<Parameters<typeof ContactForm>[0]> = {}) => {
  const onSubmit = vi.fn();
  const user = userEvent.setup();
  const contact = makeContact({ version: 4 });
  const utils = render(<ContactForm contact={contact} onSubmit={onSubmit} saving={false} {...props} />);
  return { user, onSubmit, contact, ...utils };
};
const save = () => screen.getByRole('button', { name: 'Save' });

describe('ContactForm', () => {
  it('starts clean: Save and Cancel are disabled until something changes', () => {
    setup();
    expect(save()).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    expect(screen.getByLabelText('First name')).toHaveValue('John');
  });

  it('shows an inline error for an invalid email and keeps Save disabled', async () => {
    const { user, onSubmit } = setup();

    const email = screen.getByLabelText('Email');
    await user.clear(email);
    await user.type(email, 'not-an-email');

    expect(await screen.findByText('Invalid email')).toBeInTheDocument();
    expect(email).toHaveAttribute('aria-invalid', 'true');
    expect(save()).toBeDisabled();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it.each([
    ['First name', '', 'Required'],
    ['Phone', 'call me', 'Invalid phone number'],
  ])('validates %s', async (label, value, message) => {
    const { user } = setup();
    const input = screen.getByLabelText(label);
    await user.clear(input);
    if (value) await user.type(input, value);
    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(save()).toBeDisabled();
  });

  it('sends only the changed fields together with the version it was loaded at', async () => {
    const { user, onSubmit } = setup();

    const phone = screen.getByLabelText('Phone');
    await user.clear(phone);
    await user.type(phone, '+44 20 7946 0958');
    await waitFor(() => expect(save()).toBeEnabled());
    await user.click(save());

    expect(onSubmit).toHaveBeenCalledWith({ version: 4, phone: '+44 20 7946 0958' });
  });

  it('turns a cleared optional field into null, and normalizes email case', async () => {
    const { user, onSubmit } = setup();

    await user.clear(screen.getByLabelText('Company'));
    const email = screen.getByLabelText('Email');
    await user.clear(email);
    await user.type(email, 'JOHN.NEW@ACME.COM');
    await waitFor(() => expect(save()).toBeEnabled());
    await user.click(save());

    expect(onSubmit).toHaveBeenCalledWith({ version: 4, company: null, email: 'john.new@acme.com' });
  });

  it('Cancel puts the saved values back', async () => {
    const { user } = setup();
    const company = screen.getByLabelText('Company');
    await user.type(company, ' Ltd');

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(company).toHaveValue('Acme');
    expect(save()).toBeDisabled();
  });

  it('shows errors reported by the server under the right field and keeps what was typed', async () => {
    const { rerender, contact, onSubmit } = setup();
    const email = screen.getByLabelText('Email');
    await userEvent.setup().type(email, 'x');

    rerender(
      <ContactForm
        contact={contact}
        onSubmit={onSubmit}
        saving={false}
        serverErrors={[{ field: 'email', message: 'Another contact already uses this email.' }]}
      />,
    );

    expect(await screen.findByText('Another contact already uses this email.')).toBeInTheDocument();
    expect(email).toHaveValue('john@acme.comx');
  });

  it('shows "Saving…" and blocks double submits while a save is in flight', async () => {
    const { user } = setup({ saving: true });
    await user.type(screen.getByLabelText('Company'), 'x');
    expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled();
  });

  it('keeps unsaved edits when only the tags change (same version, new object)', async () => {
    const { user, rerender, onSubmit, contact } = setup();
    await user.type(screen.getByLabelText('Company'), ' Ltd');

    rerender(<ContactForm contact={{ ...contact, tags: ['vip'] }} onSubmit={onSubmit} saving={false} />);

    expect(screen.getByLabelText('Company')).toHaveValue('Acme Ltd');
  });

  it('reloads the form when the contact moves to a new version', async () => {
    const { user, rerender, onSubmit, contact } = setup();
    await user.type(screen.getByLabelText('Company'), ' Ltd');

    rerender(<ContactForm contact={{ ...contact, version: 5, company: 'Globex' }} onSubmit={onSubmit} saving={false} />);

    await waitFor(() => expect(screen.getByLabelText('Company')).toHaveValue('Globex'));
  });
});
