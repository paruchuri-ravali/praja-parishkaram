import { Hono } from 'hono';
import { sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import { getUser } from '../auth.js';

export const dashboardRoutes = new Hono();

dashboardRoutes.get('/', async (c) => {
  const u = getUser(c);
  const r = await db.execute(sql`
    select
      count(*)::int as total,
      count(*) filter (where status not in ('approved','rejected'))::int as pending,
      count(*) filter (where priority='high' and status not in ('approved','rejected'))::int as high_priority,
      count(*) filter (where due_on < current_date and status not in ('approved','rejected'))::int as overdue,
      count(*) filter (where status in ('approved','rejected'))::int as completed
    from grievances`);
  const byStage = await db.execute(sql`select status, count(*)::int as count from grievances group by status`);
  const mine = await db.execute(sql`
    select count(distinct g.id)::int as n from grievances g
    join grievance_assignments a on a.grievance_id=g.id and a.active
    where a.assignee_id=${u.id} and g.status not in ('approved','rejected')`);
  const roleStatus: Record<string, string> = { field_officer: 'awaiting_field_verification', mandal_officer: 'awaiting_officer_review', approving_officer: 'awaiting_final_decision' };
  const myAction = await db.execute(sql`select count(*)::int as n from grievances where status=${roleStatus[u.role]}`);
  const queue = await db.execute(sql`
    select g.id, g.ref_no, g.citizen_name, g.village, g.category, g.priority, g.status, g.submitted_on, g.due_on,
      (g.due_on < current_date) as overdue
    from grievances g
    where g.status = ${roleStatus[u.role]} or (${u.role} = 'mandal_officer' and g.status in ('registered','returned'))
    order by (g.due_on < current_date) desc, case g.priority when 'high' then 0 when 'medium' then 1 else 2 end, g.due_on asc
    limit 10`);
  return c.json({ ...(r.rows[0] as object), assignedToMe: (mine.rows[0] as any).n, awaitingMyAction: (myAction.rows[0] as any).n, byStage: byStage.rows, queue: queue.rows });
});
