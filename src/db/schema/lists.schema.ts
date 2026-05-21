import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "./auth.schema";

export const lists = pgTable(
  "lists",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").unique(),
    description: text("description"),
    category: text("category"),
    public: boolean("public").notNull().default(false),
    collaborative: boolean("collaborative").notNull().default(false),
    ownerId: text("owner_id").references(() => users.id),
    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("lists_public_idx").on(t.public)]
);

export const items = pgTable(
  "items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    listId: uuid("list_id")
      .notNull()
      .references(() => lists.id, { onDelete: "cascade" }),
    text: text("text").notNull(),
    done: boolean("done").notNull().default(false),
    position: integer("position").notNull().default(0),
    latitude: text("latitude"),
    longitude: text("longitude"),
    placeName: text("place_name"),
    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("items_list_position_idx").on(t.listId, t.position)]
);

export const participationRoleEnum = pgEnum("participation_role", [
  "challenger",
  "collaborator",
]);

export const participations = pgTable(
  "participations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sourceListId: uuid("source_list_id").references(() => lists.id, {
      onDelete: "set null",
    }),
    userListId: uuid("user_list_id").references(() => lists.id, {
      onDelete: "cascade",
    }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    role: participationRoleEnum("role").notNull().default("challenger"),
    completedAt: timestamp("completed_at", {
      withTimezone: true,
    }),
    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("participations_source_idx").on(t.sourceListId),
    index("participations_user_idx").on(t.userId),
    unique("participations_source_user_uidx").on(t.sourceListId, t.userId),
  ]
);

export const itemProgress = pgTable(
  "item_progress",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    itemId: uuid("item_id")
      .notNull()
      .references(() => items.id, { onDelete: "cascade" }),
    done: boolean("done").notNull().default(false),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    unique("item_progress_user_item_uidx").on(t.userId, t.itemId),
    index("item_progress_item_idx").on(t.itemId),
  ]
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
    listId: uuid("list_id")
      .notNull()
      .references(() => lists.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    action: listActivityActionEnum("action").notNull(),
    itemId: uuid("item_id"),
    previousValue: jsonb("previous_value"),
    newValue: jsonb("new_value"),
    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("list_activity_list_idx").on(t.listId)]
);

export const stripeAccounts = pgTable("stripe_accounts", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  stripeAccountId: text("stripe_account_id").notNull().unique(),
  onboardingComplete: boolean("onboarding_complete").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const listPrices = pgTable("list_prices", {
  id: uuid("id").defaultRandom().primaryKey(),
  listId: uuid("list_id")
    .notNull()
    .unique()
    .references(() => lists.id, { onDelete: "cascade" }),
  priceInCents: integer("price_in_cents").notNull(),
  currency: text("currency").notNull().default("usd"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const listPurchases = pgTable(
  "list_purchases",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    buyerId: text("buyer_id")
      .notNull()
      .references(() => users.id),
    listId: uuid("list_id")
      .notNull()
      .references(() => lists.id, { onDelete: "cascade" }),
    stripePaymentIntentId: text("stripe_payment_intent_id").notNull().unique(),
    paidAt: timestamp("paid_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    unique("list_purchases_buyer_list_uidx").on(t.buyerId, t.listId),
    index("list_purchases_list_idx").on(t.listId),
  ]
);

export const notificationTypeEnum = pgEnum("notification_type", [
  "challenge_accepted",
  "challenge_completed",
]);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: notificationTypeEnum("type").notNull(),
    listId: uuid("list_id").references(() => lists.id, { onDelete: "cascade" }),
    listName: text("list_name"),
    actorId: text("actor_id").references(() => users.id, {
      onDelete: "set null",
    }),
    actorName: text("actor_name"),
    actorImage: text("actor_image"),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("notifications_user_idx").on(t.userId),
    index("notifications_user_read_idx").on(t.userId, t.readAt),
  ]
);

export const achievementTypeEnum = pgEnum("achievement_type", [
  "first_list_created",
  "five_lists_created",
  "first_item_added",
  "hundred_items_created",
  "first_list_accepted",
  "ten_lists_accepted",
  "first_list_completed",
  "five_lists_completed",
  "ten_lists_completed",
  "first_public_list",
  "first_follower",
  "ten_followers",
  "first_sale",
]);

export const achievements = pgTable(
  "achievements",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: achievementTypeEnum("type").notNull(),
    unlockedAt: timestamp("unlocked_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    unique("achievements_user_type_uidx").on(t.userId, t.type),
    index("achievements_user_idx").on(t.userId),
  ]
);

export const events = pgTable(
  "events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    sessionId: text("session_id"),
    type: text("type").notNull(),
    listId: uuid("list_id").references(() => lists.id, {
      onDelete: "set null",
    }),
    itemId: uuid("item_id"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("events_type_created_idx").on(t.type, t.createdAt),
    index("events_list_type_idx").on(t.listId, t.type),
    index("events_user_created_idx").on(t.userId, t.createdAt),
  ]
);

export const follows = pgTable(
  "follows",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    followerId: text("follower_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    followingId: text("following_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    unique("follows_follower_following_uidx").on(t.followerId, t.followingId),
    index("follows_following_idx").on(t.followingId),
    index("follows_follower_idx").on(t.followerId),
  ]
);

export type List = typeof lists.$inferSelect;
export type Follow = typeof follows.$inferSelect;
export type Item = typeof items.$inferSelect;
export type Participation = typeof participations.$inferSelect;
export type ItemProgress = typeof itemProgress.$inferSelect;
export type ListActivity = typeof listActivity.$inferSelect;
export type StripeAccount = typeof stripeAccounts.$inferSelect;
export type ListPrice = typeof listPrices.$inferSelect;
export type ListPurchase = typeof listPurchases.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type Event = typeof events.$inferSelect;
export type Achievement = typeof achievements.$inferSelect;
export type AchievementType = Achievement["type"];
