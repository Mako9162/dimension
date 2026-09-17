import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.resolve(__dirname, '../../../frontend/public/uploads');

export function createUploadRouter() {
  const router = Router();

  router.post('/', async (req, res, next) => {
    try {
      const { image, name } = req.body || {};
      if (!image || typeof image !== 'string') {
        return res.status(400).json({ error: 'No se proporcionó la imagen' });
      }

      let buffer;
      let ext = 'png';

      if (image.startsWith('data:image/')) {
        const matches = image.match(/^data:image\/([a-zA-Z0-9+\-+]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
          return res.status(400).json({ error: 'Formato de imagen Base64 inválido' });
        }
        ext = matches[1] === 'jpeg' ? 'jpg' : matches[1].replace('+xml', '');
        buffer = Buffer.from(matches[2], 'base64');
      } else {
        return res.status(400).json({ error: 'La imagen debe enviarse en formato Data URL Base64' });
      }

      if (buffer.length > 5 * 1024 * 1024) {
        return res.status(400).json({ error: 'La imagen excede el límite de 5 MB' });
      }

      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const prefix = (name || 'upload').replace(/[^a-zA-Z0-9_-]/g, '');
      const filename = `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${ext}`;
      const filePath = path.join(uploadsDir, filename);

      fs.writeFileSync(filePath, buffer);

      return res.json({ url: `/uploads/${filename}` });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
