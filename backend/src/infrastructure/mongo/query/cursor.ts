import { InvalidCursorError } from '../../../domain/errors.js';

export interface CursorPayload { v: string | number; id: string; s: string } // s = "sortBy:order"

export const encodeCursor = (c: CursorPayload) =>
  Buffer.from(JSON.stringify(c), 'utf8').toString('base64url');

export function decodeCursor(raw: string, expectedSort: string): CursorPayload {
  try {
    const c = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')) as CursorPayload;
    const validValue = typeof c?.v === 'string' || typeof c?.v === 'number';
    if (!c || !validValue || typeof c.id !== 'string' || !/^[a-f\d]{24}$/i.test(c.id) || c.s !== expectedSort) {
      throw new Error('bad cursor');
    }
    return c;
  } catch {
    throw new InvalidCursorError();
  }
}
