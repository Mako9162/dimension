import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/auth.js';

const db = new PrismaClient();

try {
  if ((await db.user.count()) === 0) {
    const hash = await hashPassword('admin123');
    await db.user.create({ data: { username: 'admin', passwordHash: hash } });
  }

  await db.company.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      name: 'Taller Dimensión',
      logoUrl: '/brand/taller-dimension.png',
      terms: 'Cotización válida por 15 días. Trabajos adicionales sujetos a aprobación del cliente.'
    }
  });

  const customer = await db.customer.upsert({
    where: { taxId: 'DEMO-001' },
    update: {},
    create: { name: 'Cliente de ejemplo', taxId: 'DEMO-001', phone: '+56 9 1234 5678' }
  });

  await db.vehicle.upsert({
    where: { plate: 'DEMO01' },
    update: {},
    create: { customerId: customer.id, brand: 'Toyota', model: 'Corolla', year: 2021, plate: 'DEMO01', color: 'Gris' }
  });

  const defaultCategories = ['Repuesto', 'Insumo', 'Mano de obra', 'Pintura', 'Desabolladura', 'Mecánica', 'Electricidad'];
  for (const catName of defaultCategories) {
    const existing = await db.itemCategory.findFirst({ where: { name: { equals: catName, mode: 'insensitive' } } });
    if (!existing) await db.itemCategory.create({ data: { name: catName } });
  }

  for (const [id, name, category, cost, price] of [
    ['00000000-0000-4000-8000-000000000001', 'Parachoques delantero', 'Repuesto', 80000, 120000],
    ['00000000-0000-4000-8000-000000000002', 'Pintura y barniz', 'Insumo', 25000, 42000],
    ['00000000-0000-4000-8000-000000000003', 'Preparación y pintura por paño', 'Mano de obra', 30000, 85000]
  ]) {
    await db.item.upsert({ where: { id }, update: {}, create: { id, name, category, cost, price } });
  }

  console.log('Datos de ejemplo y usuario admin disponibles');
} finally {
  await db.$disconnect();
}
