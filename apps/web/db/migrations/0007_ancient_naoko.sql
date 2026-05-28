ALTER TYPE "public"."user_role" ADD VALUE 'logs_ic';--> statement-breakpoint
ALTER TYPE "public"."user_role" ADD VALUE 'team_admin';--> statement-breakpoint
ALTER TYPE "public"."user_role" ADD VALUE 'hq';--> statement-breakpoint
CREATE TABLE "invite_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(32) NOT NULL,
	"team_id" uuid,
	"role" "user_role" DEFAULT 'officer' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"redeemed_at" timestamp with time zone,
	"redeemed_by_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invite_codes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "telegram_chat_id" varchar(100);--> statement-breakpoint
ALTER TABLE "invite_codes" ADD CONSTRAINT "invite_codes_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invite_codes" ADD CONSTRAINT "invite_codes_redeemed_by_id_users_id_fk" FOREIGN KEY ("redeemed_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "invite_codes_code_idx" ON "invite_codes" USING btree ("code");--> statement-breakpoint
CREATE INDEX "invite_codes_team_idx" ON "invite_codes" USING btree ("team_id");