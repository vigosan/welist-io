CREATE INDEX "list_activity_user_created_idx" ON "list_activity" USING btree ("user_id","created_at");
