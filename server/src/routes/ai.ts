import { Hono } from 'hono';
import { z } from 'zod';
import { ai, AiError, aiMode } from '../ai/service.js';
import { getUser } from '../auth.js';
import { loadCase } from './grievances.js';

export const aiRoutes = new Hono();

async function wrap(c: any, fn: () => Promise<unknown>) {
  try { return c.json(await fn()); }
  catch (e) {
    if (e instanceof AiError) return c.json({ error: 'ai_' + e.code }, e.code === 'timeout' ? 504 : 502);
    console.error(e); return c.json({ error: 'ai_request_failed' }, 502);
  }
}
aiRoutes.get('/status', (c) => c.json({ mode: aiMode() }));

// Stage 1: complaint triage (works before the grievance exists)
aiRoutes.post('/triage', async (c) => {
  const p = z.object({ description: z.string().min(5).max(4000) }).safeParse(await c.req.json().catch(() => ({})));
  if (!p.success) return c.json({ error: 'validation' }, 400);
  return wrap(c, () => ai.triage(p.data));
});
aiRoutes.post('/translate', async (c) => {
  const p = z.object({ text: z.string().min(1).max(4000), target: z.enum(['te', 'en']) }).safeParse(await c.req.json().catch(() => ({})));
  if (!p.success) return c.json({ error: 'validation' }, 400);
  return wrap(c, () => ai.translate(p.data));
});
aiRoutes.post('/checklist', async (c) => {
  const p = z.object({ grievanceId: z.number().int(), lang: z.enum(['te', 'en']).default('te') }).safeParse(await c.req.json().catch(() => ({})));
  if (!p.success) return c.json({ error: 'validation' }, 400);
  const k = await loadCase(p.data.grievanceId); if (!k) return c.json({ error: 'not_found' }, 404);
  return wrap(c, () => ai.checklist({ category: k.g.category, description: k.g.description, lang: p.data.lang }));
});
aiRoutes.post('/field-summary', async (c) => {
  const p = z.object({ observations: z.string().max(4000), findings: z.string().max(4000), evidenceNotes: z.string().max(4000).default(''), outcome: z.string(), visitDate: z.string().optional() }).safeParse(await c.req.json().catch(() => ({})));
  if (!p.success) return c.json({ error: 'validation' }, 400);
  return wrap(c, () => ai.fieldSummary(p.data));
});
aiRoutes.post('/review-assist', async (c) => {
  const u = getUser(c);
  if (u.role === 'field_officer') return c.json({ error: 'role_not_allowed' }, 403);
  const p = z.object({ grievanceId: z.number().int() }).safeParse(await c.req.json().catch(() => ({})));
  if (!p.success) return c.json({ error: 'validation' }, 400);
  const k = await loadCase(p.data.grievanceId); if (!k) return c.json({ error: 'not_found' }, 404);
  const f = k.field[0];
  return wrap(c, () => ai.review({ category: k.g.category, village: k.g.village, priority: k.g.priority, complaint: k.g.description, attachmentCount: k.attachments.length,
    field: f ? { outcome: f.outcome, visitDate: f.visitDate, observations: f.observations, findings: f.findings, evidenceNotes: f.evidenceNotes } : null }));
});
aiRoutes.post('/decision-note', async (c) => {
  const u = getUser(c);
  if (u.role !== 'approving_officer') return c.json({ error: 'role_not_allowed' }, 403);
  const p = z.object({ grievanceId: z.number().int() }).safeParse(await c.req.json().catch(() => ({})));
  if (!p.success) return c.json({ error: 'validation' }, 400);
  const k = await loadCase(p.data.grievanceId); if (!k) return c.json({ error: 'not_found' }, 404);
  const f = k.field[0]; const r = k.reviews[0];
  return wrap(c, () => ai.decisionNote({ refNo: k.g.refNo, category: k.g.category, complaint: k.g.description,
    field: f ? { outcome: f.outcome, findings: f.findings, observations: f.observations } : null,
    review: r ? { notes: r.notes, recommendation: r.recommendation } : null }));
});
