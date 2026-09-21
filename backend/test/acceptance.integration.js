import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { hashPassword } from '../src/auth.js';
import { createQuote, acceptanceConsent } from '../src/quotes.js';

const db = new PrismaClient();
const header = ['X-Requested-With', 'TallerDimension'];

test('Aceptación pública: integridad, revisiones, concurrencia y control de acceso', async t => {
  const app = createApp(db), admin = request.agent(app), suffix = randomUUID();
  let user, customer, vehicle;
  try {
    user = await db.user.create({ data: { username: suffix, passwordHash: await hashPassword('acceptance-test-password') } });
    await admin.post('/api/auth/login').set(...header).send({ username: suffix, password: 'acceptance-test-password' }).expect(200);
    customer = await db.customer.create({ data: { name: 'Cliente de prueba aceptación', taxId: suffix } });
    vehicle = await db.vehicle.create({ data: { customerId: customer.id, brand: 'QA', model: 'QA', plate: suffix, year: 2021 } });
    const body = { customerId: customer.id, vehicleId: vehicle.id, terms: 'Condiciones de prueba', lines: [{ name: 'Pintura', category: 'Mano de obra', unitPrice: 10000, quantity: 1 }] };
    const newQuote = () => createQuote(db, body);
    const share = async q => (await admin.post(`/api/quotes/${q.id}/share`).set(...header).expect(200)).body.path.split('/').pop();
    const accept = (token, revision = 1, extra = {}) => request(app).post(`/api/public/quotes/${token}/accept`).set(...header).send({ revision, acceptedBy: 'Cliente QA', confirmed: true, ...extra });
    let quote, token;

    await t.test('compartir habilita aceptación sin sesión y consultar no aprueba', async () => {
      quote = await newQuote(); token = await share(quote);
      const publicPage = await request(app).get(`/api/public/quotes/${token}`).expect(200);
      assert.equal(publicPage.body.status, 'ENVIADA');
      assert.equal(publicPage.body.revision, 1);
      assert.equal(publicPage.body.acceptanceConsent, acceptanceConsent);
      assert.equal(publicPage.body.acceptance, null);
      await request(app).head(`/api/public/quotes/${token}`).expect(200);
      assert.equal(await db.quoteAcceptance.count({ where: { quoteId: quote.id } }), 0);
      assert.equal(await share(quote), token);
    });

    await t.test('valida nombre, consentimiento, versión y origen; no acepta valores impuestos por el navegador', async () => {
      for (const extra of [{ acceptedBy: ' ' }, { acceptedBy: 'a'.repeat(121) }, { confirmed: false }, { total: 1 }, { status: 'APROBADA' }]) await accept(token, 1, extra).expect(400);
      await accept(token, 2).expect(409);
      await request(app).post(`/api/public/quotes/${token}/accept`).send({ revision: 1, acceptedBy: 'Cliente', confirmed: true }).expect(403);
      await accept(token).set('Origin', 'https://intruso.example').expect(403);
      await request(app).patch(`/api/quotes/${quote.id}/status`).set(...header).send({ status: 'APROBADA' }).expect(401);
      assert.equal((await db.quote.findUnique({ where: { id: quote.id } })).status, 'ENVIADA');
    });

    await t.test('aceptación atómica y repetición simultánea conservan una sola evidencia', async () => {
      const results = await Promise.all([accept(token), accept(token), accept(token)]);
      results.forEach(r => assert.equal(r.status, 200, JSON.stringify(r.body)));
      const accepted = results[0].body;
      assert.equal(accepted.status, 'APROBADA');
      assert.equal(accepted.total, '11900');
      assert.equal(accepted.acceptance.acceptedBy, 'Cliente QA');
      assert.ok(accepted.acceptance.acceptedAt);
      assert.equal(accepted.acceptances, undefined);
      assert.equal(accepted.publicToken, undefined);
      assert.equal(accepted.acceptance.quoteSnapshot, undefined);
      const evidence = await db.quoteAcceptance.findMany({ where: { quoteId: quote.id } });
      assert.equal(evidence.length, 1);
      assert.equal(evidence[0].quoteSnapshot.total, '11900');
      assert.equal(evidence[0].quoteSnapshot.terms, body.terms);
      assert.equal(evidence[0].consentText, acceptanceConsent);
      const repeated = await accept(token, 1, { acceptedBy: 'No debe reemplazar' }).expect(200);
      assert.deepEqual(repeated.body.acceptance, accepted.acceptance);
      const list = await admin.get('/api/quotes').query({ page: 1, search: vehicle.plate }).expect(200);
      assert.equal(list.body.data[0].acceptances[0].acceptedBy, 'Cliente QA');
      await admin.delete(`/api/quotes/${quote.id}`).set(...header).expect(409);
    });

    await t.test('editar retira el enlace anterior, conserva evidencia y exige aceptar la nueva versión', async () => {
      const changed = { ...body, lines: [{ ...body.lines[0], unitPrice: 20000 }] };
      const edit = await admin.put(`/api/quotes/${quote.id}`).set(...header).send(changed).expect(200);
      assert.equal(edit.body.revision, 2);
      assert.equal(edit.body.status, 'BORRADOR');
      assert.equal(edit.body.publicToken, null);
      assert.equal(edit.body.acceptances.length, 1);
      await accept(token).expect(404);
      await request(app).get(`/api/public/quotes/${token}/pdf`).expect(404);
      const old = await db.quoteAcceptance.findFirst({ where: { quoteId: quote.id } });
      assert.equal(old.quoteSnapshot.total, '11900');
      const next = await share(quote);
      assert.notEqual(next, token);
      await accept(next, 1).expect(409);
      const accepted = await accept(next, 2).expect(200);
      assert.equal(accepted.body.total, '23800');
      assert.equal(accepted.body.acceptance.revision, 2);
      assert.equal(await db.quoteAcceptance.count({ where: { quoteId: quote.id } }), 2);
      token = next;
    });

    await t.test('reabrir una aprobación no reutiliza su aceptación anterior', async () => {
      const reopened = await admin.patch(`/api/quotes/${quote.id}/status`).set(...header).send({ status: 'ENVIADA' }).expect(200);
      assert.equal(reopened.body.revision, 3);
      assert.equal(reopened.body.publicToken, null);
      token = await share(quote);
      const page = await request(app).get(`/api/public/quotes/${token}`).expect(200);
      assert.equal(page.body.acceptance, null);
      assert.equal(page.body.acceptances, undefined);
      await accept(token, 2).expect(409);
      await accept(token, 3).expect(200);
    });

    await t.test('los recibos públicos pertenecen a la cotización del enlace', async () => {
      const receipt = await admin.post(`/api/quotes/${quote.id}/receipts`).set(...header).send({ amount: 1000 }).expect(201);
      const pdf = await request(app).get(`/api/public/quotes/${token}/receipts/${receipt.body.id}/pdf`).expect(200).expect('Content-Type', /application\/pdf/);
      assert.equal(pdf.body.subarray(0, 4).toString(), '%PDF');
      const other = await newQuote(), otherToken = await share(other);
      await request(app).get(`/api/public/quotes/${otherToken}/receipts/${receipt.body.id}/pdf`).expect(404);
      await admin.delete(`/api/quotes/${quote.id}/share`).set(...header).expect(204);
      await accept(token, 3).expect(404);
      await request(app).get(`/api/public/quotes/${token}/receipts/${receipt.body.id}/pdf`).expect(404);
    });

    await t.test('un borrador con enlace antiguo no permite aceptar; los tokens inventados tampoco', async () => {
      const draft = await newQuote(), draftToken = await share(draft);
      await db.quote.update({ where: { id: draft.id }, data: { status: 'BORRADOR' } });
      await accept(draftToken).expect(409);
      await accept('f'.repeat(64)).expect(404);
      await accept('invalid').expect(404);
      assert.equal(await db.quoteAcceptance.count({ where: { quoteId: draft.id } }), 0);
    });

    await t.test('aceptar mientras el taller modifica la propuesta nunca atribuye aprobación a la versión nueva', async () => {
      const race = await newQuote(), raceToken = await share(race);
      const [approval, edit] = await Promise.all([
        accept(raceToken),
        admin.put(`/api/quotes/${race.id}`).set(...header).send({ ...body, observations: 'Versión cambiada' }),
      ]);
      assert.ok([200, 404, 409].includes(approval.status));
      assert.ok([200, 409].includes(edit.status));
      const final = await db.quote.findUnique({ where: { id: race.id }, include: { acceptances: true } });
      assert.equal(final.acceptances.length, approval.status === 200 ? 1 : 0);
      if (final.revision === 2) { assert.equal(final.status, 'BORRADOR'); assert.equal(final.publicToken, null); }
      for (const a of final.acceptances) { assert.equal(a.revision, 1); assert.equal(a.quoteSnapshot.observations, ''); }
    });

    await t.test('limita intentos públicos y anuncia el tiempo para reintentar', async () => {
      const limited = createApp(db);
      for (let i = 0; i < 30; i++) await request(limited).post('/api/public/quotes/invalid/accept').set(...header).send({}).expect(404);
      await request(limited).post('/api/public/quotes/invalid/accept').set(...header).send({}).expect(429).expect('Retry-After', '60');
    });
  } finally {
    if (customer) await db.quote.deleteMany({ where: { customerId: customer.id } });
    if (vehicle) await db.vehicle.delete({ where: { id: vehicle.id } });
    if (customer) await db.customer.delete({ where: { id: customer.id } });
    if (user) await db.user.delete({ where: { id: user.id } });
    await db.$disconnect();
  }
});
