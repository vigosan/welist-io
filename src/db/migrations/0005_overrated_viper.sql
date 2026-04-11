CREATE TABLE "participations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_list_id" uuid NOT NULL,
	"user_list_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "participations" ADD CONSTRAINT "participations_source_list_id_lists_id_fk" FOREIGN KEY ("source_list_id") REFERENCES "public"."lists"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participations" ADD CONSTRAINT "participations_user_list_id_lists_id_fk" FOREIGN KEY ("user_list_id") REFERENCES "public"."lists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participations" ADD CONSTRAINT "participations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "participations_source_idx" ON "participations" USING btree ("source_list_id");--> statement-breakpoint
CREATE INDEX "participations_user_idx" ON "participations" USING btree ("user_id");