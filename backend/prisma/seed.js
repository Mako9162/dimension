import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();
try {
  await db.company.upsert({ where: { id: 1 }, update: {}, create: { id: 1, name: 'Taller Dimensión', logoUrl: '/brand/taller-dimension.png', terms: 'Cotización válida por 15 días. Trabajos adicionales sujetos a aprobación del cliente.' } });
  const customer = await db.customer.upsert({ where: { taxId: 'DEMO-001' }, update: {}, create: { name: 'Cliente de ejemplo', taxId: 'DEMO-001', phone: '+56 9 1234 5678' } });
  await db.vehicle.upsert({ where: { plate: 'DEMO01' }, update: {}, create: { customerId: customer.id, brand: 'Toyota', model: 'Corolla', year: 2021, plate: 'DEMO01', color: 'Gris' } });
  for (const [id, name, category, cost, price] of [
    ['00000000-0000-4000-8000-000000000001', 'Parachoques delantero', 'REPUESTO', 80000, 120000],
    ['00000000-0000-4000-8000-000000000002', 'Pintura y barniz', 'INSUMO', 25000, 42000],
    ['00000000-0000-4000-8000-000000000003', 'Preparación y pintura por paño', 'MANO_OBRA', 30000, 85000],
  ]) await db.item.upsert({ where: { id }, update: {}, create: { id, name, category, cost, price } });
  console.log('Datos de ejemplo disponibles');
} finally { await db.$disconnect(); }
