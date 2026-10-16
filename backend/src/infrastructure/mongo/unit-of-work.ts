import type { ClientSession, Connection } from 'mongoose';
import type { TxContext, UnitOfWork } from '../../domain/ports.js';

export const sessionOf = (tx?: TxContext) => tx?.handle as ClientSession | undefined;

export class MongoUnitOfWork implements UnitOfWork {
  constructor(private readonly conn: Connection) {}

  async run<T>(work: (tx: TxContext) => Promise<T>): Promise<T> {
    const session = await this.conn.startSession();
    try {
      let result!: T;
      // withTransaction retries on transient errors / write conflicts
      await session.withTransaction(async () => {
        result = await work({ handle: session });
      });
      return result;
    } finally {
      await session.endSession();
    }
  }
}
