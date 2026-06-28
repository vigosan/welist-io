ALTER TYPE "public"."notification_type" ADD VALUE 'list_forked';--> statement-breakpoint
ALTER TABLE "lists" ADD COLUMN "forked_from_id" uuid;--> statement-breakpoint
ALTER TABLE "lists" ADD CONSTRAINT "lists_forked_from_id_lists_id_fk" FOREIGN KEY ("forked_from_id") REFERENCES "public"."lists"("id") ON DELETE set null ON UPDATE no action;
