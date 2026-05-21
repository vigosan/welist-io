CREATE TABLE "list_ratings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"list_id" uuid NOT NULL,
	"value" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "list_ratings_user_list_uidx" UNIQUE("user_id","list_id")
);
--> statement-breakpoint
ALTER TABLE "list_ratings" ADD CONSTRAINT "list_ratings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "list_ratings" ADD CONSTRAINT "list_ratings_list_id_lists_id_fk" FOREIGN KEY ("list_id") REFERENCES "public"."lists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "list_ratings_list_idx" ON "list_ratings" USING btree ("list_id");--> statement-breakpoint
ALTER TABLE "list_ratings" ADD CONSTRAINT "list_ratings_value_range" CHECK ("value" BETWEEN 1 AND 5);