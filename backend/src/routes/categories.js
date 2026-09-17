import { Router } from 'express';
import { itemCategorySchema } from '../validation.js';

export function createCategoriesRouter(db) {
  const router = Router();

  router.get('/', async (_req, res) => {
    const list = await db.itemCategory.findMany({ orderBy: { name: 'asc' } });
    res.json(list);
  });

  router.post('/', async (req, res) => {
    const { name } = itemCategorySchema.parse(req.body);
    const existing = await db.itemCategory.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } }
    });
    if (existing) return res.status(409).json({ error: 'La categoría ya existe' });

    const created = await db.itemCategory.create({ data: { name } });
    res.status(201).json(created);
  });

  router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    const existing = await db.itemCategory.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Categoría no encontrada' });

    await db.itemCategory.delete({ where: { id } });
    res.status(204).end();
  });

  return router;
}
