// Baseline only when the existing database exactly matches the checked-in schema.
// No reset, destructive synchronization, or production demo-data seeding.
import { spawnSync } from 'node:child_process';
import { readdir } from 'node:fs/promises';
import { PrismaClient } from '@prisma/client';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const require = createRequire(import.meta.url);
const cli = join(dirname(require.resolve('prisma/package.json')), 'build/index.js');
const backendDir = dirname(dirname(fileURLToPath(import.meta.url)));
const db = new PrismaClient();
function prisma(args, allowed = [0]) {
  const result = spawnSync(process.execPath, [cli, ...args], { stdio: 'inherit', env: process.env, cwd: backendDir });
  if (!allowed.includes(result.status)) throw new Error(`Prisma ${args[0]} falló; no se modificará el esquema automáticamente.`);
  return result.status;
}
try {
  const tables = await db.$queryRaw`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`;
  const hasSchema = tables.some(t => t.table_name === 'User');
  let applied = [];
  if (tables.some(t => t.table_name === '_prisma_migrations')) applied = await db.$queryRaw`SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL`;
  if (hasSchema && !applied.length) {
    const difference = prisma(['migrate', 'diff', '--from-schema-datasource', 'prisma/schema.prisma', '--to-schema-datamodel', 'prisma/schema.prisma', '--exit-code'], [0, 2]);
    if (difference !== 0) throw new Error('La base existente difiere del esquema. Requiere revisión de migración; no se realizará db push ni pérdida de datos.');
    const migrations = (await readdir(join(backendDir, 'prisma/migrations'), { withFileTypes: true })).filter(d => d.isDirectory()).map(d => d.name).sort();
    for (const migration of migrations) prisma(['migrate', 'resolve', '--applied', migration]);
  }
  prisma(['migrate', 'deploy']);
} finally { await db.$disconnect(); }
