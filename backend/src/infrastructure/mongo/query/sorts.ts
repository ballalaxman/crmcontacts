import { Types } from 'mongoose';
import { InvalidCursorError } from '../../../domain/errors.js';

export interface SortStrategy {
  field: string;
  cursorValue(doc: Record<string, unknown>): string | number;
  /** Turns the cursor's value back into a query value. Throws InvalidCursorError if it has the wrong shape. */
  parseCursorValue(v: unknown): Date | string;
}

export const sortStrategies: Record<'name' | 'createdAt', SortStrategy> = {
  createdAt: {
    field: 'createdAt',
    cursorValue: (d) => (d.createdAt as Date).getTime(),
    parseCursorValue: (v) => {
      if (typeof v !== 'number' || !Number.isFinite(v)) throw new InvalidCursorError();
      const date = new Date(v);
      if (Number.isNaN(date.getTime())) throw new InvalidCursorError();
      return date;
    },
  },
  name: {
    field: 'sortName',
    cursorValue: (d) => d.sortName as string,
    parseCursorValue: (v) => {
      if (typeof v !== 'string') throw new InvalidCursorError();
      return v;
    },
  },
};

/** Keyset condition: rows strictly after (value, _id) in the given direction. */
export function keysetCondition(sort: SortStrategy, order: 'asc' | 'desc', v: unknown, id: string) {
  const op = order === 'asc' ? '$gt' : '$lt';
  const value = sort.parseCursorValue(v);
  const oid = new Types.ObjectId(id);
  return { $or: [{ [sort.field]: { [op]: value } }, { [sort.field]: value, _id: { [op]: oid } }] };
}
