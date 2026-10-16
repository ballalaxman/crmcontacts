import request from 'supertest';
import { describe, it, expect } from 'vitest';
import type { ContactDto, Page } from '../src/contracts/index.js';
import { makeApp, makeContact, makeContacts } from './helpers.js';

const app = makeApp();

const list = (query: Record<string, unknown> = {}) => request(app).get('/api/contacts').query(query);
const names = (page: Page<ContactDto>) => page.items.map((c) => `${c.firstName} ${c.lastName}`);

/** Follows nextCursor until the end and returns every page. */
async function walk(query: Record<string, unknown>) {
  const pages: Page<ContactDto>[] = [];
  let cursor: string | undefined;
  do {
    const res = await list({ ...query, cursor }).expect(200);
    pages.push(res.body);
    cursor = res.body.nextCursor ?? undefined;
  } while (cursor);
  return pages;
}

describe('GET /api/contacts — keyset pagination', () => {
  // 53 contacts where many share the same createdAt and the same name, to stress the _id tie-breaker.
  const seedTies = () => {
    const sameTime = new Date('2026-01-01T00:00:00.000Z');
    return makeContacts(
      Array.from({ length: 53 }, (_, i) => ({
        firstName: i % 3 === 0 ? 'John' : `Name${i % 5}`,
        lastName: i % 2 === 0 ? 'Smith' : `Last${i % 4}`,
        createdAt: i % 4 === 0 ? sameTime : new Date(sameTime.getTime() + (i % 7) * 1000),
      })),
    );
  };

  for (const sortBy of ['name', 'createdAt'] as const) {
    for (const order of ['asc', 'desc'] as const) {
      it(`visits every contact exactly once (sortBy=${sortBy}, order=${order})`, async () => {
        const ids = await seedTies();
        const pages = await walk({ sortBy, order, limit: 10 });

        const seen = pages.flatMap((p) => p.items.map((c) => c.id));
        expect(seen).toHaveLength(ids.length);
        expect(new Set(seen)).toEqual(new Set(ids));
        expect(pages).toHaveLength(6);
        expect(pages.at(-1)!.nextCursor).toBeNull();

        // The order is stable across pages.
        const keys = pages.flatMap((p) => p.items).map((c) =>
          sortBy === 'name' ? `${c.firstName} ${c.lastName}`.toLowerCase() : c.createdAt);
        const sorted = [...keys].sort();
        expect(keys).toEqual(order === 'asc' ? sorted : sorted.reverse());
      });
    }
  }

  it('returns a capped total only on the first page', async () => {
    await seedTies();
    const first = await list({ limit: 20 }).expect(200);
    expect(first.body.total).toEqual({ count: 53, capped: false });

    const second = await list({ limit: 20, cursor: first.body.nextCursor }).expect(200);
    expect(second.body).not.toHaveProperty('total');
  });

  it('defaults to newest first with 25 per page', async () => {
    await makeContacts([
      { firstName: 'Old', createdAt: new Date('2020-01-01') },
      { firstName: 'New', createdAt: new Date('2026-01-01') },
    ]);
    const res = await list().expect(200);
    expect(res.body.items.map((c: ContactDto) => c.firstName)).toEqual(['New', 'Old']);
    expect(res.body.nextCursor).toBeNull();
  });

  it('rejects a cursor that belongs to a different sort', async () => {
    await seedTies();
    const first = await list({ sortBy: 'createdAt', limit: 5 }).expect(200);

    const res = await list({ sortBy: 'name', limit: 5, cursor: first.body.nextCursor }).expect(400);
    expect(res.body.error.code).toBe('INVALID_CURSOR');
  });

  it('rejects garbage and tampered cursors with 400, never 500', async () => {
    await seedTies();
    const forge = (payload: unknown) => Buffer.from(JSON.stringify(payload)).toString('base64url');
    const id = '64b7f0000000000000000000';

    const cases: { why: string; cursor: string; sortBy: 'name' | 'createdAt'; order: 'asc' | 'desc' }[] = [
      { why: 'not base64 json', cursor: 'not-a-cursor', sortBy: 'createdAt', order: 'desc' },
      { why: 'bad id', cursor: forge({ v: 1, id: 'nope', s: 'createdAt:desc' }), sortBy: 'createdAt', order: 'desc' },
      { why: 'object as value', cursor: forge({ v: { $gt: '' }, id, s: 'createdAt:desc' }), sortBy: 'createdAt', order: 'desc' },
      { why: 'string where a timestamp belongs', cursor: forge({ v: 'x', id, s: 'createdAt:desc' }), sortBy: 'createdAt', order: 'desc' },
      { why: 'number where a name belongs', cursor: forge({ v: 12, id, s: 'name:asc' }), sortBy: 'name', order: 'asc' },
    ];

    for (const { why, cursor, sortBy, order } of cases) {
      const res = await list({ cursor, sortBy, order });
      expect(res.status, why).toBe(400);
      expect(res.body.error.code, why).toBe('INVALID_CURSOR');
    }
  });
});

describe('GET /api/contacts — search', () => {
  const seedPeople = () =>
    makeContacts([
      { firstName: 'John', lastName: 'Smith', email: 'john.smith@acme.com', phone: '+1 (555) 010-1234', company: 'Acme Corp' },
      { firstName: 'Jane', lastName: 'Doe', email: 'jane@globex.com', phone: '+44 20 7946 0958', company: 'Globex' },
      { firstName: 'A.b*', lastName: 'Zed' },
      { firstName: 'Axbb', lastName: 'Zed' },
    ]);

  it('matches a name prefix in either order', async () => {
    await seedPeople();
    expect(names((await list({ q: 'jo' }).expect(200)).body)).toEqual(['John Smith']);
    expect(names((await list({ q: 'john smi' }).expect(200)).body)).toEqual(['John Smith']);
    expect(names((await list({ q: 'smith jo' }).expect(200)).body)).toEqual(['John Smith']);
    expect(names((await list({ q: 'DOE' }).expect(200)).body)).toEqual(['Jane Doe']);
  });

  it('matches an email prefix', async () => {
    await seedPeople();
    expect(names((await list({ q: 'jane@' }).expect(200)).body)).toEqual(['Jane Doe']);
    expect(names((await list({ q: 'john.sm' }).expect(200)).body)).toEqual(['John Smith']);
  });

  it('matches phone digits regardless of formatting or country code', async () => {
    await seedPeople();
    expect(names((await list({ q: '555 010' }).expect(200)).body)).toEqual(['John Smith']);
    expect(names((await list({ q: '(555) 010-1234' }).expect(200)).body)).toEqual(['John Smith']);
    expect(names((await list({ q: '+44 20' }).expect(200)).body)).toEqual(['Jane Doe']);
  });

  it('escapes regex characters instead of interpreting them', async () => {
    await seedPeople();
    // Unescaped, "a.b*" would also match "Axbb".
    expect(names((await list({ q: 'a.b*' }).expect(200)).body)).toEqual(['A.b* Zed']);
    await list({ q: '(' }).expect(200);
    await list({ q: '[' }).expect(200);
  });

  it('does not match in the middle of a word', async () => {
    await seedPeople();
    expect((await list({ q: 'mith' }).expect(200)).body.items).toHaveLength(0);
  });
});

describe('GET /api/contacts — filters', () => {
  const seedMix = () =>
    makeContacts([
      { firstName: 'A', company: 'Acme Corp', tags: ['vip', 'lead'], createdAt: new Date('2025-03-01T10:00:00Z') },
      { firstName: 'B', company: 'Acme Labs', tags: ['vip'], createdAt: new Date('2025-06-15T10:00:00Z') },
      { firstName: 'C', company: 'Globex', tags: ['lead'], createdAt: new Date('2025-06-15T23:30:00Z') },
      { firstName: 'D', tags: [], createdAt: new Date('2026-01-01T00:00:00Z') },
    ]);
  const firstNames = (res: { body: Page<ContactDto> }) => res.body.items.map((c) => c.firstName).sort();

  it('filters by tags with any (default) and all', async () => {
    await seedMix();
    expect(firstNames(await list({ tags: 'vip,lead' }).expect(200))).toEqual(['A', 'B', 'C']);
    expect(firstNames(await list({ tags: 'vip,lead', tagMode: 'all' }).expect(200))).toEqual(['A']);
    expect(firstNames(await list({ tags: 'VIP' }).expect(200))).toEqual(['A', 'B']);
  });

  it('filters by company prefix, case-insensitively', async () => {
    await seedMix();
    expect(firstNames(await list({ company: 'ac' }).expect(200))).toEqual(['A', 'B']);
    expect(firstNames(await list({ company: 'ACME L' }).expect(200))).toEqual(['B']);
  });

  it('filters by created date range and includes the whole last day for a date-only createdTo', async () => {
    await seedMix();
    expect(firstNames(await list({ createdFrom: '2025-06-01', createdTo: '2025-06-30' }).expect(200))).toEqual(['B', 'C']);
    // C was created at 23:30 on the 15th, so it must be inside "through 2025-06-15".
    expect(firstNames(await list({ createdFrom: '2025-06-15', createdTo: '2025-06-15' }).expect(200))).toEqual(['B', 'C']);
    expect(firstNames(await list({ createdTo: '2025-06-15T12:00:00Z' }).expect(200))).toEqual(['A', 'B']);
  });

  it('combines every filter with search and counts only the matches', async () => {
    await seedMix();
    const res = await list({ q: 'b', tags: 'vip', company: 'acme', createdFrom: '2025-01-01', sortBy: 'name' }).expect(200);
    expect(firstNames(res)).toEqual(['B']);
    expect(res.body.total).toEqual({ count: 1, capped: false });
  });

  it('paginates correctly while filters are applied', async () => {
    await makeContacts(Array.from({ length: 30 }, (_, i) => ({ firstName: `P${i}`, tags: i % 2 ? ['odd'] : [] })));
    const pages = await walk({ tags: 'odd', limit: 4, sortBy: 'name' });
    expect(pages.flatMap((p) => p.items)).toHaveLength(15);
    expect(pages.every((p) => p.items.every((c) => c.tags.includes('odd')))).toBe(true);
  });

  it('keeps the contact shape stable', async () => {
    const id = await makeContact({ email: 'x@y.com', phone: '+1 555 0100', company: 'Acme', tags: ['vip'] });
    const res = await request(app).get(`/api/contacts/${id}`).expect(200);
    expect(res.body).toEqual({
      id,
      firstName: 'John',
      lastName: 'Smith',
      email: 'x@y.com',
      phone: '+1 555 0100',
      company: 'Acme',
      tags: ['vip'],
      version: 0,
      createdAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T.*Z$/),
      updatedAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T.*Z$/),
    });
  });
});
