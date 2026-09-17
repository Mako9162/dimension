import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { hashPassword } from '../src/auth.js';
import { createQuote } from '../src/quotes.js';

const db = new PrismaClient();
test('PostgreSQL: creación, FK, rollback, snapshots, privacidad y revocación', async () => {
  const suffix = randomUUID(), key = 'integration-test-admin-key';
  const app = createApp(db);
  const agent = request.agent(app);
  let customer, other, vehicle, item, quote, user;
  try {
    assert.ok(await db.company.findUnique({ where: { id: 1 } }), 'Ejecuta db:seed antes');
    customer = await db.customer.create({ data: { name: 'Test', taxId: suffix } });
    other = await db.customer.create({ data: { name: 'Otro', taxId: `${suffix}-2` } });
    vehicle = await db.vehicle.create({ data: { customerId: customer.id, brand: 'Test', model: 'Test', plate: suffix, year: 2020 } });
    item = await db.item.create({ data: { name: 'Trabajo test', category: 'MANO_OBRA', cost: 200, price: 1000 } });
    const body = { customerId: customer.id, vehicleId: vehicle.id, total: 1, lines: [{ itemId: item.id, quantity: 2 }] };
    await request(app).get('/api/items').expect(401);
    user = await db.user.create({ data: { username: suffix, passwordHash: await hashPassword(key) } });
    await agent.post('/api/auth/login').set('X-Requested-With', 'TallerDimension').send({ username: suffix, password: 'incorrecta' }).expect(401);
    await agent.post('/api/auth/login').send({ username: suffix, password: key }).expect(403);
    const login = await agent.post('/api/auth/login').set('X-Requested-With', 'TallerDimension').send({ username: suffix, password: key }).expect(200);
    assert.match(login.headers['set-cookie'][0], /HttpOnly/);
    assert.match(login.headers['set-cookie'][0], /SameSite=Strict/);
    await agent.get('/api/auth/me').expect(200);
    await request(app).get('/api/items').auth(key, { type: 'bearer' }).expect(401);
    const created = await agent.post('/api/quotes').set('X-Requested-With', 'TallerDimension').send(body).expect(201);
    quote = created.body;
    assert.equal(quote.total, '2380');
    assert.equal(quote.lines.length, 1);
    const pdf = await agent.get(`/api/quotes/${quote.id}/pdf`).expect(200).expect('Content-Type', /application\/pdf/);
    assert.equal(pdf.body.subarray(0, 4).toString(), '%PDF');
    await request(app).get(`/api/quotes/${quote.id}/pdf`).expect(401);
    await db.item.update({ where: { id: item.id }, data: { price: 8000 } });
    assert.equal(String((await db.quoteLine.findFirst({ where: { quoteId: quote.id } })).unitPrice), '1000');
    await assert.rejects(createQuote(db, { ...body, customerId: other.id }), /no pertenece/);
    const count = await db.quote.count();
    // FK inválida en la segunda línea: comprueba rollback tras INSERT de cabecera.
    await assert.rejects(db.$transaction(async tx => {
      const { id, number, lines, ...header } = quote;
      const copy = await tx.quote.create({ data: header });
      await tx.quoteLine.create({ data: { quoteId: copy.id, position: 0, name: 'Válido', category: 'INSUMO', quantity: 1, unitPrice: 1, lineTotal: 1 } });
      await tx.quoteLine.create({ data: { quoteId: copy.id, itemId: randomUUID(), position: 1, name: 'Inválido', category: 'INSUMO', quantity: 1, unitPrice: 1, lineTotal: 1 } });
    }));
    assert.equal(await db.quote.count(), count);
    await assert.rejects(db.quote.update({ where: { id: quote.id }, data: { customerId: other.id } }));
    const shared = await agent.post(`/api/quotes/${quote.id}/share`).set('X-Requested-With', 'TallerDimension').expect(200);
    const token = shared.body.path.split('/').pop();
    const published = await request(app).get(`/api/public/quotes/${token}`).expect(200);
    assert.equal(published.body.total, '2380');
    assert.equal(published.body.publicToken, undefined);
    assert.equal(published.body.lines[0].cost, undefined);
    await agent.delete(`/api/quotes/${quote.id}/share`).set('X-Requested-With', 'TallerDimension').expect(204);
    await request(app).get(`/api/public/quotes/${token}`).expect(404);
    await request(app).get(`/api/public/quotes/${token}/pdf`).expect(404);
    const tempItem = await db.item.create({ data: { name: 'Item Borrable', category: 'INSUMO', cost: 10, price: 20 } });
    await agent.delete(`/api/items/${tempItem.id}`).set('X-Requested-With', 'TallerDimension').expect(200);

    const tempCust = await db.customer.create({ data: { name: 'Cliente Borrable', taxId: `del-${suffix}` } });
    const tempVeh = await db.vehicle.create({ data: { customerId: tempCust.id, brand: 'Fiat', model: 'Uno', plate: `DEL-${suffix}`, year: 2015 } });
    await agent.delete(`/api/vehicles/${tempVeh.id}`).set('X-Requested-With', 'TallerDimension').expect(200);
    await agent.delete(`/api/customers/${tempCust.id}`).set('X-Requested-With', 'TallerDimension').expect(200);

    await agent.post('/api/auth/logout').set('X-Requested-With', 'TallerDimension').expect(204);
    await agent.get('/api/auth/me').expect(401);
  } finally {
    if (customer) await db.quote.deleteMany({ where: { customerId: customer.id } });
    if (vehicle) await db.vehicle.delete({ where: { id: vehicle.id } });
    if (item) await db.item.delete({ where: { id: item.id } });
    if (customer) await db.customer.delete({ where: { id: customer.id } });
    if (other) await db.customer.delete({ where: { id: other.id } });
    if (user) await db.user.delete({ where: { id: user.id } });
    await db.$disconnect();
  }
});
