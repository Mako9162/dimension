import { Router } from 'express';
import { companySchema } from '../validation.js';

export function createCompanyRouter(db) {
  const router = Router();

  router.get('/', async (_req, res) => {
    res.json(await db.company.findUnique({ where: { id: 1 } }));
  });

  router.put('/', async (req, res) => {
    const data = companySchema.parse(req.body);
    res.json(await db.company.upsert({ where: { id: 1 }, create: { id: 1, ...data }, update: data }));
  });

  return router;
}
