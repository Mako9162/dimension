import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateTotals } from '../src/money.js';
import { quoteSchema } from '../src/validation.js';
import { publicQuote } from '../src/quotes.js';

test('calcula subtotal, IVA y total en CLP', () => {
  assert.deepEqual(calculateTotals([{ quantity: 2, unitPrice: 85000 }, { quantity: 1, unitPrice: 42000 }], 19), {
    lineTotals: ['170000', '42000'], subtotal: '212000', tax: '40280', total: '252280',
  });
});
test('redondea medios pesos por línea y admite cantidades fraccionarias', () => {
  assert.deepEqual(calculateTotals([{ quantity: '0.5', unitPrice: '101' }, { quantity: '0.1', unitPrice: '5' }], 19), {
    lineTotals: ['51', '1'], subtotal: '52', tax: '10', total: '62',
  });
});
test('permite impuesto cero', () => assert.equal(calculateTotals([{ quantity: 1, unitPrice: 999 }], 0).total, '999'));
const base = { customerId: '00000000-0000-4000-8000-000000000001', vehicleId: '00000000-0000-4000-8000-000000000002' };
test('rechaza cotización vacía e ítems libres incompletos', () => {
  for (const lines of [[], [{ quantity: 1 }], [{ name: 'Pintura', category: 'INSUMO', quantity: -1, unitPrice: 10 }]])
    assert.equal(quoteSchema.safeParse({ ...base, lines }).success, false);
});
test('ignora totales proporcionados por el navegador', () => {
  const parsed = quoteSchema.parse({ ...base, total: 1, lines: [{ name: 'Pulido', category: 'MANO_OBRA', quantity: 1, unitPrice: 5000 }] });
  assert.equal(parsed.total, undefined);
});
test('la vista pública excluye costos, contactos del cliente, VIN y token', () => {
  const result = publicQuote({ customerSnapshot: { name: 'Cliente', taxId: 'TEST', email: 'privado@test.cl' }, vehicleSnapshot: { vin: 'privado', plate: 'ABC' }, lines: [{ cost: 10, name: 'Pintura', itemId: 'privado' }], publicToken: 'secreto' });
  assert.equal(JSON.stringify(result).includes('privado'), false);
  assert.equal(result.publicToken, undefined);
  assert.equal(result.lines[0].cost, undefined);
});

test('la aceptación pública expone solo la confirmación vigente, sin snapshots ni historial privado', () => {
  const quote = { revision: 2, customerSnapshot: {}, vehicleSnapshot: {}, lines: [], acceptances: [
    { id: 'privado', revision: 1, acceptedBy: 'Nombre anterior', acceptedAt: '2026-09-20', quoteSnapshot: { notes: 'privado' } },
    { id: 'privado', revision: 2, acceptedBy: 'Cliente actual', acceptedAt: '2026-09-21', quoteSnapshot: { notes: 'privado' } },
  ] };
  const result = publicQuote(quote);
  assert.deepEqual(result.acceptance, { revision: 2, acceptedBy: 'Cliente actual', acceptedAt: '2026-09-21' });
  assert.equal(JSON.stringify(result).includes('privado'), false);
  assert.equal(result.acceptances, undefined);
  assert.equal(publicQuote({ ...quote, revision: 3 }).acceptance, null);
});
