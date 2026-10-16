import type { RequestHandler } from 'express';

// Optional display name to demo "User A vs User B" in activity history. Not auth.
export const actor: RequestHandler = (req, res, next) => {
  const raw = req.header('x-actor');
  const cleaned = raw ? raw.trim().slice(0, 50).replace(/[^\w .@-]/g, '') : '';
  res.locals.actor = cleaned || undefined;
  next();
};
