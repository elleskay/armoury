CREATE TYPE "public"."agency" AS ENUM('FRS', 'ICA', 'SPS', 'hospital');--> statement-breakpoint
CREATE TYPE "public"."frequency" AS ENUM('daily', 'twice_daily', 'weekly', 'open');--> statement-breakpoint
CREATE TYPE "public"."issue_severity" AS ENUM('low', 'medium', 'high', 'critical');--> statement-breakpoint
CREATE TYPE "public"."issue_status" AS ENUM('open', 'in_progress', 'resolved');--> statement-breakpoint
CREATE TYPE "public"."item_kind" AS ENUM('boolean', 'text', 'number', 'dropdown', 'date_time');--> statement-breakpoint
CREATE TYPE "public"."shift_window" AS ENUM('am', 'pm', 'night', 'any');--> statement-breakpoint
CREATE TYPE "public"."template_status" AS ENUM('draft', 'published');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'officer');--> statement-breakpoint
CREATE TABLE "issues" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"submission_id" uuid,
	"template_item_id" uuid,
	"team_id" uuid,
	"raised_by_id" uuid,
	"title" varchar(200) NOT NULL,
	"note" text NOT NULL,
	"severity" "issue_severity" DEFAULT 'medium' NOT NULL,
	"status" "issue_status" DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	"resolved_by_id" uuid,
	"resolution" text
);
--> statement-breakpoint
CREATE TABLE "responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"submission_id" uuid NOT NULL,
	"template_item_id" uuid NOT NULL,
	"value_boolean" boolean,
	"value_text" text,
	"value_number" integer,
	"value_date" timestamp with time zone,
	"has_issue" boolean DEFAULT false NOT NULL,
	"issue_note" text
);
--> statement-breakpoint
CREATE TABLE "submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" uuid NOT NULL,
	"officer_id" uuid NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"score" integer DEFAULT 100 NOT NULL,
	"item_count" integer DEFAULT 0 NOT NULL,
	"ok_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(120) NOT NULL,
	"agency" "agency" NOT NULL,
	"webhook_url" varchar(500),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "template_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"label" varchar(300) NOT NULL,
	"kind" "item_kind" DEFAULT 'boolean' NOT NULL,
	"required" boolean DEFAULT true NOT NULL,
	"options" jsonb
);
--> statement-breakpoint
CREATE TABLE "templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(200) NOT NULL,
	"description" text,
	"team_id" uuid,
	"created_by_id" uuid NOT NULL,
	"status" "template_status" DEFAULT 'published' NOT NULL,
	"frequency" "frequency" DEFAULT 'open' NOT NULL,
	"shift_window" "shift_window" DEFAULT 'any' NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"name" varchar(120) NOT NULL,
	"password_hash" text NOT NULL,
	"role" "user_role" DEFAULT 'officer' NOT NULL,
	"team_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_submission_id_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_template_item_id_template_items_id_fk" FOREIGN KEY ("template_item_id") REFERENCES "public"."template_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_raised_by_id_users_id_fk" FOREIGN KEY ("raised_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_resolved_by_id_users_id_fk" FOREIGN KEY ("resolved_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "responses" ADD CONSTRAINT "responses_submission_id_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "responses" ADD CONSTRAINT "responses_template_item_id_template_items_id_fk" FOREIGN KEY ("template_item_id") REFERENCES "public"."template_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_template_id_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_officer_id_users_id_fk" FOREIGN KEY ("officer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_items" ADD CONSTRAINT "template_items_template_id_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "templates" ADD CONSTRAINT "templates_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "templates" ADD CONSTRAINT "templates_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "issues_status_idx" ON "issues" USING btree ("status");--> statement-breakpoint
CREATE INDEX "issues_severity_idx" ON "issues" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "issues_team_idx" ON "issues" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "issues_submission_idx" ON "issues" USING btree ("submission_id");--> statement-breakpoint
CREATE INDEX "responses_submission_idx" ON "responses" USING btree ("submission_id");--> statement-breakpoint
CREATE INDEX "submissions_template_idx" ON "submissions" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "submissions_officer_idx" ON "submissions" USING btree ("officer_id");--> statement-breakpoint
CREATE INDEX "submissions_submitted_idx" ON "submissions" USING btree ("submitted_at");--> statement-breakpoint
CREATE INDEX "submissions_score_idx" ON "submissions" USING btree ("score");--> statement-breakpoint
CREATE INDEX "items_template_idx" ON "template_items" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "templates_team_idx" ON "templates" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "templates_status_idx" ON "templates" USING btree ("status");--> statement-breakpoint
CREATE INDEX "users_team_idx" ON "users" USING btree ("team_id");