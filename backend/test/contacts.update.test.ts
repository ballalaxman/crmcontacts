import request from 'supertest';
import { describe, it, expect } from 'vitest';
import { ContactModel } from '../src/infrastructure/mongo/models/contact.model.js';
import { ActivityModel } from '../src/infrastructure/mongo/models/activity.model.js';
import { makeApp, makeContact, MISSING_ID } from './helpers.js';

const app = makeApp();

describe('PATCH /api/contacts/:id — optimistic locking', () => {
  it('applies the change, bumps the version and refreshes derived fields', async () => {
    const id = await makeContact({ email: 'john@acme.com' });

    const res = await request(app).patch(`/api/contacts/${id}`)
      .send({ version: 0, lastName: 'Jones', phone: '+1 555 0199' }).expect(200);

    expect(res.body).toMatchObject({ id, lastName: 'Jones', phone: '+1 555 0199', version: 1 });
    const doc = await ContactModel.findById(id).lean();
    expect(doc).toMatchObject({ sortName: 'john jones', nameKeys: ['john jones', 'jones john'] });
  });

  it('rejects a stale version with 409 and does not overwrite', async () => {
    const id = await makeContact();

    await request(app).patch(`/api/contacts/${id}`).send({ version: 0, phone: '+1 555 0199' }).expect(200);
    const res = await request(app).patch(`/api/contacts/${id}`)
      .send({ version: 0, phone: '+1 555 0000' }).expect(409);

    expect(res.body.error.code).toBe('VERSION_CONFLICT');
    expect(res.body.error.details.current.version).toBe(1);
    expect(res.body.error.details.current.phone).toBe('+1 555 0199');
    expect((await ContactModel.findById(id).lean())!.phone).toBe('+1 555 0199');
  });

  it('lets only one of two concurrent updates with the same version win', async () => {
    const id = await makeContact();
    const [a, b] = await Promise.all([
      request(app).patch(`/api/contacts/${id}`).send({ version: 0, company: 'A' }),
      request(app).patch(`/api/contacts/${id}`).send({ version: 0, company: 'B' }),
    ]);

    expect([a.status, b.status].sort()).toEqual([200, 409]);
    expect((await ContactModel.findById(id).lean())!.version).toBe(1);
  });

  it('does not conflict when a tag is added between read and save, and keeps the tag', async () => {
    const id = await makeContact();

    await request(app).post(`/api/contacts/${id}/tags`).send({ tag: 'vip' }).expect(200);
    const res = await request(app).patch(`/api/contacts/${id}`).send({ version: 0, phone: '+1 555 0199' }).expect(200);

    expect(res.body.tags).toEqual(['vip']);
    expect(res.body.version).toBe(1);
  });

  it('returns 404 for an unknown contact', async () => {
    const res = await request(app).patch(`/api/contacts/${MISSING_ID}`).send({ version: 0, company: 'X' }).expect(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});

describe('PATCH /api/contacts/:id — email uniqueness', () => {
  it('returns 409 EMAIL_TAKEN for an existing email', async () => {
    await makeContact({ email: 'jane@acme.com', firstName: 'Jane' });
    const id = await makeContact({ email: 'john@acme.com' });

    const res = await request(app).patch(`/api/contacts/${id}`).send({ version: 0, email: 'jane@acme.com' }).expect(409);

    expect(res.body.error).toMatchObject({ code: 'EMAIL_TAKEN', details: { field: 'email' } });
    expect((await ContactModel.findById(id).lean())!.email).toBe('john@acme.com');
  });

  it('treats a case variant as the same email', async () => {
    await makeContact({ email: 'jane@acme.com', firstName: 'Jane' });
    const id = await makeContact({ email: 'john@acme.com' });

    const res = await request(app).patch(`/api/contacts/${id}`).send({ version: 0, email: 'JANE@Acme.com' }).expect(409);
    expect(res.body.error.code).toBe('EMAIL_TAKEN');
  });

  it('allows many contacts without an email, and clearing an email frees it up', async () => {
    const a = await makeContact({ email: 'a@acme.com', firstName: 'A' });
    const b = await makeContact({ firstName: 'B' });
    await makeContact({ firstName: 'C' });

    const cleared = await request(app).patch(`/api/contacts/${a}`).send({ version: 0, email: null }).expect(200);
    expect(cleared.body).not.toHaveProperty('email');
    expect(await ContactModel.collection.findOne({ _id: (await ContactModel.findById(a))!._id }))
      .not.toHaveProperty('email'); // $unset, never null

    // The freed address can now be used by someone else.
    await request(app).patch(`/api/contacts/${b}`).send({ version: 0, email: 'a@acme.com' }).expect(200);
  });
});

describe('PATCH /api/contacts/:id — activity history', () => {
  it('records from/to for every changed field', async () => {
    const id = await makeContact({ phone: '+1 555 0100', company: 'Acme' });

    await request(app).patch(`/api/contacts/${id}`).set('X-Actor', 'User B')
      .send({ version: 0, phone: '+1 555 0199', company: null }).expect(200);

    const res = await request(app).get(`/api/contacts/${id}/activities`).expect(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({
      type: 'CONTACT_UPDATED',
      actor: 'User B',
      changes: expect.arrayContaining([
        { field: 'phone', from: '+1 555 0100', to: '+1 555 0199' },
        { field: 'company', from: 'Acme', to: null },
      ]),
    });
  });

  it('writes nothing for a no-op patch', async () => {
    const id = await makeContact({ phone: '+1 555 0100' });

    const res = await request(app).patch(`/api/contacts/${id}`).send({ version: 0, phone: '+1 555 0100' }).expect(200);

    expect(res.body.version).toBe(0);
    expect(await ActivityModel.countDocuments()).toBe(0);
  });

  it('lists the newest activity first', async () => {
    const id = await makeContact();
    await request(app).patch(`/api/contacts/${id}`).send({ version: 0, company: 'First' }).expect(200);
    await request(app).patch(`/api/contacts/${id}`).send({ version: 1, company: 'Second' }).expect(200);

    const res = await request(app).get(`/api/contacts/${id}/activities`).expect(200);
    expect(res.body.map((a: { changes: { to: string }[] }) => a.changes[0].to)).toEqual(['Second', 'First']);
  });

  it('rolls the update back when it cannot be completed (no half-written activity)', async () => {
    await makeContact({ email: 'taken@acme.com', firstName: 'Taken' });
    const id = await makeContact({ email: 'john@acme.com' });

    await request(app).patch(`/api/contacts/${id}`).send({ version: 0, email: 'taken@acme.com', phone: '+1 555 0199' }).expect(409);

    expect(await ActivityModel.countDocuments()).toBe(0);
    expect((await ContactModel.findById(id).lean())!.phone).toBeUndefined();
  });
});
