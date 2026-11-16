import 'dotenv/config';
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema.js';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is required');
export const pool = new pg.Pool({
  connectionString: url,
  ssl: /sslmode=require/.test(url) || process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
});
export const db = drizzle(pool, { schema });
export type DB = typeof db;
