CREATE TABLE "field_verifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"grievance_id" integer NOT NULL,
	"officer_id" integer NOT NULL,
	"visit_date" date NOT NULL,
	"observations" text NOT NULL,
	"findings" text NOT NULL,
	"evidence_notes" text DEFAULT '' NOT NULL,
	"checklist" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"outcome" varchar(20) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "fv_outcome_chk" CHECK ("field_verifications"."outcome" in ('verified','partially_verified','not_verified'))
);
--> statement-breakpoint
CREATE TABLE "grievance_assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"grievance_id" integer NOT NULL,
	"assignee_id" integer NOT NULL,
	"assigned_by" integer,
	"stage" varchar(30) NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "grievance_attachments" (
	"id" serial PRIMARY KEY NOT NULL,
	"grievance_id" integer NOT NULL,
	"uploaded_by" integer,
	"stage" varchar(20) DEFAULT 'complaint' NOT NULL,
	"file_name" text NOT NULL,
	"mime_type" varchar(100) NOT NULL,
	"size_bytes" integer NOT NULL,
	"data_base64" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "grievance_decisions" (
	"id" serial PRIMARY KEY NOT NULL,
	"grievance_id" integer NOT NULL,
	"officer_id" integer NOT NULL,
	"decision" varchar(20) NOT NULL,
	"reason" text DEFAULT '' NOT NULL,
	"decided_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "dec_chk" CHECK ("grievance_decisions"."decision" in ('approve','reject','return'))
);
--> statement-breakpoint
CREATE TABLE "grievance_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"grievance_id" integer NOT NULL,
	"action" varchar(50) NOT NULL,
	"actor_id" integer,
	"actor_name" text NOT NULL,
	"actor_role" varchar(30) NOT NULL,
	"from_status" varchar(40),
	"to_status" varchar(40),
	"comment" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "grievances" (
	"id" serial PRIMARY KEY NOT NULL,
	"ref_no" varchar(30) NOT NULL,
	"citizen_name" text NOT NULL,
	"village" text NOT NULL,
	"phone" varchar(20) NOT NULL,
	"category" varchar(30) NOT NULL,
	"priority" varchar(10) DEFAULT 'medium' NOT NULL,
	"description" text NOT NULL,
	"description_lang" varchar(5) DEFAULT 'te' NOT NULL,
	"status" varchar(40) DEFAULT 'registered' NOT NULL,
	"submitted_on" date NOT NULL,
	"due_on" date NOT NULL,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "grievances_ref_no_unique" UNIQUE("ref_no"),
	CONSTRAINT "grv_status_chk" CHECK ("grievances"."status" in ('registered','awaiting_field_verification','awaiting_officer_review','awaiting_final_decision','returned','approved','rejected')),
	CONSTRAINT "grv_priority_chk" CHECK ("grievances"."priority" in ('low','medium','high')),
	CONSTRAINT "grv_category_chk" CHECK ("grievances"."category" in ('water_supply','roads','electricity','sanitation','pensions','other'))
);
--> statement-breakpoint
CREATE TABLE "officer_reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"grievance_id" integer NOT NULL,
	"officer_id" integer NOT NULL,
	"notes" text NOT NULL,
	"recommendation" text DEFAULT '' NOT NULL,
	"action" varchar(20) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "rev_action_chk" CHECK ("officer_reviews"."action" in ('forward','return'))
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" varchar(50) NOT NULL,
	"password_hash" text NOT NULL,
	"name" text NOT NULL,
	"name_te" text NOT NULL,
	"role" varchar(30) NOT NULL,
	"mandal" text DEFAULT 'Demo Mandal' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_role_chk" CHECK ("users"."role" in ('field_officer','mandal_officer','approving_officer'))
);
--> statement-breakpoint
ALTER TABLE "field_verifications" ADD CONSTRAINT "field_verifications_grievance_id_grievances_id_fk" FOREIGN KEY ("grievance_id") REFERENCES "public"."grievances"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "field_verifications" ADD CONSTRAINT "field_verifications_officer_id_users_id_fk" FOREIGN KEY ("officer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grievance_assignments" ADD CONSTRAINT "grievance_assignments_grievance_id_grievances_id_fk" FOREIGN KEY ("grievance_id") REFERENCES "public"."grievances"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grievance_assignments" ADD CONSTRAINT "grievance_assignments_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grievance_assignments" ADD CONSTRAINT "grievance_assignments_assigned_by_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grievance_attachments" ADD CONSTRAINT "grievance_attachments_grievance_id_grievances_id_fk" FOREIGN KEY ("grievance_id") REFERENCES "public"."grievances"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grievance_attachments" ADD CONSTRAINT "grievance_attachments_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grievance_decisions" ADD CONSTRAINT "grievance_decisions_grievance_id_grievances_id_fk" FOREIGN KEY ("grievance_id") REFERENCES "public"."grievances"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grievance_decisions" ADD CONSTRAINT "grievance_decisions_officer_id_users_id_fk" FOREIGN KEY ("officer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grievance_history" ADD CONSTRAINT "grievance_history_grievance_id_grievances_id_fk" FOREIGN KEY ("grievance_id") REFERENCES "public"."grievances"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grievance_history" ADD CONSTRAINT "grievance_history_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grievances" ADD CONSTRAINT "grievances_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "officer_reviews" ADD CONSTRAINT "officer_reviews_grievance_id_grievances_id_fk" FOREIGN KEY ("grievance_id") REFERENCES "public"."grievances"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "officer_reviews" ADD CONSTRAINT "officer_reviews_officer_id_users_id_fk" FOREIGN KEY ("officer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "fv_grv_idx" ON "field_verifications" USING btree ("grievance_id");--> statement-breakpoint
CREATE INDEX "asg_assignee_idx" ON "grievance_assignments" USING btree ("assignee_id","active");--> statement-breakpoint
CREATE INDEX "asg_grv_idx" ON "grievance_assignments" USING btree ("grievance_id");--> statement-breakpoint
CREATE INDEX "att_grv_idx" ON "grievance_attachments" USING btree ("grievance_id");--> statement-breakpoint
CREATE INDEX "dec_grv_idx" ON "grievance_decisions" USING btree ("grievance_id");--> statement-breakpoint
CREATE INDEX "hist_grv_idx" ON "grievance_history" USING btree ("grievance_id","created_at");--> statement-breakpoint
CREATE INDEX "grv_status_idx" ON "grievances" USING btree ("status");--> statement-breakpoint
CREATE INDEX "grv_priority_idx" ON "grievances" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "grv_village_idx" ON "grievances" USING btree ("village");--> statement-breakpoint
CREATE INDEX "rev_grv_idx" ON "officer_reviews" USING btree ("grievance_id");