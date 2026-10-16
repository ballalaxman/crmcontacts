import { describe, it, expect } from 'vitest';
import { buildPatch, deriveSearchFields, diffContact, type Contact } from '../src/domain/contact.js';
import { loadEnv } from '../src/config/env.js';

const contact = (over: Partial<Contact> = {}): Contact => ({
  id: '1',
  firstName: 'John',
  lastName: 'Smith',
  email: 'john@acme.com',
  phone: '+1 555 0100',
  company: 'Acme',
  tags: [],
  version: 0,
  createdAt: new Date(0),
  updatedAt: new Date(0),
  ...over,
});

describe('deriveSearchFields', () => {
  it('builds name keys in both orders and a sort name', () => {
    const d = deriveSearchFields({ firstName: ' John ', lastName: 'SMITH' });
    expect(d.nameKeys).toEqual(['john smith', 'smith john']);
    expect(d.sortName).toBe('john smith');
  });

  it('keeps full digits plus the last 10 for phones', () => {
    const d = deriveSearchFields({ firstName: 'a', lastName: 'b', phone: '+91 98480 12345' });
    expect(d.phoneKeys).toEqual(['919848012345', '9848012345']);
  });

  it('does not duplicate keys for short numbers and handles a missing phone/company', () => {
    expect(deriveSearchFields({ firstName: 'a', lastName: 'b', phone: '555-0100' }).phoneKeys).toEqual(['5550100']);
    const d = deriveSearchFields({ firstName: 'a', lastName: 'b' });
    expect(d.phoneKeys).toEqual([]);
    expect(d.companyLower).toBeNull();
  });

  it('lowercases and collapses whitespace in the company', () => {
    expect(deriveSearchFields({ firstName: 'a', lastName: 'b', company: '  Acme   Corp ' }).companyLower).toBe('acme corp');
  });
});

describe('diffContact', () => {
  it('reports only fields that actually change', () => {
    const changes = diffContact(contact(), { firstName: 'John', phone: '+1 555 0199', company: 'Acme' });
    expect(changes).toEqual([{ field: 'phone', from: '+1 555 0100', to: '+1 555 0199' }]);
  });

  it('treats null and empty string as clearing, and clearing an absent field as no change', () => {
    expect(diffContact(contact(), { email: null })).toEqual([{ field: 'email', from: 'john@acme.com', to: null }]);
    expect(diffContact(contact(), { company: '' })).toEqual([{ field: 'company', from: 'Acme', to: null }]);
    expect(diffContact(contact({ company: undefined }), { company: null })).toEqual([]);
  });

  it('never reports a required name being cleared', () => {
    expect(diffContact(contact(), { firstName: null, lastName: '' })).toEqual([]);
  });
});

describe('buildPatch', () => {
  it('unsets cleared optional fields instead of storing null', () => {
    const patch = buildPatch(contact(), { email: null, company: '' });
    expect(patch.unset).toEqual(expect.arrayContaining(['email', 'company', 'companyLower']));
    expect(patch.set).not.toHaveProperty('email');
    expect(Object.values(patch.set)).not.toContain(null);
  });

  it('recomputes derived fields from the merged values', () => {
    const patch = buildPatch(contact(), { lastName: 'Jones', phone: '+44 20 7946 0958' });
    expect(patch.set).toMatchObject({
      lastName: 'Jones',
      phone: '+44 20 7946 0958',
      sortName: 'john jones',
      nameKeys: ['john jones', 'jones john'],
      phoneKeys: ['442079460958', '2079460958'],
      companyLower: 'acme',
    });
  });

  it('keeps the existing name when a required field is cleared', () => {
    const patch = buildPatch(contact(), { firstName: null, company: 'Globex' });
    expect(patch.set).not.toHaveProperty('firstName');
    expect(patch.unset).not.toContain('firstName');
    expect(patch.set).toMatchObject({ sortName: 'john smith', companyLower: 'globex' });
  });

  it('never touches tags or version', () => {
    const patch = buildPatch(contact({ tags: ['vip'] }), { phone: '+1 555 0199' });
    expect(patch.set).not.toHaveProperty('tags');
    expect(patch.set).not.toHaveProperty('version');
  });
});

describe('loadEnv', () => {
  const base = { MONGODB_URI: 'mongodb://localhost/crm' };

  it('parses "false" as false (z.coerce.boolean would say true)', () => {
    expect(loadEnv({ ...base, SYNC_INDEXES_ON_BOOT: 'false' }).SYNC_INDEXES_ON_BOOT).toBe(false);
    expect(loadEnv({ ...base, SYNC_INDEXES_ON_BOOT: 'true' }).SYNC_INDEXES_ON_BOOT).toBe(true);
    expect(loadEnv(base).SYNC_INDEXES_ON_BOOT).toBe(true);
  });

  it('applies defaults and requires a database URI', () => {
    expect(loadEnv(base)).toMatchObject({ PORT: 4000, TRUST_PROXY: 0, CORS_ORIGINS: 'http://localhost:5173' });
    expect(() => loadEnv({})).toThrow();
  });
});
