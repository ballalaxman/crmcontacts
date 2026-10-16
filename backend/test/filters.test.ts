import { describe, it, expect } from 'vitest';
import { listContactsQuerySchema } from '../src/contracts/index.js';
import { CompositeContactFilter, SearchFilter, TagFilter, CompanyFilter, CreatedDateFilter } from '../src/infrastructure/mongo/query/filters.js';

const parse = (q: Record<string, string>) => listContactsQuerySchema.parse(q);
const composite = new CompositeContactFilter([new SearchFilter(), new TagFilter(), new CompanyFilter(), new CreatedDateFilter()]);

describe('filter queries', () => {
  it('builds an empty filter when nothing is set', () => {
    expect(composite.build(parse({}))).toEqual({});
  });

  it('keeps the email branch eligible for the partial unique index', () => {
    // Regression: without `$type: 'string'` the planner cannot use uniq_email for this branch, and the whole
    // $or falls back to scanning the sort index (5,000 keys examined to return 20 rows in the seeded data).
    const filter = new SearchFilter().toQuery(parse({ q: 'John.Smi' }));
    expect(filter).toEqual({
      $or: [
        { nameKeys: { $regex: '^john\\.smi' } },
        { email: { $regex: '^john\\.smi', $type: 'string' } },
      ],
    });
  });

  it('adds a phone branch only for phone-looking input with at least 3 digits', () => {
    const branches = (q: string) => (new SearchFilter().toQuery(parse({ q })) as { $or: object[] }).$or.length;
    expect(branches('(555) 010')).toBe(3);
    expect(branches('+44 20')).toBe(3);
    expect(branches('55')).toBe(2);
    expect(branches('john 555')).toBe(2);
  });

  it('anchors every pattern and escapes regex metacharacters', () => {
    const filter = new SearchFilter().toQuery(parse({ q: 'a.b*(x' })) as { $or: { nameKeys?: { $regex: string } }[] };
    expect(filter.$or[0].nameKeys!.$regex).toBe('^a\\.b\\*\\(x');
  });

  it('ignores a search term that is only whitespace', () => {
    expect(new SearchFilter().toQuery(parse({ q: '   ' }))).toBeNull();
  });
});

describe('list query schema', () => {
  it('turns a date-only createdTo into the end of that day', () => {
    expect(parse({ createdTo: '2025-06-15' }).createdTo!.toISOString()).toBe('2025-06-15T23:59:59.999Z');
    expect(parse({ createdTo: '2025-06-15T12:00:00Z' }).createdTo!.toISOString()).toBe('2025-06-15T12:00:00.000Z');
  });

  it('splits and normalizes tags', () => {
    expect(parse({ tags: ' VIP, lead ,,' }).tags).toEqual(['vip', 'lead']);
    expect(parse({}).tags).toEqual([]);
  });
});
