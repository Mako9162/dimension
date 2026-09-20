import { Router } from 'express';
import { changePasswordSchema } from '../validation.js';
import { verifyPassword, hashPassword } from '../auth.js';
import { createLimiter } from '../security.js';

export function createAuthRouter(db) {
  const router = Router();
  const allowChange = createLimiter({ limit: 8, windowMs: 15 * 60 * 1000 });
  router.get('/me', (req, res) => res.json({ username: req.user.username }));

  router.post('/change-password', async (req, res) => {
    if (!allowChange(req.user.id)) return res.status(429).json({ error: 'Demasiados intentos. Espera 15 minutos.' });
    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
    const user = await db.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    const valid = await verifyPassword(currentPassword, user.passwordHash);
    if (!valid) return res.status(400).json({ error: 'La contraseña actual es incorrecta' });

    const newHash = await hashPassword(newPassword);
    await db.$transaction(async tx => {
      const updated = await tx.user.updateMany({ where: { id: user.id, passwordHash: user.passwordHash }, data: { passwordHash: newHash } });
      if (updated.count !== 1) { const error = new Error('La contraseña cambió. Intenta nuevamente.'); error.status = 409; throw error; }
      await tx.session.deleteMany({ where: { userId: user.id, id: { not: req.sessionId } } });
    }, { isolationLevel: 'Serializable' });

    res.json({ message: 'Contraseña actualizada con éxito' });
  });

  return router;
}
