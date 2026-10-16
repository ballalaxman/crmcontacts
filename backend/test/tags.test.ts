import request from 'supertest';
import { describe, it, expect } from 'vitest';
import { ContactModel } from '../src/infrastructure/mongo/models/contact.model.js';
import { ActivityModel } from '../src/infrastructure/mongo/models/activity.model.js';
import { makeApp, makeContact, MISSING_ID } from './helpers.js';

const app = makeApp();

const activities = async (id: string) => (await request(app).get(`/api/contacts/${id}/activities`).expect(200)).body;

describe('POST /api/contacts/:id/tags', () => {
  it('adds a normalized tag, records an activity and registers the tag', async () => {
    const id = await makeContact();

    const res = await request(app).post(`/api/contacts/${id}/tags`).set('X-Actor', 'User A').send({ tag: '  VIP ' }).expect(200);

    expect(res.body.tags).toEqual(['vip']);
    expect(res.body.version).toBe(0); // tags never bump the version
    expect(await activities(id)).toEqual([expect.objectContaining({ type: 'TAG_ADDED', tag: 'vip', actor: 'User A' })]);
    expect((await request(app).get('/api/tags').expect(200)).body).toEqual(['vip']);
  });

  it('is a no-op (and records nothing) when the tag is already there', async () => {
    const id = await makeContact({ tags: ['vip'] });

    const res = await request(app).post(`/api/contacts/${id}/tags`).send({ tag: 'vip' }).expect(200);

    expect(res.body.tags).toEqual(['vip']);
    expect(await ActivityModel.countDocuments()).toBe(0);
  });

  it('returns 404 for an unknown contact', async () => {
    const res = await request(app).post(`/api/contacts/${MISSING_ID}/tags`).send({ tag: 'vip' }).expect(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});

describe('DELETE /api/contacts/:id/tags/:tag', () => {
  it('removes the tag and records an activity', async () => {
    const id = await makeContact({ tags: ['vip', 'lead'] });

    const res = await request(app).delete(`/api/contacts/${id}/tags/vip`).expect(200);

    expect(res.body.tags).toEqual(['lead']);
    expect(await activities(id)).toEqual([expect.objectContaining({ type: 'TAG_REMOVED', tag: 'vip' })]);
  });

  it('is a no-op when the contact does not have the tag', async () => {
    const id = await makeContact({ tags: ['lead'] });

    const res = await request(app).delete(`/api/contacts/${id}/tags/vip`).expect(200);

    expect(res.body.tags).toEqual(['lead']);
    expect(await ActivityModel.countDocuments()).toBe(0);
  });

  it('returns 404 for an unknown contact', async () => {
    await request(app).delete(`/api/contacts/${MISSING_ID}/tags/vip`).expect(404);
  });
});

describe('POST /api/contacts/bulk/tags', () => {
  it('reports updated / alreadyTagged / notFound and records activity only for updated contacts', async () => {
    const [untaggedA, untaggedB, tagged] = await Promise.all([
      makeContact({ firstName: 'A' }),
      makeContact({ firstName: 'B' }),
      makeContact({ firstName: 'C', tags: ['vip'] }),
    ]);

    const res = await request(app).post('/api/contacts/bulk/tags')
      .send({ contactIds: [untaggedA, untaggedB, tagged, MISSING_ID], tag: 'VIP' }).expect(200);

    expect(res.body).toEqual({ requested: 4, updated: 2, alreadyTagged: 1, notFound: 1 });
    expect(await ContactModel.countDocuments({ tags: 'vip' })).toBe(3);
    expect(await ActivityModel.countDocuments()).toBe(2);
    expect(await activities(tagged)).toEqual([]);
    expect(await activities(untaggedA)).toHaveLength(1);
    expect((await request(app).get('/api/tags').expect(200)).body).toEqual(['vip']);
  });

  it('is idempotent: running it twice changes nothing the second time', async () => {
    const ids = await Promise.all([makeContact({ firstName: 'A' }), makeContact({ firstName: 'B' })]);
    const body = { contactIds: ids, tag: 'lead' };

    await request(app).post('/api/contacts/bulk/tags').send(body).expect(200);
    const again = await request(app).post('/api/contacts/bulk/tags').send(body).expect(200);

    expect(again.body).toEqual({ requested: 2, updated: 0, alreadyTagged: 2, notFound: 0 });
    expect(await ActivityModel.countDocuments()).toBe(2);
  });

  it('counts duplicate ids once', async () => {
    const id = await makeContact();
    const res = await request(app).post('/api/contacts/bulk/tags').send({ contactIds: [id, id, id], tag: 'vip' }).expect(200);
    expect(res.body).toEqual({ requested: 1, updated: 1, alreadyTagged: 0, notFound: 0 });
  });

  it('is not shadowed by the :id routes', async () => {
    // "bulk" must never be read as a contact id.
    const res = await request(app).post('/api/contacts/bulk/tags').send({ contactIds: [], tag: 'vip' }).expect(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('GET /api/contacts/:id/activities', () => {
  it('returns 404 for an unknown contact and honours limit', async () => {
    await request(app).get(`/api/contacts/${MISSING_ID}/activities`).expect(404);

    const id = await makeContact();
    for (const tag of ['a', 'b', 'c']) await request(app).post(`/api/contacts/${id}/tags`).send({ tag }).expect(200);

    const res = await request(app).get(`/api/contacts/${id}/activities`).query({ limit: 2 }).expect(200);
    expect(res.body.map((a: { tag: string }) => a.tag)).toEqual(['c', 'b']);
  });
});
