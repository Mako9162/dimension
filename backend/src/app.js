import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import helmet from 'helmet';
import { ZodError } from 'zod';
import { installAuth } from './auth.js';
import { createAuthRouter } from './routes/auth.js';
import { createPublicRouter } from './routes/public.js';
import { createCompanyRouter } from './routes/company.js';
import { createCatalogRouter } from './routes/catalog.js';
import { createQuotesRouter } from './routes/quotes.js';
import { createUploadRouter } from './routes/upload.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.resolve(__dirname, '../../frontend/public/uploads');

export function createApp(db) {
  const app = express();
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    }
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });
  app.use('/uploads', express.static(uploadsDir));
  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ limit: '15mb', extended: true }));
  app.use('/api', (_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });

  const requireSession = installAuth(app, db);

  app.get('/api/health', async (_req, res) => {
    await db.$queryRaw`SELECT 1`;
    res.json({ status: 'ok' });
  });

  // Rutas públicas (sin sesión)
  app.use('/api/public', createPublicRouter(db));

  // Middleware de sesión obligatoria para rutas privadas
  app.use('/api', requireSession);

  // Rutas privadas modulares
  app.use('/api/auth', createAuthRouter(db));
  app.use('/api/company', createCompanyRouter(db));
  app.use('/api/upload', createUploadRouter());
  app.use('/api', createCatalogRouter(db));
  app.use('/api/quotes', createQuotesRouter(db));

  app.use('/api', (_req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));

  app.use((error, _req, res, _next) => {
    if (error instanceof ZodError) return res.status(400).json({ error: 'Revisa los campos ingresados', details: error.issues });
    if (error.code === 'P2002') return res.status(409).json({ error: 'El RUT, patente o VIN ya está registrado' });
    if (error.code === 'P2025') return res.status(404).json({ error: 'Registro no encontrado' });
    if (error.code === 'P2003') return res.status(409).json({ error: 'La relación indicada no existe o tiene cotizaciones asociadas' });
    if (error.code === 'P2034') return res.status(409).json({ error: 'Hubo una modificación simultánea. Intenta guardar otra vez' });
    if (error.status && error.status < 500) return res.status(error.status).json({ error: error.message });
    console.error(error);
    res.status(500).json({ error: 'No fue posible completar la operación' });
  });

  return app;
}
