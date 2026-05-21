ALTER TYPE "public"."notification_type" ADD VALUE 'new_follower';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'list_purchased';--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "action_url" text;