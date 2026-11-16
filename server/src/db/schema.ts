import { pgTable, serial, text, integer, timestamp, varchar, jsonb, index, check, boolean, date } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const ROLES = ['field_officer', 'mandal_officer', 'approving_officer'] as const;
export const STATUSES = [
  'registered', 'awaiting_field_verification', 'awaiting_officer_review',
  'awaiting_final_decision', 'returned', 'approved', 'rejected',
] as const;
export const CATEGORIES = ['water_supply', 'roads', 'electricity', 'sanitation', 'pensions', 'other'] as const;
export const PRIORITIES = ['low', 'medium', 'high'] as const;

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: varchar('username', { length: 50 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name').notNull(),
  nameTe: text('name_te').notNull(),
  role: varchar('role', { length: 30 }).notNull(),
  mandal: text('mandal').notNull().default('Demo Mandal'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => [check('users_role_chk', sql`${t.role} in ('field_officer','mandal_officer','approving_officer')`)]);

export const grievances = pgTable('grievances', {
  id: serial('id').primaryKey(),
  refNo: varchar('ref_no', { length: 30 }).notNull().unique(),
  citizenName: text('citizen_name').notNull(),
  village: text('village').notNull(),
  phone: varchar('phone', { length: 20 }).notNull(),
  category: varchar('category', { length: 30 }).notNull(),
  priority: varchar('priority', { length: 10 }).notNull().default('medium'),
  description: text('description').notNull(),
  descriptionLang: varchar('description_lang', { length: 5 }).notNull().default('te'),
  status: varchar('status', { length: 40 }).notNull().default('registered'),
  submittedOn: date('submitted_on').notNull(),
  dueOn: date('due_on').notNull(),
  createdBy: integer('created_by').references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
  index('grv_status_idx').on(t.status),
  index('grv_priority_idx').on(t.priority),
  index('grv_village_idx').on(t.village),
  check('grv_status_chk', sql`${t.status} in ('registered','awaiting_field_verification','awaiting_officer_review','awaiting_final_decision','returned','approved','rejected')`),
  check('grv_priority_chk', sql`${t.priority} in ('low','medium','high')`),
  check('grv_category_chk', sql`${t.category} in ('water_supply','roads','electricity','sanitation','pensions','other')`),
]);

export const grievanceAssignments = pgTable('grievance_assignments', {
  id: serial('id').primaryKey(),
  grievanceId: integer('grievance_id').notNull().references(() => grievances.id),
  assigneeId: integer('assignee_id').notNull().references(() => users.id),
  assignedBy: integer('assigned_by').references(() => users.id),
  stage: varchar('stage', { length: 30 }).notNull(), // field | review | decision
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => [index('asg_assignee_idx').on(t.assigneeId, t.active), index('asg_grv_idx').on(t.grievanceId)]);

export const fieldVerifications = pgTable('field_verifications', {
  id: serial('id').primaryKey(),
  grievanceId: integer('grievance_id').notNull().references(() => grievances.id),
  officerId: integer('officer_id').notNull().references(() => users.id),
  visitDate: date('visit_date').notNull(),
  observations: text('observations').notNull(),
  findings: text('findings').notNull(),
  evidenceNotes: text('evidence_notes').notNull().default(''),
  checklist: jsonb('checklist').$type<{ item: string; done: boolean }[]>().notNull().default([]),
  outcome: varchar('outcome', { length: 20 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => [index('fv_grv_idx').on(t.grievanceId), check('fv_outcome_chk', sql`${t.outcome} in ('verified','partially_verified','not_verified')`)]);

export const officerReviews = pgTable('officer_reviews', {
  id: serial('id').primaryKey(),
  grievanceId: integer('grievance_id').notNull().references(() => grievances.id),
  officerId: integer('officer_id').notNull().references(() => users.id),
  notes: text('notes').notNull(),
  recommendation: text('recommendation').notNull().default(''),
  action: varchar('action', { length: 20 }).notNull(), // forward | return
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => [index('rev_grv_idx').on(t.grievanceId), check('rev_action_chk', sql`${t.action} in ('forward','return')`)]);

export const grievanceDecisions = pgTable('grievance_decisions', {
  id: serial('id').primaryKey(),
  grievanceId: integer('grievance_id').notNull().references(() => grievances.id),
  officerId: integer('officer_id').notNull().references(() => users.id),
  decision: varchar('decision', { length: 20 }).notNull(), // approve | reject | return
  reason: text('reason').notNull().default(''),
  decidedAt: timestamp('decided_at').notNull().defaultNow(),
}, (t) => [index('dec_grv_idx').on(t.grievanceId), check('dec_chk', sql`${t.decision} in ('approve','reject','return')`)]);

export const grievanceHistory = pgTable('grievance_history', {
  id: serial('id').primaryKey(),
  grievanceId: integer('grievance_id').notNull().references(() => grievances.id),
  action: varchar('action', { length: 50 }).notNull(),
  actorId: integer('actor_id').references(() => users.id),
  actorName: text('actor_name').notNull(),
  actorRole: varchar('actor_role', { length: 30 }).notNull(),
  fromStatus: varchar('from_status', { length: 40 }),
  toStatus: varchar('to_status', { length: 40 }),
  comment: text('comment').notNull().default(''),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => [index('hist_grv_idx').on(t.grievanceId, t.createdAt)]);

export const grievanceAttachments = pgTable('grievance_attachments', {
  id: serial('id').primaryKey(),
  grievanceId: integer('grievance_id').notNull().references(() => grievances.id),
  uploadedBy: integer('uploaded_by').references(() => users.id),
  stage: varchar('stage', { length: 20 }).notNull().default('complaint'), // complaint | field
  fileName: text('file_name').notNull(),
  mimeType: varchar('mime_type', { length: 100 }).notNull(),
  sizeBytes: integer('size_bytes').notNull(),
  dataBase64: text('data_base64').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => [index('att_grv_idx').on(t.grievanceId)]);
