import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { count } from 'drizzle-orm';
import { db, pool } from './client.js';
import { users } from './schema.js';

await migrate(db, { migrationsFolder: './drizzle' });
console.log('Migrations applied');
// Optional: seed demo data on first start only (never overwrites an existing database)
if (process.env.AUTO_SEED === 'true') {
  const [{ n }] = await db.select({ n: count() }).from(users);
  if (n === 0) { await import('./seed.js'); process.exit(0); } // seed.js closes the pool itself
}
await pool.end();
