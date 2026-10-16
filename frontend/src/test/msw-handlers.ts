import { http, HttpResponse } from 'msw';
import type { ApiErrorBody, ContactDto, ErrorCode, Page } from '../contracts/api-types';

export const API = 'http://localhost:4000/api';

/** Typed with the contract, so a change to api-types.ts breaks the tests that depend on it. */
export const makeContact = (over: Partial<ContactDto> = {}): ContactDto => ({
  id: 'c1',
  firstName: 'John',
  lastName: 'Smith',
  email: 'john@acme.com',
  phone: '+1 555 0100',
  company: 'Acme',
  tags: [],
  version: 1,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
  ...over,
});

export const makePage = (items: ContactDto[], over: Partial<Page<ContactDto>> = {}): Page<ContactDto> => ({
  items,
  nextCursor: null,
  total: { count: items.length, capped: false },
  ...over,
});

export const errorBody = (code: ErrorCode, message: string, details?: unknown): ApiErrorBody => ({
  error: { code, message, details },
});

/** Defaults every test can rely on; individual tests override with server.use(...). */
export const handlers = [
  http.get(`${API}/tags`, () => HttpResponse.json(['lead', 'vip'])),
  http.get(`${API}/contacts/:id/activities`, () => HttpResponse.json([])),
];
