import { Router } from 'express';
import { z } from 'zod';
import { customerSchema, vehicleSchema, itemSchema } from '../validation.js';

export function createCatalogRouter(db) {
  const router = Router();

  // Clientes
  router.get('/customers', async (req, res) => {
    const search = req.query.search?.toString().trim();
    const where = search ? {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { taxId: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ],
    } : {};
    res.json(await db.customer.findMany({ where, orderBy: { name: 'asc' } }));
  });

  router.post('/customers', async (req, res) => {
    res.status(201).json(await db.customer.create({ data: customerSchema.parse(req.body) }));
  });

  router.put('/customers/:id', async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    res.json(await db.customer.update({ where: { id }, data: customerSchema.parse(req.body) }));
  });

  router.delete('/customers/:id', async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    try {
      await db.customer.delete({ where: { id } });
      res.json({ success: true });
    } catch (err) {
      if (err.code === 'P2003') {
        return res.status(400).json({ error: 'No se puede eliminar el cliente porque tiene vehículos o cotizaciones asociadas.' });
      }
      res.status(500).json({ error: 'Error al eliminar el cliente.' });
    }
  });

  // Vehículos
  router.get('/vehicles', async (req, res) => {
    const search = req.query.search?.toString().trim();
    const where = search ? {
      OR: [
        { plate: { contains: search, mode: 'insensitive' } },
        { brand: { contains: search, mode: 'insensitive' } },
        { model: { contains: search, mode: 'insensitive' } },
        { vin: { contains: search, mode: 'insensitive' } },
      ],
    } : {};
    res.json(await db.vehicle.findMany({ where, orderBy: { plate: 'asc' } }));
  });

  router.post('/vehicles', async (req, res) => {
    res.status(201).json(await db.vehicle.create({ data: vehicleSchema.parse(req.body) }));
  });

  router.put('/vehicles/:id', async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    res.json(await db.vehicle.update({ where: { id }, data: vehicleSchema.parse(req.body) }));
  });

  router.delete('/vehicles/:id', async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    try {
      await db.vehicle.delete({ where: { id } });
      res.json({ success: true });
    } catch (err) {
      if (err.code === 'P2003') {
        return res.status(400).json({ error: 'No se puede eliminar el vehículo porque tiene cotizaciones asociadas.' });
      }
      res.status(500).json({ error: 'Error al eliminar el vehículo.' });
    }
  });

  // Ítems del catálogo
  router.get('/items', async (req, res) => {
    const search = req.query.search?.toString().trim();
    const where = search ? {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ],
    } : {};
    res.json(await db.item.findMany({ where, orderBy: { name: 'asc' } }));
  });

  router.post('/items', async (req, res) => {
    res.status(201).json(await db.item.create({ data: itemSchema.parse(req.body) }));
  });

  router.put('/items/:id', async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    res.json(await db.item.update({ where: { id }, data: itemSchema.parse(req.body) }));
  });

  router.delete('/items/:id', async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    try {
      await db.item.delete({ where: { id } });
      res.json({ success: true });
    } catch (err) {
      if (err.code === 'P2003') {
        return res.status(400).json({ error: 'No se puede eliminar el ítem del catálogo porque está en uso.' });
      }
      res.status(500).json({ error: 'Error al eliminar el ítem.' });
    }
  });

  return router;
}
