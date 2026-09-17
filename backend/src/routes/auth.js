import { Router } from 'express';
import { changePasswordSchema } from '../validation.js';
import { verifyPassword, hashPassword } from '../auth.js';

export function createAuthRouter(db) {
  const router = Router();
  router.get('/me', (req, res) => res.json({ username: req.user.username }));

  router.post('/change-password', async (req, res) => {
    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
    const user = await db.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    const valid = await verifyPassword(currentPassword, user.passwordHash);
    if (!valid) return res.status(400).json({ error: 'La contraseña actual es incorrecta' });

    const newHash = await hashPassword(newPassword);
    await db.user.update({ where: { id: user.id }, data: { passwordHash: newHash } });

    res.json({ message: 'Contraseña actualizada con éxito' });
  });

  return router;
}
