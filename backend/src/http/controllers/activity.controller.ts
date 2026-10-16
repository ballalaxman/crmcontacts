import type { Request, Response } from 'express';
import type { ActivityQueryService } from '../../services/activity-query.service.js';

export class ActivityController {
  constructor(private readonly service: ActivityQueryService) {}

  list = async (_req: Request, res: Response) => {
    const { params, query } = res.locals.input;
    res.json(await this.service.listForContact(params.id, query.limit));
  };
}
