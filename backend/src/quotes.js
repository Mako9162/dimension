import { randomBytes } from 'node:crypto';
import { calculateTotals } from './money.js';
import { quoteSchema, receiptSchema } from './validation.js';

export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

export const quoteInclude = {
  lines: { orderBy: { position: 'asc' } },
  receipts: { orderBy: { date: 'asc' } },
};

export async function createQuote(db, input) {
  const data = quoteSchema.parse(input);
  return db.$transaction(async tx => {
    const [customer, vehicle, company, items] = await Promise.all([
      tx.customer.findUnique({ where: { id: data.customerId } }),
      tx.vehicle.findUnique({ where: { id: data.vehicleId } }),
      tx.company.findUnique({ where: { id: 1 } }),
      tx.item.findMany({ where: { id: { in: data.lines.map(l => l.itemId).filter(Boolean) } } }),
    ]);
    if (!customer || !vehicle || vehicle.customerId !== customer.id)
      throw new HttpError(400, 'El vehículo no pertenece al cliente seleccionado');
    if (!company) throw new HttpError(400, 'Configura los datos del taller primero');
    const lines = data.lines.map((line, position) => {
      const item = items.find(i => i.id === line.itemId);
      if (line.itemId && !item) throw new HttpError(400, 'Un ítem del catálogo ya no existe');
      return {
        position, itemId: item?.id, name: item?.name ?? line.name,
        description: item?.description ?? line.description, category: item?.category ?? line.category,
        quantity: line.quantity, unitPrice: line.unitPrice ?? String(item.price),
      };
    });
    const { lineTotals, ...totals } = calculateTotals(lines, data.taxRate);
    return tx.quote.create({
      data: {
        customerId: customer.id, vehicleId: vehicle.id, observations: data.observations,
        terms: data.terms ?? company.terms, taxRate: data.taxRate, ...totals,
        companySnapshot: company,
        customerSnapshot: { name: customer.name, taxId: customer.taxId, address: customer.address || '', phone: customer.phone, email: customer.email },
        vehicleSnapshot: { brand: vehicle.brand, model: vehicle.model, year: vehicle.year, plate: vehicle.plate, color: vehicle.color, vin: vehicle.vin },
        lines: { create: lines.map((line, i) => ({ ...line, lineTotal: lineTotals[i] })) },
      }, include: quoteInclude,
    });
  }, { isolationLevel: 'Serializable' });
}

export async function updateQuote(db, id, input) {
  const data = quoteSchema.parse(input);
  return db.$transaction(async tx => {
    const existing = await tx.quote.findUnique({
      where: { id },
      include: { receipts: true, lines: true },
    });
    if (!existing) throw new HttpError(404, 'Cotización no encontrada');

    const totalPaid = existing.receipts.reduce((sum, r) => sum + Number(r.amount), 0);

    const [customer, vehicle, company, items] = await Promise.all([
      tx.customer.findUnique({ where: { id: data.customerId } }),
      tx.vehicle.findUnique({ where: { id: data.vehicleId } }),
      tx.company.findUnique({ where: { id: 1 } }),
      tx.item.findMany({ where: { id: { in: data.lines.map(l => l.itemId).filter(Boolean) } } }),
    ]);
    if (!customer || !vehicle || vehicle.customerId !== customer.id)
      throw new HttpError(400, 'El vehículo no pertenece al cliente seleccionado');
    if (!company) throw new HttpError(400, 'Configura los datos del taller primero');

    const lines = data.lines.map((line, position) => {
      const item = items.find(i => i.id === line.itemId);
      if (line.itemId && !item) throw new HttpError(400, 'Un ítem del catálogo ya no existe');
      return {
        position, itemId: item?.id, name: item?.name ?? line.name,
        description: item?.description ?? line.description, category: item?.category ?? line.category,
        quantity: line.quantity, unitPrice: line.unitPrice ?? String(item.price),
      };
    });
    const { lineTotals, ...totals } = calculateTotals(lines, data.taxRate);

    if (totalPaid > totals.total) {
      throw new HttpError(400, `No se puede modificar la cotización a un valor menor ($${totals.total}) que el total ya abonado ($${totalPaid})`);
    }

    // Borrar líneas antiguas y crear nuevas
    await tx.quoteLine.deleteMany({ where: { quoteId: id } });

    return tx.quote.update({
      where: { id },
      data: {
        customerId: customer.id, vehicleId: vehicle.id, observations: data.observations,
        terms: data.terms ?? company.terms, taxRate: data.taxRate, ...totals,
        companySnapshot: company,
        customerSnapshot: { name: customer.name, taxId: customer.taxId, address: customer.address || '', phone: customer.phone, email: customer.email },
        vehicleSnapshot: { brand: vehicle.brand, model: vehicle.model, year: vehicle.year, plate: vehicle.plate, color: vehicle.color, vin: vehicle.vin },
        lines: { create: lines.map((line, i) => ({ ...line, lineTotal: lineTotals[i] })) },
      }, include: quoteInclude,
    });
  }, { isolationLevel: 'Serializable' });
}

export async function createReceipt(db, quoteId, input) {
  const data = receiptSchema.parse(input);
  return db.$transaction(async tx => {
    const quote = await tx.quote.findUnique({
      where: { id: quoteId },
      include: { receipts: true },
    });
    if (!quote) throw new HttpError(404, 'Cotización no encontrada');

    const currentPaid = quote.receipts.reduce((sum, r) => sum + Number(r.amount), 0);
    const quoteTotal = Number(quote.total);
    const remainingBalance = quoteTotal - currentPaid;

    if (remainingBalance <= 0) {
      throw new HttpError(400, 'La cotización ya ha sido pagada en su totalidad');
    }

    if (data.amount > remainingBalance) {
      throw new HttpError(400, `El monto ingresado ($${data.amount}) supera el saldo pendiente de $${remainingBalance}`);
    }

    const receipt = await tx.receipt.create({
      data: {
        quoteId,
        amount: data.amount,
        paymentMethod: data.paymentMethod,
        paidBy: data.paidBy || quote.customerSnapshot.name || '',
        receivedBy: data.receivedBy || quote.companySnapshot.ownerName || quote.companySnapshot.name || '',
        notes: data.notes,
      },
    });

    return receipt;
  });
}

export async function deleteReceipt(db, receiptId) {
  const receipt = await db.receipt.findUnique({ where: { id: receiptId } });
  if (!receipt) throw new HttpError(404, 'Recibo no encontrado');
  await db.receipt.delete({ where: { id: receiptId } });
}

export async function deleteQuote(db, id) {
  const quote = await db.quote.findUnique({ where: { id } });
  if (!quote) throw new HttpError(404, 'Cotización no encontrada');
  await db.quote.delete({ where: { id } });
}

export async function shareQuote(db, id) {
  return db.quote.update({ where: { id }, data: { publicToken: randomBytes(32).toString('hex') } });
}

export function publicQuote(q) {
  const totalPaid = (q.receipts || []).reduce((sum, r) => sum + Number(r.amount), 0);
  const total = Number(q.total);
  const remainingBalance = Math.max(0, total - totalPaid);
  const paymentStatus = totalPaid >= total ? 'PAGADO' : totalPaid > 0 ? 'ABONADO' : 'PENDIENTE';

  return {
    id: q.id,
    number: q.number, date: q.date, status: q.status, observations: q.observations, terms: q.terms,
    taxRate: q.taxRate, subtotal: q.subtotal, tax: q.tax, total: q.total,
    totalPaid, remainingBalance, paymentStatus,
    companySnapshot: q.companySnapshot,
    customerSnapshot: { name: q.customerSnapshot.name, taxId: q.customerSnapshot.taxId, address: q.customerSnapshot.address || '' },
    vehicleSnapshot: { brand: q.vehicleSnapshot.brand, model: q.vehicleSnapshot.model, year: q.vehicleSnapshot.year, plate: q.vehicleSnapshot.plate, color: q.vehicleSnapshot.color },
    lines: q.lines.map(l => ({ position: l.position, name: l.name, description: l.description, category: l.category, quantity: l.quantity, unitPrice: l.unitPrice, lineTotal: l.lineTotal })),
    receipts: (q.receipts || []).map(r => ({ id: r.id, number: r.number, date: r.date, amount: r.amount, paymentMethod: r.paymentMethod, paidBy: r.paidBy, receivedBy: r.receivedBy, notes: r.notes })),
  };
}
