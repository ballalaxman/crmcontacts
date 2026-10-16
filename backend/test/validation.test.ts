import request from 'supertest';
import { describe, it, expect } from 'vitest';
import { makeApp, makeContact } from './helpers.js';

const app = makeApp();

describe('request validation and error format', () => {
  it('rejects a malformed id with 400 VALIDATION_ERROR', async () => {
    const res = await request(app).get('/api/contacts/not-an-id').expect(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects unknown fields (including tags and version-less bodies)', async () => {
    const id = await makeContact();
    await request(app).patch(`/api/contacts/${id}`).send({ version: 0, tags: ['x'] }).expect(400);
    await request(app).patch(`/api/contacts/${id}`).send({ version: 0, nickname: 'J' }).expect(400);
    await request(app).patch(`/api/contacts/${id}`).send({ company: 'X' }).expect(400);
    await request(app).patch(`/api/contacts/${id}`).send({ version: 0 }).expect(400);
  });

  it('rejects invalid email, phone, names and tags with field errors', async () => {
    const id = await makeContact();
    const bad = async (body: object, field: string) => {
      const res = await request(app).patch(`/api/contacts/${id}`).send({ version: 0, ...body }).expect(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details.fieldErrors).toHaveProperty(field);
    };
    await bad({ email: 'nope' }, 'email');
    await bad({ phone: 'call me' }, 'phone');
    await bad({ phone: '12' }, 'phone');
    await bad({ firstName: '   ' }, 'firstName');
    await bad({ lastName: 'x'.repeat(101) }, 'lastName');

    const tag = await request(app).post(`/api/contacts/${id}/tags`).send({ tag: 'has space' }).expect(400);
    expect(tag.body.error.details.fieldErrors).toHaveProperty('tag');
    await request(app).post(`/api/contacts/${id}/tags`).send({ tag: 'a'.repeat(31) }).expect(400);
  });

  it('rejects bad list parameters', async () => {
    await request(app).get('/api/contacts').query({ limit: 0 }).expect(400);
    await request(app).get('/api/contacts').query({ limit: 101 }).expect(400);
    await request(app).get('/api/contacts').query({ sortBy: 'email' }).expect(400);
    await request(app).get('/api/contacts').query({ order: 'sideways' }).expect(400);
    await request(app).get('/api/contacts').query({ tagMode: 'some' }).expect(400);
    await request(app).get('/api/contacts').query({ createdTo: 'yesterday' }).expect(400);
    await request(app).get('/api/contacts').query({ q: 'x'.repeat(101) }).expect(400);
  });

  it('rejects bulk requests that are empty, oversized or have bad ids', async () => {
    await request(app).post('/api/contacts/bulk/tags').send({ contactIds: ['nope'], tag: 'vip' }).expect(400);
    const many = Array.from({ length: 501 }, () => '64b7f0000000000000000000');
    await request(app).post('/api/contacts/bulk/tags').send({ contactIds: many, tag: 'vip' }).expect(400);
  });

  it('returns INVALID_JSON for a malformed body', async () => {
    const id = await makeContact();
    const res = await request(app).patch(`/api/contacts/${id}`)
      .set('Content-Type', 'application/json').send('{"version": 0,').expect(400);
    expect(res.body.error.code).toBe('INVALID_JSON');
  });

  it('returns the standard error body for unknown routes', async () => {
    const res = await request(app).get('/api/nope').expect(404);
    expect(res.body).toEqual({ error: { code: 'NOT_FOUND', message: 'Route not found' } });
  });

  it('answers /api/health', async () => {
    const res = await request(app).get('/api/health').expect(200);
    expect(res.body).toEqual({ status: 'ok', db: 'up' });
  });

  it('sanitizes the X-Actor header', async () => {
    const id = await makeContact();
    await request(app).post(`/api/contacts/${id}/tags`).set('X-Actor', '<b>User</b> A').send({ tag: 'vip' }).expect(200);
    const res = await request(app).get(`/api/contacts/${id}/activities`).expect(200);
    expect(res.body[0].actor).toBe('bUserb A');
  });

  it('rate limits with the standard error body', async () => {
    const { createApp } = await import('../src/app.js');
    const { buildContainer } = await import('../src/container.js');
    const mongoose = (await import('mongoose')).default;
    const limited = createApp(buildContainer(mongoose.connection), { corsOrigins: [], logging: false, rateLimitPerMinute: 2 });

    await request(limited).get('/api/health').expect(200);
    await request(limited).get('/api/health').expect(200);
    const res = await request(limited).get('/api/health').expect(429);
    expect(res.body.error.code).toBe('RATE_LIMITED');
  });
});
