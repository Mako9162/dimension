import { Router } from 'express';
import { normalizeImage } from '../pdf.js';
import { createLimiter } from '../security.js';

export function createUploadRouter() {
  const router = Router();
  const allow = createLimiter({ limit: 12, windowMs: 60000 });
  router.post('/', async (req, res) => {
    if (!allow(req.user.id)) return res.status(429).json({ error: 'Espera un minuto antes de subir más imágenes.' });
    if (typeof req.body?.image !== 'string' || req.body.image.length > 7 * 1024 * 1024) return res.status(400).json({ error: 'La imagen debe ser PNG, JPG o WebP y no superar 5 MB.' });
    try {
      const image = await normalizeImage(req.body.image);
      res.json({ url: `data:image/png;base64,${image.toString('base64')}` });
    } catch (error) {
      if (error.status === 503) throw error;
      res.status(400).json({ error: 'Imagen inválida. Usa PNG, JPG o WebP de hasta 5 MB y 16 megapíxeles.' });
    }
  });
  return router;
}
