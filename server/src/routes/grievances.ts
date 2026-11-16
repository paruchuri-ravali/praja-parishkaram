import { Hono } from 'hono';
import { z } from 'zod';
import { and, asc, desc, eq, ilike, or, sql, inArray } from 'drizzle-orm';
import { db } from '../db/client.js';
import * as s from '../db/schema.js';
import { getUser } from '../auth.js';
import { canTransition, SLA_DAYS, type Action, type Role } from '../workflow.js';

export const grievanceRoutes = new Hono();

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const attachmentS = z.object({
  fileName: z.string().min(1).max(200), mimeType: z.string().refine((m) => ALLOWED_MIME.includes(m), 'unsupported_file_type'),
  dataBase64: z.string().max(3_000_000),
});
type Att = z.infer<typeof attachmentS>;

const today = () => new Date().toISOString().slice(0, 10);
const addDays = (d: string, n: number) => { const x = new Date(d + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };

export async function loadCase(id: number) {
  const [g] = await db.select().from(s.grievances).where(eq(s.grievances.id, id));
  if (!g) return null;
  const [field, reviews, decisions, history, attachments, assignments] = await Promise.all([
    db.select({ v: s.fieldVerifications, officer: s.users.name }).from(s.fieldVerifications).innerJoin(s.users, eq(s.users.id, s.fieldVerifications.officerId)).where(eq(s.fieldVerifications.grievanceId, id)).orderBy(desc(s.fieldVerifications.createdAt), desc(s.fieldVerifications.id)),
    db.select({ r: s.officerReviews, officer: s.users.name }).from(s.officerReviews).innerJoin(s.users, eq(s.users.id, s.officerReviews.officerId)).where(eq(s.officerReviews.grievanceId, id)).orderBy(desc(s.officerReviews.createdAt), desc(s.officerReviews.id)),
    db.select({ d: s.grievanceDecisions, officer: s.users.name }).from(s.grievanceDecisions).innerJoin(s.users, eq(s.users.id, s.grievanceDecisions.officerId)).where(eq(s.grievanceDecisions.grievanceId, id)).orderBy(desc(s.grievanceDecisions.decidedAt), desc(s.grievanceDecisions.id)),
    db.select().from(s.grievanceHistory).where(eq(s.grievanceHistory.grievanceId, id)).orderBy(asc(s.grievanceHistory.createdAt), asc(s.grievanceHistory.id)),
    db.select({ id: s.grievanceAttachments.id, stage: s.grievanceAttachments.stage, fileName: s.grievanceAttachments.fileName, mimeType: s.grievanceAttachments.mimeType, sizeBytes: s.grievanceAttachments.sizeBytes, createdAt: s.grievanceAttachments.createdAt }).from(s.grievanceAttachments).where(eq(s.grievanceAttachments.grievanceId, id)),
    db.select({ a: s.grievanceAssignments, name: s.users.name }).from(s.grievanceAssignments).innerJoin(s.users, eq(s.users.id, s.grievanceAssignments.assigneeId)).where(eq(s.grievanceAssignments.grievanceId, id)).orderBy(desc(s.grievanceAssignments.id)),
  ]);
  return {
    g, attachments, history,
    field: field.map((x) => ({ ...x.v, officerName: x.officer })),
    reviews: reviews.map((x) => ({ ...x.r, officerName: x.officer })),
    decisions: decisions.map((x) => ({ ...x.d, officerName: x.officer })),
    assignments: assignments.map((x) => ({ ...x.a, assigneeName: x.name })),
  };
}

async function isAssignedTo(grievanceId: number, userId: number) {
  const r = await db.select({ id: s.grievanceAssignments.id }).from(s.grievanceAssignments).where(and(eq(s.grievanceAssignments.grievanceId, grievanceId), eq(s.grievanceAssignments.assigneeId, userId)));
  return r.length > 0;
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
async function logHistory(tx: Tx, p: { id: number; action: string; user: { id: number; name: string; role: Role }; from?: string | null; to?: string | null; comment?: string }) {
  await tx.insert(s.grievanceHistory).values({ grievanceId: p.id, action: p.action, actorId: p.user.id, actorName: p.user.name, actorRole: p.user.role, fromStatus: p.from ?? null, toStatus: p.to ?? null, comment: p.comment ?? '' });
}
async function setStatus(tx: Tx, id: number, to: string) {
  await tx.update(s.grievances).set({ status: to, updatedAt: new Date() }).where(eq(s.grievances.id, id));
}
const bad = (c: any, e: z.ZodError) => c.json({ error: 'validation', fields: e.issues.map((i) => ({ path: i.path.join('.'), message: i.message })) }, 400);
const guard = (c: any, action: Action, role: Role, status: string) => {
  const r = canTransition(action, role, status);
  return r.ok ? null : c.json({ error: r.msg }, r.code);
};

// ---------- list ----------
grievanceRoutes.get('/', async (c) => {
  const u = getUser(c);
  const q = c.req.query();
  const conds = [];
  if (q.q) { const t = `%${q.q.replace(/[%_]/g, '')}%`; conds.push(or(ilike(s.grievances.refNo, t), ilike(s.grievances.citizenName, t), ilike(s.grievances.village, t))); }
  if (q.status) conds.push(eq(s.grievances.status, q.status));
  if (q.category) conds.push(eq(s.grievances.category, q.category));
  if (q.priority) conds.push(eq(s.grievances.priority, q.priority));
  if (q.village) conds.push(ilike(s.grievances.village, `%${q.village}%`));
  if (q.overdue === '1') conds.push(sql`${s.grievances.dueOn} < current_date and ${s.grievances.status} not in ('approved','rejected')`);
  const restrictToMine = u.role === 'field_officer' || q.mine === '1';
  if (restrictToMine) conds.push(sql`exists (select 1 from grievance_assignments a where a.grievance_id = ${s.grievances.id} and a.assignee_id = ${u.id} ${u.role === 'field_officer' ? sql`` : sql`and a.active`})`);
  const sortCols: Record<string, any> = { ref: s.grievances.refNo, citizen: s.grievances.citizenName, village: s.grievances.village, category: s.grievances.category, status: s.grievances.status, date: s.grievances.submittedOn, due: s.grievances.dueOn,
    priority: sql`case ${s.grievances.priority} when 'high' then 0 when 'medium' then 1 else 2 end` };
  const col = sortCols[q.sort || 'date'] ?? s.grievances.submittedOn;
  const order = q.dir === 'asc' ? asc(col) : desc(col);
  const rows = await db.select({
    id: s.grievances.id, refNo: s.grievances.refNo, citizenName: s.grievances.citizenName, village: s.grievances.village, category: s.grievances.category,
    priority: s.grievances.priority, status: s.grievances.status, submittedOn: s.grievances.submittedOn, dueOn: s.grievances.dueOn,
    overdue: sql<boolean>`(${s.grievances.dueOn} < current_date and ${s.grievances.status} not in ('approved','rejected'))`,
  }).from(s.grievances).where(conds.length ? and(...conds) : undefined).orderBy(order, desc(s.grievances.id)).limit(200);
  return c.json(rows);
});

// ---------- create ----------
const createS = z.object({
  citizenName: z.string().trim().min(2).max(120), village: z.string().trim().min(2).max(120),
  phone: z.string().trim().regex(/^[0-9]{10}$/, 'phone_10_digits'),
  category: z.enum(s.CATEGORIES), priority: z.enum(s.PRIORITIES),
  description: z.string().trim().min(10).max(4000), descriptionLang: z.enum(['te', 'en']).default('te'),
  submittedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  attachments: z.array(attachmentS).max(5).default([]),
});
grievanceRoutes.post('/', async (c) => {
  const u = getUser(c);
  if (u.role !== 'mandal_officer') return c.json({ error: 'role_not_allowed' }, 403);
  const p = createS.safeParse(await c.req.json().catch(() => ({})));
  if (!p.success) return bad(c, p.error);
  const d = p.data; const submitted = d.submittedOn ?? today();
  const out = await db.transaction(async (tx) => {
    const [g] = await tx.insert(s.grievances).values({ refNo: 'TMP-' + Math.random().toString(36).slice(2, 10), citizenName: d.citizenName, village: d.village, phone: d.phone, category: d.category, priority: d.priority, description: d.description, descriptionLang: d.descriptionLang, status: 'registered', submittedOn: submitted, dueOn: addDays(submitted, SLA_DAYS[d.priority]), createdBy: u.id }).returning();
    const refNo = `PP-${submitted.slice(0, 4)}-${String(g.id).padStart(5, '0')}`;
    await tx.update(s.grievances).set({ refNo }).where(eq(s.grievances.id, g.id));
    for (const a of d.attachments) await tx.insert(s.grievanceAttachments).values({ grievanceId: g.id, uploadedBy: u.id, stage: 'complaint', fileName: a.fileName, mimeType: a.mimeType, sizeBytes: Math.floor(a.dataBase64.length * 0.75), dataBase64: a.dataBase64 });
    await logHistory(tx, { id: g.id, action: 'registered', user: u, to: 'registered', comment: `Registered ${refNo}` });
    return { id: g.id, refNo };
  });
  return c.json(out, 201);
});

// ---------- detail ----------
grievanceRoutes.get('/:id{[0-9]+}', async (c) => {
  const u = getUser(c); const id = Number(c.req.param('id'));
  const k = await loadCase(id); if (!k) return c.json({ error: 'not_found' }, 404);
  if (u.role === 'field_officer' && !(await isAssignedTo(id, u.id))) return c.json({ error: 'forbidden' }, 403);
  const activeAssignee = k.assignments.find((a) => a.active);
  return c.json({ ...k.g, overdue: k.g.dueOn < today() && !['approved', 'rejected'].includes(k.g.status), fieldReports: k.field, reviews: k.reviews, decisions: k.decisions, history: k.history, attachments: k.attachments, assignedTo: activeAssignee ? { id: activeAssignee.assigneeId, name: activeAssignee.assigneeName } : null });
});

grievanceRoutes.get('/:id{[0-9]+}/attachments/:aid{[0-9]+}', async (c) => {
  const u = getUser(c); const id = Number(c.req.param('id'));
  if (u.role === 'field_officer' && !(await isAssignedTo(id, u.id))) return c.json({ error: 'forbidden' }, 403);
  const [a] = await db.select().from(s.grievanceAttachments).where(and(eq(s.grievanceAttachments.id, Number(c.req.param('aid'))), eq(s.grievanceAttachments.grievanceId, id)));
  if (!a) return c.json({ error: 'not_found' }, 404);
  return new Response(Buffer.from(a.dataBase64, 'base64'), { headers: { 'Content-Type': a.mimeType, 'Content-Disposition': `inline; filename="${encodeURIComponent(a.fileName)}"`, 'X-Content-Type-Options': 'nosniff' } });
});

// ---------- classification edit (officer confirms/edits AI suggestion) ----------
grievanceRoutes.patch('/:id{[0-9]+}/classification', async (c) => {
  const u = getUser(c); const id = Number(c.req.param('id'));
  if (u.role !== 'mandal_officer') return c.json({ error: 'role_not_allowed' }, 403);
  const p = z.object({ category: z.enum(s.CATEGORIES), priority: z.enum(s.PRIORITIES), source: z.enum(['manual', 'ai_suggestion']).default('manual') }).safeParse(await c.req.json().catch(() => ({})));
  if (!p.success) return bad(c, p.error);
  const [g] = await db.select().from(s.grievances).where(eq(s.grievances.id, id)); if (!g) return c.json({ error: 'not_found' }, 404);
  if (['approved', 'rejected'].includes(g.status)) return c.json({ error: 'invalid_state' }, 409);
  await db.transaction(async (tx) => {
    await tx.update(s.grievances).set({ category: p.data.category, priority: p.data.priority, dueOn: addDays(g.submittedOn, SLA_DAYS[p.data.priority]), updatedAt: new Date() }).where(eq(s.grievances.id, id));
    await logHistory(tx, { id, action: 'classification_updated', user: u, from: g.status, to: g.status, comment: `Category ${g.category}→${p.data.category}; priority ${g.priority}→${p.data.priority} (${p.data.source === 'ai_suggestion' ? 'AI suggestion accepted by officer' : 'manual edit'})` });
  });
  return c.json({ ok: true });
});

// ---------- assign ----------
grievanceRoutes.post('/:id{[0-9]+}/assign', async (c) => {
  const u = getUser(c); const id = Number(c.req.param('id'));
  const p = z.object({ assigneeId: z.number().int(), comment: z.string().max(1000).default('') }).safeParse(await c.req.json().catch(() => ({})));
  if (!p.success) return bad(c, p.error);
  const [g] = await db.select().from(s.grievances).where(eq(s.grievances.id, id)); if (!g) return c.json({ error: 'not_found' }, 404);
  const err = guard(c, 'assign', u.role, g.status); if (err) return err;
  const [a] = await db.select().from(s.users).where(eq(s.users.id, p.data.assigneeId));
  if (!a || a.role !== 'field_officer') return c.json({ error: 'invalid_assignee' }, 400);
  await db.transaction(async (tx) => {
    await tx.update(s.grievanceAssignments).set({ active: false }).where(eq(s.grievanceAssignments.grievanceId, id));
    await tx.insert(s.grievanceAssignments).values({ grievanceId: id, assigneeId: a.id, assignedBy: u.id, stage: 'field' });
    await setStatus(tx, id, 'awaiting_field_verification');
    await logHistory(tx, { id, action: 'assigned', user: u, from: g.status, to: 'awaiting_field_verification', comment: `Assigned to ${a.name}${p.data.comment ? ': ' + p.data.comment : ''}` });
  });
  return c.json({ ok: true });
});

// ---------- field verification ----------
const verifS = z.object({
  visitDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'invalid_date'),
  observations: z.string().trim().min(10).max(4000), findings: z.string().trim().min(10).max(4000),
  evidenceNotes: z.string().max(4000).default(''),
  checklist: z.array(z.object({ item: z.string().max(300), done: z.boolean() })).max(20).default([]),
  outcome: z.enum(['verified', 'partially_verified', 'not_verified']),
  attachments: z.array(attachmentS).max(5).default([]),
});
grievanceRoutes.post('/:id{[0-9]+}/verification', async (c) => {
  const u = getUser(c); const id = Number(c.req.param('id'));
  const p = verifS.safeParse(await c.req.json().catch(() => ({})));
  if (!p.success) return bad(c, p.error);
  const [g] = await db.select().from(s.grievances).where(eq(s.grievances.id, id)); if (!g) return c.json({ error: 'not_found' }, 404);
  const err = guard(c, 'submit_verification', u.role, g.status); if (err) return err;
  if (!(await isAssignedTo(id, u.id)) || !(await db.select().from(s.grievanceAssignments).where(and(eq(s.grievanceAssignments.grievanceId, id), eq(s.grievanceAssignments.assigneeId, u.id), eq(s.grievanceAssignments.active, true)))).length) return c.json({ error: 'not_assigned' }, 403);
  if (p.data.visitDate > today()) return c.json({ error: 'validation', fields: [{ path: 'visitDate', message: 'future_date' }] }, 400);
  const d = p.data;
  await db.transaction(async (tx) => {
    await tx.insert(s.fieldVerifications).values({ grievanceId: id, officerId: u.id, visitDate: d.visitDate, observations: d.observations, findings: d.findings, evidenceNotes: d.evidenceNotes, checklist: d.checklist, outcome: d.outcome });
    for (const a of d.attachments) await tx.insert(s.grievanceAttachments).values({ grievanceId: id, uploadedBy: u.id, stage: 'field', fileName: a.fileName, mimeType: a.mimeType, sizeBytes: Math.floor(a.dataBase64.length * 0.75), dataBase64: a.dataBase64 });
    await tx.update(s.grievanceAssignments).set({ active: false }).where(and(eq(s.grievanceAssignments.grievanceId, id), eq(s.grievanceAssignments.assigneeId, u.id)));
    await setStatus(tx, id, 'awaiting_officer_review');
    await logHistory(tx, { id, action: 'field_verification_submitted', user: u, from: g.status, to: 'awaiting_officer_review', comment: `Outcome: ${d.outcome}` });
  });
  return c.json({ ok: true });
});

// ---------- mandal review ----------
grievanceRoutes.post('/:id{[0-9]+}/review', async (c) => {
  const u = getUser(c); const id = Number(c.req.param('id'));
  const p = z.object({ action: z.enum(['forward', 'return']), notes: z.string().trim().min(5).max(4000), recommendation: z.string().max(4000).default('') }).safeParse(await c.req.json().catch(() => ({})));
  if (!p.success) return bad(c, p.error);
  const [g] = await db.select().from(s.grievances).where(eq(s.grievances.id, id)); if (!g) return c.json({ error: 'not_found' }, 404);
  const act: Action = p.data.action === 'forward' ? 'forward' : 'return_to_field';
  const err = guard(c, act, u.role, g.status); if (err) return err;
  if (p.data.action === 'forward' && p.data.recommendation.trim().length < 5) return c.json({ error: 'validation', fields: [{ path: 'recommendation', message: 'required' }] }, 400);
  const to = act === 'forward' ? 'awaiting_final_decision' : 'returned';
  await db.transaction(async (tx) => {
    await tx.insert(s.officerReviews).values({ grievanceId: id, officerId: u.id, notes: p.data.notes, recommendation: p.data.recommendation, action: p.data.action });
    await setStatus(tx, id, to);
    await logHistory(tx, { id, action: act === 'forward' ? 'forwarded_for_decision' : 'returned_for_more_verification', user: u, from: g.status, to, comment: p.data.notes });
  });
  return c.json({ ok: true });
});

// ---------- final decision ----------
grievanceRoutes.post('/:id{[0-9]+}/decision', async (c) => {
  const u = getUser(c); const id = Number(c.req.param('id'));
  const p = z.object({ decision: z.enum(['approve', 'reject', 'return']), reason: z.string().trim().max(4000).default(''), confirm: z.literal(true) }).safeParse(await c.req.json().catch(() => ({})));
  if (!p.success) return bad(c, p.error);
  const [g] = await db.select().from(s.grievances).where(eq(s.grievances.id, id)); if (!g) return c.json({ error: 'not_found' }, 404);
  const act: Action = p.data.decision === 'approve' ? 'approve' : p.data.decision === 'reject' ? 'reject' : 'return_decision';
  const err = guard(c, act, u.role, g.status); if (err) return err;
  if (p.data.decision !== 'approve' && p.data.reason.length < 5) return c.json({ error: 'validation', fields: [{ path: 'reason', message: 'reason_required' }] }, 400);
  const to = act === 'approve' ? 'approved' : act === 'reject' ? 'rejected' : 'returned';
  await db.transaction(async (tx) => {
    await tx.insert(s.grievanceDecisions).values({ grievanceId: id, officerId: u.id, decision: p.data.decision, reason: p.data.reason });
    await setStatus(tx, id, to);
    await logHistory(tx, { id, action: `decision_${p.data.decision}`, user: u, from: g.status, to, comment: p.data.reason });
  });
  return c.json({ ok: true, status: to });
});
