import { Router } from 'express';
import { z } from 'zod';
import { renderQuotePdf, renderReceiptPdf } from '../pdf.js';
import { createQuote, updateQuote, deleteQuote, createReceipt, deleteReceipt, shareQuote, publicQuote, quoteInclude, HttpError } from '../quotes.js';

export function createQuotesRouter(db) {
  const router = Router();

  router.get('/', async (req, res) => {
    const search = req.query.search?.toString().trim();
    const status = req.query.status?.toString().trim();
    const pageParam = req.query.page ? parseInt(req.query.page, 10) : null;
    const limitParam = req.query.limit ? parseInt(req.query.limit, 10) : 20;

    const page = pageParam && pageParam > 0 ? pageParam : 1;
    const limit = Math.min(Math.max(limitParam, 1), 100);

    const conditions = [];

    if (status && ['BORRADOR', 'ENVIADA', 'APROBADA'].includes(status)) {
      conditions.push({ status });
    }

    if (search) {
      const isNumber = !isNaN(Number(search)) && Number.isInteger(Number(search));
      const searchConditions = [
        { customer: { name: { contains: search, mode: 'insensitive' } } },
        { customer: { taxId: { contains: search, mode: 'insensitive' } } },
        { vehicle: { plate: { contains: search, mode: 'insensitive' } } },
        { vehicle: { brand: { contains: search, mode: 'insensitive' } } },
        { vehicle: { model: { contains: search, mode: 'insensitive' } } },
      ];
      if (isNumber) {
        searchConditions.push({ number: Number(search) });
      }
      conditions.push({ OR: searchConditions });
    }

    const where = conditions.length > 0 ? { AND: conditions } : {};

    // Sin parámetros explícitos de paginación/filtro, retorna array plano (para compatibilidad)
    if (!req.query.page && !req.query.search && !req.query.status && !req.query.limit) {
      const quotes = await db.quote.findMany({
        where,
        orderBy: { number: 'desc' },
        include: quoteInclude,
        take: 100,
      });
      return res.json(quotes);
    }

    const total = await db.quote.count({ where });
    const quotes = await db.quote.findMany({
      where,
      orderBy: { number: 'desc' },
      include: quoteInclude,
      skip: (page - 1) * limit,
      take: limit,
    });

    res.json({
      data: quotes,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  });

  router.get('/receipts/:receiptId/pdf', async (req, res) => {
    const receiptId = z.string().uuid().parse(req.params.receiptId);
    const [receipt, company] = await Promise.all([
      db.receipt.findUnique({
        where: { id: receiptId },
        include: { quote: { include: quoteInclude } },
      }),
      db.company.findUnique({ where: { id: 1 } }),
    ]);
    if (!receipt) throw new HttpError(404, 'Recibo no encontrado');

    const totalPaidSoFar = receipt.quote.receipts
      .filter(r => new Date(r.date) <= new Date(receipt.date))
      .reduce((sum, r) => sum + Number(r.amount), 0);

    const publicQ = publicQuote(receipt.quote);
    if (company?.signatureUrl) publicQ.companySnapshot.signatureUrl = company.signatureUrl;
    if (company?.logoUrl) publicQ.companySnapshot.logoUrl = company.logoUrl;

    const payload = {
      ...receipt,
      totalPaidSoFar,
      quote: publicQ,
    };

    res.type('pdf').attachment(`Recibo-${receipt.number}.pdf`).send(await renderReceiptPdf(payload));
  });

  router.delete('/receipts/:receiptId', async (req, res) => {
    const receiptId = z.string().uuid().parse(req.params.receiptId);
    await deleteReceipt(db, receiptId);
    res.status(204).end();
  });

  router.get('/:id', async (req, res) => {
    const quote = await db.quote.findUnique({ where: { id: z.string().uuid().parse(req.params.id) }, include: quoteInclude });
    if (!quote) throw new HttpError(404, 'Cotización no encontrada');
    res.json(quote);
  });

  router.get('/:id/pdf', async (req, res) => {
    const [quote, company] = await Promise.all([
      db.quote.findUnique({ where: { id: z.string().uuid().parse(req.params.id) }, include: quoteInclude }),
      db.company.findUnique({ where: { id: 1 } }),
    ]);
    if (!quote) throw new HttpError(404, 'Cotización no encontrada');

    const publicQ = publicQuote(quote);
    if (company?.signatureUrl) publicQ.companySnapshot.signatureUrl = company.signatureUrl;
    if (company?.logoUrl) publicQ.companySnapshot.logoUrl = company.logoUrl;

    res.type('pdf').attachment(`Cotizacion-${quote.number}.pdf`).send(await renderQuotePdf(publicQ));
  });

  router.post('/', async (req, res) => {
    res.status(201).json(await createQuote(db, req.body));
  });

  router.put('/:id', async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    res.json(await updateQuote(db, id, req.body));
  });

  router.post('/:id/receipts', async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    const receipt = await createReceipt(db, id, req.body);
    res.status(201).json(receipt);
  });

  router.patch('/:id/status', async (req, res) => {
    const status = z.enum(['BORRADOR', 'ENVIADA', 'APROBADA']).parse(req.body.status);
    res.json(await db.quote.update({ where: { id: z.string().uuid().parse(req.params.id) }, data: { status } }));
  });

  router.post('/:id/share', async (req, res) => {
    const quote = await shareQuote(db, z.string().uuid().parse(req.params.id));
    res.json({ path: `/q/${quote.publicToken}` });
  });

  router.delete('/:id/share', async (req, res) => {
    await db.quote.update({ where: { id: z.string().uuid().parse(req.params.id) }, data: { publicToken: null } });
    res.status(204).end();
  });

  router.delete('/:id', async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    await deleteQuote(db, id);
    res.status(204).end();
  });

  return router;
}
