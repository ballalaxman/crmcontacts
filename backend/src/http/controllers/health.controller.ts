import type { Connection } from 'mongoose';
import type { Request, Response } from 'express';

export class HealthController {
  constructor(private readonly conn: Connection) {}

  check = async (_req: Request, res: Response) => {
    // readyState 1 = connected
    const up = this.conn.readyState === 1;
    res.status(up ? 200 : 503).json({ status: up ? 'ok' : 'degraded', db: up ? 'up' : 'down' });
  };
}
