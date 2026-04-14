CREATE TYPE "public"."list_activity_action" AS ENUM('item_added', 'item_edited', 'item_deleted', 'challenge_accepted', 'challenge_completed');--> statement-breakpoint
CREATE TABLE "item_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"item_id" uuid NOT NULL,
	"done" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "item_progress_user_item_uidx" UNIQUE("user_id","item_id")
);
--> statement-breakpoint
CREATE TABLE "list_activity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"list_id" uuid NOT NULL,
	"user_id" text,
	"action" "list_activity_action" NOT NULL,
	"item_id" uuid,
	"previous_value" jsonb,
	"new_value" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "participations" ALTER COLUMN "user_list_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "item_progress" ADD CONSTRAINT "item_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_progress" ADD CONSTRAINT "item_progress_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "list_activity" ADD CONSTRAINT "list_activity_list_id_lists_id_fk" FOREIGN KEY ("list_id") REFERENCES "public"."lists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "list_activity" ADD CONSTRAINT "list_activity_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "item_progress_item_idx" ON "item_progress" USING btree ("item_id");--> statement-breakpoint
CREATE INDEX "list_activity_list_idx" ON "list_activity" USING btree ("list_id");--> statement-breakpoint
ALTER TABLE "lists" DROP COLUMN "cover_url";--> statement-breakpoint
ALTER TABLE "participations" ADD CONSTRAINT "participations_source_user_uidx" UNIQUE("source_list_id","user_id");