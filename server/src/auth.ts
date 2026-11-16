import jwt from 'jsonwebtoken';
import type { Context, Next } from 'hono';
import { eq } from 'drizzle-orm';
import { db } from './db/client.js';
import { users } from './db/schema.js';
import type { Role } from './workflow.js';

const SECRET = process.env.JWT_SECRET || 'dev-only-secret';
if (!process.env.JWT_SECRET) console.warn('[warn] JWT_SECRET not set; using insecure dev default');

export type AuthUser = { id: number; name: string; role: Role };

export const sign = (u: AuthUser) => jwt.sign(u, SECRET, { expiresIn: '12h' });

export async function requireAuth(c: Context, next: Next) {
  const h = c.req.header('Authorization') || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : '';
  try {
    const p = jwt.verify(token, SECRET) as AuthUser;
    const [u] = await db.select().from(users).where(eq(users.id, p.id));
    if (!u) return c.json({ error: 'unauthorized' }, 401);
    c.set('user', { id: u.id, name: u.name, role: u.role as Role } satisfies AuthUser);
  } catch {
    return c.json({ error: 'unauthorized' }, 401);
  }
  await next();
}

export const getUser = (c: Context) => c.get('user') as AuthUser;
