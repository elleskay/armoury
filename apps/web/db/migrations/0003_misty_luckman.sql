CREATE TABLE "skipped_checks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"officer_id" uuid NOT NULL,
	"template_id" uuid NOT NULL,
	"skipped_for" varchar(10) NOT NULL,
	"reason" varchar(500) NOT NULL,
	"skipped_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "skipped_checks" ADD CONSTRAINT "skipped_checks_officer_id_users_id_fk" FOREIGN KEY ("officer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skipped_checks" ADD CONSTRAINT "skipped_checks_template_id_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "skipped_officer_idx" ON "skipped_checks" USING btree ("officer_id");--> statement-breakpoint
CREATE INDEX "skipped_template_idx" ON "skipped_checks" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "skipped_for_idx" ON "skipped_checks" USING btree ("skipped_for");