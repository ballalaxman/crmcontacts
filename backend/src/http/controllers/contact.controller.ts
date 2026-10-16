import type { Request, Response } from 'express';
import type { ContactQueryService } from '../../services/contact-query.service.js';
import type { ContactUpdateService } from '../../services/contact-update.service.js';

export class ContactController {
  constructor(private readonly query: ContactQueryService, private readonly updater: ContactUpdateService) {}

  list = async (_req: Request, res: Response) => {
    res.json(await this.query.list(res.locals.input.query));
  };

  get = async (_req: Request, res: Response) => {
    res.json(await this.query.get(res.locals.input.params.id));
  };

  update = async (_req: Request, res: Response) => {
    const { params, body } = res.locals.input;
    res.json(await this.updater.update(params.id, body, res.locals.actor));
  };
}
