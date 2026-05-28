CREATE TYPE "public"."inventory_transaction_type" AS ENUM('stock_take', 'adjustment', 'withdrawal', 'delivery');--> statement-breakpoint
CREATE TABLE "inventory_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid,
	"name" varchar(200) NOT NULL,
	"category" varchar(100),
	"unit" varchar(40) DEFAULT 'each' NOT NULL,
	"current_stock" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone,
	"last_stock_take_at" timestamp with time zone,
	"external_ref" varchar(100),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_id" uuid NOT NULL,
	"delta" integer NOT NULL,
	"type" "inventory_transaction_type" NOT NULL,
	"note" text,
	"created_by_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_item_id_inventory_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."inventory_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "inventory_team_idx" ON "inventory_items" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "inventory_expires_idx" ON "inventory_items" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "inventory_external_ref_idx" ON "inventory_items" USING btree ("external_ref");--> statement-breakpoint
CREATE INDEX "inventory_tx_item_idx" ON "inventory_transactions" USING btree ("item_id");--> statement-breakpoint
CREATE INDEX "inventory_tx_created_idx" ON "inventory_transactions" USING btree ("created_at");