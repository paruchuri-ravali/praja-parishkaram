import 'dotenv/config';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serve } from '@hono/node-server';
import { bodyLimit } from 'hono/body-limit';
import { serveStatic } from '@hono/node-server/serve-static';
import { existsSync, readFileSync } from 'node:fs';
import { requireAuth } from './auth.js';
import { authRoutes } from './routes/auth.js';
import { grievanceRoutes } from './routes/grievances.js';
import { dashboardRoutes } from './routes/dashboard.js';
import { aiRoutes } from './routes/ai.js';

const app = new Hono();
app.use('*', cors({ origin: (process.env.CORS_ORIGIN || 'http://localhost:5173').split(','), allowHeaders: ['Content-Type', 'Authorization'], allowMethods: ['GET', 'POST', 'PATCH', 'OPTIONS'] }));
app.use('/api/*', bodyLimit({ maxSize: 8 * 1024 * 1024, onError: (c) => c.json({ error: 'payload_too_large' }, 413) }));
app.get('/health', (c) => c.json({ ok: true }));
app.route('/api/auth', authRoutes);
app.use('/api/*', async (c, next) => (c.req.path.startsWith('/api/auth/login') ? next() : requireAuth(c, next)));
app.route('/api/dashboard', dashboardRoutes);
app.route('/api/grievances', grievanceRoutes);
app.route('/api/ai', aiRoutes);
// Serve the built SPA when present (single-container deployment)
const WEB_DIR = process.env.WEB_DIR || '../web/dist';
if (existsSync(WEB_DIR)) {
  app.use('/*', serveStatic({ root: WEB_DIR }));
  const index = readFileSync(`${WEB_DIR}/index.html`, 'utf8');
  app.get('*', (c) => (c.req.path.startsWith('/api/') ? c.json({ error: 'not_found' }, 404) : c.html(index)));
}
app.notFound((c) => c.json({ error: 'not_found' }, 404));
app.onError((e, c) => { console.error(e); return c.json({ error: 'server_error' }, 500); });

const port = Number(process.env.PORT || 8787);
serve({ fetch: app.fetch, port }, () => console.log(`API on :${port}`));
