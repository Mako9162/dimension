import express from 'express';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';
import { db } from './db.js';
import { ensureInitialUser } from './auth.js';

await ensureInitialUser(db, (process.env.INITIAL_ADMIN_USERNAME || 'admin').trim().toLowerCase(), process.env.INITIAL_ADMIN_PASSWORD || process.env.ADMIN_TOKEN);
const app = createApp(db);
const publicDir = fileURLToPath(new URL('../../frontend/dist/', import.meta.url));
app.use(express.static(publicDir));
app.get('/{*path}', (_req, res) => res.sendFile(`${publicDir}/index.html`));
const host = process.env.HOST || '0.0.0.0';
const port = process.env.PORT || 3001;
const server = app.listen(port, host, () => console.log(`Taller API corriendo en http://${host}:${port}`));
async function close() { server.close(); await db.$disconnect(); }
process.on('SIGTERM', close);
process.on('SIGINT', close);
