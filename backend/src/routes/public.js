import { Router } from 'express';
import { renderQuotePdf, renderReceiptPdf } from '../pdf.js';
import { publicQuote, quoteInclude, HttpError } from '../quotes.js';

export function createPublicRouter(db) {
  const router = Router();

  router.get('/quotes/:token', async (req, res) => {
    if (!/^[a-f0-9]{64}$/.test(req.params.token)) throw new HttpError(404, 'Cotización no disponible');
    const quote = await db.quote.findUnique({ where: { publicToken: req.params.token }, include: quoteInclude });
    if (!quote) throw new HttpError(404, 'Cotización no disponible');
    res.json(publicQuote(quote));
  });

  router.get('/quotes/:token/pdf', async (req, res) => {
    if (!/^[a-f0-9]{64}$/.test(req.params.token)) throw new HttpError(404, 'Cotización no disponible');
    const quote = await db.quote.findUnique({ where: { publicToken: req.params.token }, include: quoteInclude });
    if (!quote) throw new HttpError(404, 'Cotización no disponible');
    res.type('pdf').attachment(`Cotizacion-${quote.number}.pdf`).send(await renderQuotePdf(publicQuote(quote)));
  });

  router.get('/quotes/:token/receipts/:receiptId/pdf', async (req, res) => {
    if (!/^[a-f0-9]{64}$/.test(req.params.token)) throw new HttpError(404, 'Cotización no disponible');
    const quote = await db.quote.findUnique({ where: { publicToken: req.params.token }, include: quoteInclude });
    if (!quote) throw new HttpError(404, 'Cotización no disponible');

    const receipt = (quote.receipts || []).find(r => r.id === req.params.receiptId);
    if (!receipt) throw new HttpError(404, 'Recibo no encontrado');

    const totalPaidSoFar = quote.receipts
      .filter(r => new Date(r.date) <= new Date(receipt.date))
      .reduce((sum, r) => sum + Number(r.amount), 0);

    const payload = {
      ...receipt,
      totalPaidSoFar,
      quote: publicQuote(quote),
    };

    res.type('pdf').attachment(`Recibo-${receipt.number}.pdf`).send(await renderReceiptPdf(payload));
  });

  return router;
}
