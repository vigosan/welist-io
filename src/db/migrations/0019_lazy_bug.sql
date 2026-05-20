CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text,
	"session_id" text,
	"type" text NOT NULL,
	"list_id" uuid,
	"item_id" uuid,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_list_id_lists_id_fk" FOREIGN KEY ("list_id") REFERENCES "public"."lists"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "events_type_created_idx" ON "events" USING btree ("type","created_at");--> statement-breakpoint
CREATE INDEX "events_list_type_idx" ON "events" USING btree ("list_id","type");--> statement-breakpoint
CREATE INDEX "events_user_created_idx" ON "events" USING btree ("user_id","created_at");