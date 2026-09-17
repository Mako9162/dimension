import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { renderQuotePdf } from '../src/pdf.js';
import { calculateTotals } from '../src/money.js';
const folder = new URL('../../output/pdf/', import.meta.url);
await mkdir(folder, { recursive: true });
const lines = [
  { name: 'Reparación de parachoques delantero', category: 'MANO_OBRA', quantity: 1, unitPrice: 65000 },
  { name: 'Preparación y pintura por paño', category: 'MANO_OBRA', quantity: 2, unitPrice: 85000 },
  { name: 'Pintura y barniz automotriz', category: 'INSUMO', quantity: 1, unitPrice: 42000 },
];
const { lineTotals, ...totals } = calculateTotals(lines, 19);
const quote = {
  number: 1, date: new Date().toISOString(), example: true, status: 'BORRADOR', taxRate: 19, ...totals,
  companySnapshot: { name: 'Taller Dimensión', logoUrl: '/brand/taller-dimension.png' },
  customerSnapshot: { name: 'Cliente de ejemplo', taxId: 'DEMO-001' },
  vehicleSnapshot: { brand: 'Toyota', model: 'Corolla', year: 2021, plate: 'DEMO01', color: 'Gris' },
  lines: lines.map((l, i) => ({ ...l, position: i, lineTotal: lineTotals[i] })),
  observations: 'Reparación de deformación en parachoques delantero y pintura de dos paños. Plazo estimado: 3 días hábiles desde la recepción del vehículo.',
  terms: 'Cotización válida por 15 días. Los trabajos adicionales que se detecten durante la reparación se informarán y realizarán únicamente con la aprobación del cliente.',
};
const file = new URL('Cotizacion-Taller-Dimension-ejemplo.pdf', folder);
await writeFile(file, await renderQuotePdf(quote));
console.log(fileURLToPath(file));
if (process.argv.includes('--stress')) {
  const long = { ...quote, lines: Array.from({ length: 100 }, (_, i) => ({ ...quote.lines[i % 3], position: i, name: `Trabajo ${i + 1} ` + 'Descripción extensa de reparación y pintura. '.repeat(6) })), observations: 'Observaciones extensas de daños. '.repeat(300) };
  const values = calculateTotals(long.lines, 19);
  Object.assign(long, { subtotal: values.subtotal, tax: values.tax, total: values.total });
  const temp = new URL('../../tmp/pdfs/', import.meta.url);
  await mkdir(temp, { recursive: true });
  await writeFile(new URL('stress.pdf', temp), await renderQuotePdf(long));
}
