import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { z } from 'zod';
import { createLimiter } from './security.js';
const derive = promisify(scrypt);
const options = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const cookieName = 'dimension_session';
const ttl = 8 * 60 * 60 * 1000;
const digest = value => createHash('sha256').update(value).digest('hex');
const credentials = z.object({ username: z.string().trim().toLowerCase().min(1).max(80), password: z.string().min(1).max(256) });
export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  return `scrypt:${salt}:${(await derive(password, salt, 64, options)).toString('hex')}`;
}
export async function verifyPassword(password, stored) {
  const [, salt, hash] = stored.split(':');
  const actual = await derive(password, salt, 64, options);
  const expected = Buffer.from(hash, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
export async function ensureInitialUser(db, username, password) {
  if (await db.user.count()) return;
  if (!password || password.length < 12) throw new Error('Configura INITIAL_ADMIN_PASSWORD (mínimo 12 caracteres) para crear el primer usuario');
  await db.user.upsert({ where: { username }, update: {}, create: { username, passwordHash: await hashPassword(password) } });
}
function sessionId(req) {
  const raw = (req.headers.cookie || '').split(';').map(v => v.trim()).find(v => v.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1);
  return raw && /^[a-f0-9]{64}$/.test(raw) ? digest(raw) : null;
}
export function installAuth(app, db) {
  const allowIp = createLimiter({ limit: 30, windowMs: 15 * 60 * 1000 });
  const allowAccount = createLimiter({ limit: 15, windowMs: 15 * 60 * 1000 });
  const isProd = process.env.NODE_ENV === 'production';
  const cookieOptions = { httpOnly: true, sameSite: 'lax', secure: isProd, path: '/' };
  // Las mutaciones deben provenir del cliente propio. El navegador no permite
  // enviar esta cabecera desde otro origen sin una autorización CORS explícita.
  app.use('/api', (req, res, next) => {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && req.get('X-Requested-With') !== 'TallerDimension') return res.status(403).json({ error: 'Solicitud no autorizada' });
    next();
  });
  app.post('/api/auth/login', async (req, res) => {
    const { username, password } = credentials.parse(req.body);
    if (!allowIp(req.ip) || !allowAccount(digest(username))) return res.status(429).json({ error: 'Demasiados intentos. Espera 15 minutos antes de intentar nuevamente.' });
    const user = await db.user.findUnique({ where: { username } });
    const fallbackHash = `scrypt:${'0'.repeat(32)}:${'0'.repeat(128)}`;
    const valid = await verifyPassword(password, user?.passwordHash || fallbackHash);
    if (!user || !valid) return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    const raw = randomBytes(32).toString('hex');
    const previousId = sessionId(req);
    await db.$transaction(async tx => {
      const current = await tx.user.findUnique({ where: { id: user.id } });
      if (!current || current.passwordHash !== user.passwordHash) { const error = new Error('La contraseña cambió. Inicia sesión nuevamente.'); error.status = 401; throw error; }
      await tx.session.deleteMany({ where: { OR: [{ expiresAt: { lt: new Date() } }, ...(previousId ? [{ id: previousId }] : [])] } });
      await tx.session.create({ data: { id: digest(raw), userId: user.id, expiresAt: new Date(Date.now() + ttl) } });
    }, { isolationLevel: 'Serializable' });
    res.cookie(cookieName, raw, { ...cookieOptions, maxAge: ttl }).json({ username: user.username });
  });
  app.post('/api/auth/logout', async (req, res) => {
    const id = sessionId(req);
    if (id) await db.session.deleteMany({ where: { id } });
    res.clearCookie(cookieName, cookieOptions).status(204).end();
  });
  return async (req, res, next) => {
    const id = sessionId(req);
    const session = id ? await db.session.findUnique({ where: { id }, include: { user: true } }) : null;
    if (!session || session.expiresAt <= new Date()) return res.status(401).json({ error: 'Inicia sesión para continuar' });
    req.user = session.user;
    req.sessionId = id;
    next();
  };
}
