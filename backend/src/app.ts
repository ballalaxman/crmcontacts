import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { pinoHttp } from 'pino-http'; // named export: the default import isn't callable under NodeNext
import { buildRoutes } from './http/routes/index.js';
import { actor } from './http/middleware/actor.js';
import { errorHandler, notFound } from './http/middleware/error-handler.js';
import type { Controllers } from './container.js';

export interface AppOptions {
  corsOrigins: string[];
  logging?: boolean;
  trustProxy?: number;
  rateLimitPerMinute?: number;
}

/** Factory, so tests can build the app without listening on a port. */
export function createApp(controllers: Controllers, opts: AppOptions) {
  const app = express();
  app.set('trust proxy', opts.trustProxy ?? 0);
  app.use(helmet());
  app.use(cors({ origin: opts.corsOrigins, allowedHeaders: ['Content-Type', 'X-Actor'] }));
  app.use(compression());
  app.use(express.json({ limit: '100kb' }));
  if (opts.logging !== false) app.use(pinoHttp());
  app.use('/api', rateLimit({
    windowMs: 60_000,
    limit: opts.rateLimitPerMinute ?? 300,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (_req, res) => {
      res.status(429).json({ error: { code: 'RATE_LIMITED', message: 'Too many requests' } });
    },
  }));
  app.use('/api', actor, buildRoutes(controllers));
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
