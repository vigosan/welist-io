CREATE TABLE "item_reactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"emoji" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "item_reactions_item_user_emoji_uidx" UNIQUE("item_id","user_id","emoji")
);
--> statement-breakpoint
ALTER TABLE "item_reactions" ADD CONSTRAINT "item_reactions_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_reactions" ADD CONSTRAINT "item_reactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "item_reactions_item_idx" ON "item_reactions" USING btree ("item_id");