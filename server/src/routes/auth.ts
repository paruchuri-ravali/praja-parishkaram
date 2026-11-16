import { Hono } from 'hono';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { users } from '../db/schema.js';
import { sign, requireAuth, getUser } from '../auth.js';
import type { Role } from '../workflow.js';
import { aiMode } from '../ai/service.js';

export const authRoutes = new Hono();

authRoutes.post('/login', async (c) => {
  const p = z.object({ username: z.string().min(1), password: z.string().min(1) }).safeParse(await c.req.json().catch(() => ({})));
  if (!p.success) return c.json({ error: 'validation' }, 400);
  const [u] = await db.select().from(users).where(eq(users.username, p.data.username));
  if (!u || !(await bcrypt.compare(p.data.password, u.passwordHash))) return c.json({ error: 'invalid_credentials' }, 401);
  const token = sign({ id: u.id, name: u.name, role: u.role as Role });
  return c.json({ token, user: { id: u.id, name: u.name, nameTe: u.nameTe, role: u.role, mandal: u.mandal }, aiMode: aiMode() });
});

authRoutes.get('/me', requireAuth, async (c) => {
  const a = getUser(c);
  const [u] = await db.select().from(users).where(eq(users.id, a.id));
  return c.json({ user: { id: u.id, name: u.name, nameTe: u.nameTe, role: u.role, mandal: u.mandal }, aiMode: aiMode() });
});

authRoutes.get('/officers', requireAuth, async (c) => {
  const rows = await db.select({ id: users.id, name: users.name, nameTe: users.nameTe, role: users.role }).from(users);
  return c.json(rows);
});
