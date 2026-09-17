import { db } from '../src/db.js';
try {
  await db.company.update({ where: { id: 1 }, data: { name: 'Taller Dimensión', logoUrl: '/brand/taller-dimension.png' } });
  console.log('Identidad Taller Dimensión aplicada. Cotizaciones históricas conservadas.');
} finally { await db.$disconnect(); }
