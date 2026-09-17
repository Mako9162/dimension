import test from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, verifyPassword } from '../src/auth.js';
import { changePasswordSchema } from '../src/validation.js';

test('contraseñas con sal individual y verificación segura', async () => {
  const a = await hashPassword('prueba-password-123');
  const b = await hashPassword('prueba-password-123');
  assert.notEqual(a, b);
  assert.equal(a.includes('prueba-password'), false);
  assert.equal(await verifyPassword('prueba-password-123', a), true);
  assert.equal(await verifyPassword('incorrecta', a), false);
});

test('validación de cambio de contraseña', () => {
  const valid = changePasswordSchema.safeParse({ currentPassword: 'oldpass123', newPassword: 'newpassword123' });
  assert.equal(valid.success, true);

  const short = changePasswordSchema.safeParse({ currentPassword: 'oldpass123', newPassword: '123' });
  assert.equal(short.success, false);
});

