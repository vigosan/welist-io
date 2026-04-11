import { boolean, index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "./auth.schema";

export const lists = pgTable("lists", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").unique(),
  description: text("description"),
  public: boolean("public").notNull().default(false),
  ownerId: text("owner_id").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index("lists_public_idx").on(t.public),
]);

export const items = pgTable(
  "items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    listId: uuid("list_id").notNull().references(() => lists.id, { onDelete: "cascade" }),
    text: text("text").notNull(),
    done: boolean("done").notNull().default(false),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("items_list_position_idx").on(t.listId, t.position)],
);

export const participations = pgTable(
  "participations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sourceListId: uuid("source_list_id").notNull().references(() => lists.id),
    userListId: uuid("user_list_id").notNull().references(() => lists.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => users.id),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("participations_source_idx").on(t.sourceListId),
    index("participations_user_idx").on(t.userId),
  ],
);

export type List = typeof lists.$inferSelect;
export type Item = typeof items.$inferSelect;
export type Participation = typeof participations.$inferSelect;
