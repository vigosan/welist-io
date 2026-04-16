import { boolean, index, integer, jsonb, pgEnum, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { users } from "./auth.schema";

export const lists = pgTable("lists", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").unique(),
  description: text("description"),
  public: boolean("public").notNull().default(false),
  collaborative: boolean("collaborative").notNull().default(false),
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

export const participationRoleEnum = pgEnum("participation_role", ["challenger", "collaborator"]);

export const participations = pgTable(
  "participations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sourceListId: uuid("source_list_id").references(() => lists.id, { onDelete: "set null" }),
    userListId: uuid("user_list_id").references(() => lists.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => users.id),
    role: participationRoleEnum("role").notNull().default("challenger"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("participations_source_idx").on(t.sourceListId),
    index("participations_user_idx").on(t.userId),
    unique("participations_source_user_uidx").on(t.sourceListId, t.userId),
  ],
);

export const itemProgress = pgTable(
  "item_progress",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    itemId: uuid("item_id").notNull().references(() => items.id, { onDelete: "cascade" }),
    done: boolean("done").notNull().default(false),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    unique("item_progress_user_item_uidx").on(t.userId, t.itemId),
    index("item_progress_item_idx").on(t.itemId),
  ],
);

export const listActivityActionEnum = pgEnum("list_activity_action", [
  "item_added",
  "item_edited",
  "item_deleted",
  "challenge_accepted",
  "challenge_completed",
]);

export const listActivity = pgTable(
  "list_activity",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    listId: uuid("list_id").notNull().references(() => lists.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    action: listActivityActionEnum("action").notNull(),
    itemId: uuid("item_id"),
    previousValue: jsonb("previous_value"),
    newValue: jsonb("new_value"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("list_activity_list_idx").on(t.listId),
  ],
);

export const stripeAccounts = pgTable("stripe_accounts", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  stripeAccountId: text("stripe_account_id").notNull().unique(),
  onboardingComplete: boolean("onboarding_complete").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const listPrices = pgTable("list_prices", {
  id: uuid("id").defaultRandom().primaryKey(),
  listId: uuid("list_id").notNull().unique().references(() => lists.id, { onDelete: "cascade" }),
  priceInCents: integer("price_in_cents").notNull(),
  currency: text("currency").notNull().default("usd"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const listPurchases = pgTable(
  "list_purchases",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    buyerId: text("buyer_id").notNull().references(() => users.id),
    listId: uuid("list_id").notNull().references(() => lists.id, { onDelete: "cascade" }),
    stripePaymentIntentId: text("stripe_payment_intent_id").notNull().unique(),
    paidAt: timestamp("paid_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    unique("list_purchases_buyer_list_uidx").on(t.buyerId, t.listId),
    index("list_purchases_list_idx").on(t.listId),
  ],
);

export type List = typeof lists.$inferSelect;
export type Item = typeof items.$inferSelect;
export type Participation = typeof participations.$inferSelect;
export type ItemProgress = typeof itemProgress.$inferSelect;
export type ListActivity = typeof listActivity.$inferSelect;
export type StripeAccount = typeof stripeAccounts.$inferSelect;
export type ListPrice = typeof listPrices.$inferSelect;
export type ListPurchase = typeof listPurchases.$inferSelect;
