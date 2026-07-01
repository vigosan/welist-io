DROP TABLE "item_likes" CASCADE;--> statement-breakpoint
DROP TABLE "item_comments" CASCADE;--> statement-breakpoint
DELETE FROM "notifications" WHERE "type" IN ('item_liked', 'item_commented');--> statement-breakpoint
ALTER TABLE "public"."notifications" ALTER COLUMN "type" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."notification_type";--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('challenge_accepted', 'challenge_completed', 'new_follower', 'list_purchased', 'added_as_collaborator', 'item_added', 'item_done', 'list_completed', 'weekly_recap', 'list_forked');--> statement-breakpoint
ALTER TABLE "public"."notifications" ALTER COLUMN "type" SET DATA TYPE "public"."notification_type" USING "type"::"public"."notification_type";