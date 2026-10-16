import type { Request, Response } from 'express';
import type { TagRegistry } from '../../domain/ports.js';
import type { ContactTagService } from '../../services/contact-tag.service.js';

export class TagController {
  constructor(private readonly tagService: ContactTagService, private readonly registry: TagRegistry) {}

  list = async (_req: Request, res: Response) => {
    res.json(await this.registry.list());
  };

  add = async (_req: Request, res: Response) => {
    const { params, body } = res.locals.input;
    res.json(await this.tagService.add(params.id, body.tag, res.locals.actor));
  };

  remove = async (_req: Request, res: Response) => {
    const { params } = res.locals.input;
    res.json(await this.tagService.remove(params.id, params.tag, res.locals.actor));
  };

  bulkAdd = async (_req: Request, res: Response) => {
    const { body } = res.locals.input;
    res.json(await this.tagService.bulkAdd(body.contactIds, body.tag, res.locals.actor));
  };
}
