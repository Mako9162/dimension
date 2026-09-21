import { z } from 'zod';

const text = z.string().trim().max(300);
const required = text.min(1);
const email = z.union([z.literal(''), z.string().email().max(254)]).default('');
const money = z.coerce.number().finite().min(0).max(100000000).multipleOf(0.01);
export const category = z.string().trim().min(1).max(100);
export const paymentMethod = z.enum(['EFECTIVO', 'TRANSFERENCIA', 'TARJETA_DEBITO', 'TARJETA_CREDITO', 'CHEQUE', 'OTRO']);
export const itemCategorySchema = z.object({ name: required });

export const customerSchema = z.object({ name: required, taxId: required, address: text.default(''), phone: text.default(''), email });

export const vehicleSchema = z.object({
  customerId: z.string().uuid(), brand: required, model: required,
  year: z.coerce.number().int().min(1900).max(new Date().getFullYear() + 2),
  plate: required.transform(v => v.toUpperCase()), color: text.default(''),
  vin: z.union([z.literal(''), text.min(5)]).optional().transform(v => v ? v.toUpperCase() : null),
});

export const itemSchema = z.object({ name: required, description: text.default(''), category, cost: money, price: money });

const imageUrl = z.string().max(3000000).refine(value => !value ||
  /^\/brand\/[a-zA-Z0-9_-]+\.png$/.test(value) ||
  /^\/uploads\/[a-zA-Z0-9_-]+\.(png|jpe?g|webp)$/.test(value) ||
  /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(value) ||
  /^https:\/\/[^\s]+$/i.test(value), 'Usa una imagen PNG, JPG o WebP, o una URL HTTPS').default('');

export const companySchema = z.object({
  name: required, ownerName: text.default(''), taxId: text.default(''), address: text.default(''), phone: text.default(''), email,
  logoUrl: imageUrl,
  signatureUrl: imageUrl,
  terms: z.string().max(10000).default(''),
});

export const quoteSchema = z.object({
  customerId: z.string().uuid(), vehicleId: z.string().uuid(),
  observations: z.string().max(10000).default(''), terms: z.string().max(10000).optional(),
  taxRate: z.coerce.number().finite().min(0).max(100).multipleOf(0.01).default(19),
  lines: z.array(z.object({
    itemId: z.string().uuid().optional(), name: required.optional(), description: text.default(''),
    category: category.optional(), quantity: z.coerce.number().finite().min(0.01).max(10000).multipleOf(0.01),
    unitPrice: money.optional(),
  }).superRefine((line, ctx) => {
    if (!line.itemId && (!line.name || !line.category || line.unitPrice === undefined))
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Un ítem libre requiere nombre, categoría y precio' });
  })).min(1).max(100),
});

export const quoteAcceptanceSchema = z.object({
  revision: z.number().int().min(1).max(2147483647),
  acceptedBy: z.string().trim().min(2, 'Ingresa tu nombre completo').max(120),
  confirmed: z.literal(true, { errorMap: () => ({ message: 'Debes aceptar los trabajos, el total y las condiciones' }) }),
}).strict();

export const receiptSchema = z.object({
  amount: z.coerce.number().finite().int('Ingresa el abono en pesos completos').positive('El monto del abono debe ser mayor a cero').max(100000000),
  paymentMethod: paymentMethod.default('EFECTIVO'),
  paidBy: z.string().max(300).optional().default(''),
  receivedBy: z.string().max(300).optional().default(''),
  notes: z.string().max(1000).optional().default(''),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Ingresa tu contraseña actual').max(256),
  newPassword: z.string().min(12, 'La nueva contraseña debe tener al menos 12 caracteres').max(256),
});
