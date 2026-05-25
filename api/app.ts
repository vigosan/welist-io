import Google from "@auth/core/providers/google";
import type { AuthUser } from "@hono/auth-js";
import { authHandler, getAuthUser, initAuthConfig } from "@hono/auth-js";
import { zValidator } from "@hono/zod-validator";
import type { AnyColumn } from "drizzle-orm";
import {
  and,
  countDistinct,
  desc,
  eq,
  gt,
  ilike,
  inArray,
  isNotNull,
  lt,
  max,
  or,
  sql,
} from "drizzle-orm";
import { type Context, Hono } from "hono";
import Stripe from "stripe";
import { z } from "zod";
import { db } from "../src/db/client.js";
import { users } from "../src/db/schema/auth.schema.js";
import {
  type AchievementType,
  achievements,
  events,
  follows,
  itemLikes,
  itemProgress,
  items,
  listActivity,
  listPrices,
  listPurchases,
  listRatings,
  lists,
  notifications,
  participations,
  stripeAccounts,
} from "../src/db/schema/lists.schema.js";
import { LIST_CATEGORIES } from "../src/lib/categories.js";
import { plainItemText } from "../src/lib/item-text.js";
import { cleanName, slugify } from "../src/lib/slug.js";
import {
  getAppleAudiences,
  getGoogleMobileAudiences,
  issueMobileToken,
  MOBILE_TOKEN_MAX_AGE,
  verifyAppleIdToken,
  verifyGoogleIdToken,
  verifyMobileToken,
} from "./auth-mobile.js";
import { hashPassword, verifyPassword } from "./password.js";
import { sendEmail } from "./email.js";
import { signUnsubscribeToken, verifyUnsubscribeToken } from "./email-token.js";
import { rateLimit } from "./rate-limit.js";

type Variables = { authUser: AuthUser | null };

export const app = new Hono<{
  Variables: Variables;
}>().basePath("/api");

app.use(rateLimit({ limit: 120, windowMs: 60_000 }));

app.use(
  "*",
  initAuthConfig((c) => ({
    secret: c.env?.AUTH_SECRET ?? process.env.AUTH_SECRET ?? "",
    basePath: "/api/auth",
    providers: [
      Google({
        clientId: c.env?.GOOGLE_CLIENT_ID ?? process.env.GOOGLE_CLIENT_ID ?? "",
        clientSecret:
          c.env?.GOOGLE_CLIENT_SECRET ?? process.env.GOOGLE_CLIENT_SECRET ?? "",
      }),
    ],
    session: { strategy: "jwt" },
    callbacks: {
      async signIn({ user, account }) {
        if (!user.email || !account) return true;
        const existing = await db.query.users.findFirst({
          where: eq(users.email, user.email),
          columns: { id: true },
        });
        if (!existing) {
          const [created] = await db
            .insert(users)
            .values({
              // biome-ignore lint/style/noNonNullAssertion: user.id is guaranteed by auth provider
              id: user.id!,
              name: user.name,
              email: user.email,
              image: user.image,
            })
            .returning({ id: users.id });
          user.id = created.id;
        } else {
          user.id = existing.id;
        }
        return true;
      },
      jwt({ token, user }) {
        if (user?.id) token.sub = user.id;
        return token;
      },
      session({ session, token }) {
        if (session.user && token.sub) session.user.id = token.sub;
        return session;
      },
    },
    trustHost: true,
  }))
);

app.use("/auth/*", authHandler());

app.use("*", async (c, next) => {
  const authHeader = c.req.header("Authorization") ?? "";
  if (authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice("Bearer ".length).trim();
    const secret = process.env.AUTH_SECRET ?? "";
    const session = await verifyMobileToken(token, secret);
    if (session) {
      c.set("authUser", {
        session: {
          user: {
            id: session.id,
            name: session.name,
            email: session.email,
            image: session.image,
          },
          expires: new Date(
            Date.now() + MOBILE_TOKEN_MAX_AGE * 1000
          ).toISOString(),
        },
      } as AuthUser);
      await next();
      return;
    }
  }
  try {
    const authUser = await getAuthUser(c);
    c.set("authUser", authUser);
  } catch {
    c.set("authUser", null);
  }
  await next();
});

function getOptionalUser(
  c: Context<{ Variables: Variables }>
): AuthUser | null {
  return c.get("authUser") ?? null;
}

app.get("/me", (c) => {
  const authUser = getOptionalUser(c);
  return c.json(authUser?.session?.user ?? null);
});

const mobileExchangeSchema = z.object({
  provider: z.enum(["google", "apple"]),
  idToken: z.string().min(1),
});

app.post(
  "/auth-mobile/exchange",
  zValidator("json", mobileExchangeSchema),
  async (c) => {
    const { provider, idToken } = c.req.valid("json");
    const secret = process.env.AUTH_SECRET ?? "";
    if (!secret) return c.json({ error: "Server misconfigured" }, 500);

    let profile: Awaited<ReturnType<typeof verifyGoogleIdToken>>;
    try {
      profile =
        provider === "google"
          ? await verifyGoogleIdToken(idToken, getGoogleMobileAudiences())
          : await verifyAppleIdToken(idToken, getAppleAudiences());
    } catch {
      return c.json({ error: "Invalid id token" }, 401);
    }

    if (!profile.email)
      return c.json({ error: "Email not provided by identity provider" }, 401);

    const existing = await db.query.users.findFirst({
      where: eq(users.email, profile.email),
      columns: { id: true, name: true, email: true, image: true },
    });

    let user: {
      id: string;
      name: string | null;
      email: string | null;
      image: string | null;
    };
    if (existing) {
      user = existing;
    } else {
      const [created] = await db
        .insert(users)
        .values({
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.image,
        })
        .returning({
          id: users.id,
          name: users.name,
          email: users.email,
          image: users.image,
        });
      user = created;
    }

    const token = await issueMobileToken(user, secret);
    return c.json({ token, user });
  }
);

const setPasswordSchema = z.object({
  password: z.string().min(8).max(200),
});

app.post(
  "/me/password",
  zValidator("json", setPasswordSchema),
  async (c) => {
    const authUser = getOptionalUser(c);
    const userId = authUser?.session?.user?.id;
    if (!userId) return c.json({ error: "Unauthorized" }, 401);
    const { password } = c.req.valid("json");
    const passwordHash = await hashPassword(password);
    await db.update(users).set({ passwordHash }).where(eq(users.id, userId));
    return c.json({ ok: true });
  }
);

const mobileEmailLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

app.post(
  "/auth-mobile/email-login",
  zValidator("json", mobileEmailLoginSchema),
  async (c) => {
    const { email, password } = c.req.valid("json");
    const secret = process.env.AUTH_SECRET ?? "";
    if (!secret) return c.json({ error: "Server misconfigured" }, 500);
    const existing = await db.query.users.findFirst({
      where: eq(users.email, email),
      columns: {
        id: true,
        name: true,
        email: true,
        image: true,
        passwordHash: true,
      },
    });
    if (!existing?.passwordHash)
      return c.json({ error: "Invalid email or password" }, 401);
    const ok = await verifyPassword(password, existing.passwordHash);
    if (!ok) return c.json({ error: "Invalid email or password" }, 401);
    const user = {
      id: existing.id,
      name: existing.name,
      email: existing.email,
      image: existing.image,
    };
    const token = await issueMobileToken(user, secret);
    return c.json({ token, user });
  }
);

function isUniqueViolation(e: unknown): boolean {
  if (typeof e !== "object" || e === null || !("code" in e)) return false;
  const { code } = e as { code: unknown };
  return code === "23505";
}

async function canViewList(
  list: {
    id?: string;
    ownerId: string | null;
    public: boolean;
    collaborative: boolean;
  },
  userId: string | null
): Promise<boolean> {
  if (
    list.public ||
    list.collaborative ||
    (userId !== null && list.ownerId === userId)
  )
    return true;
  if (userId && list.id) return hasPurchased(userId, list.id);
  return false;
}

function canModifyList(
  list: { ownerId: string | null; collaborative: boolean },
  userId: string | null
): boolean {
  return list.ownerId === null || list.ownerId === userId || list.collaborative;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function inUuids(col: AnyColumn, ids: string[]) {
  return sql`${col} = ANY(ARRAY[${sql.join(
    ids.map((id) => sql`${id}::uuid`),
    sql`, `
  )}])`;
}

function listWhere(param: string) {
  return UUID_RE.test(param) ? eq(lists.id, param) : eq(lists.slug, param);
}

async function resolveList(param: string): Promise<{
  id: string;
  ownerId: string | null;
  collaborative: boolean;
  public: boolean;
} | null> {
  const list = await db.query.lists.findFirst({
    where: listWhere(param),
    columns: {
      id: true,
      ownerId: true,
      collaborative: true,
      public: true,
    },
  });
  return list ?? null;
}

async function getParticipation(sourceListId: string, userId: string) {
  return db.query.participations.findFirst({
    where: and(
      eq(participations.sourceListId, sourceListId),
      eq(participations.userId, userId)
    ),
    columns: { id: true, completedAt: true, role: true },
  });
}

async function getListRatingStats(
  listId: string,
  userId: string | null
): Promise<{ avg: number | null; count: number; userValue: number | null }> {
  const [stats] = await db
    .select({
      avg: sql<number | null>`avg(${listRatings.value})::float8`,
      count: sql<number>`cast(count(*) as int)`,
    })
    .from(listRatings)
    .where(eq(listRatings.listId, listId));

  let userValue: number | null = null;
  if (userId) {
    const rows = await db
      .select({ value: listRatings.value })
      .from(listRatings)
      .where(
        and(eq(listRatings.userId, userId), eq(listRatings.listId, listId))
      )
      .limit(1);
    userValue = rows[0]?.value ?? null;
  }

  return {
    avg: stats?.avg ?? null,
    count: stats?.count ?? 0,
    userValue,
  };
}

function computeDayStreak(days: string[], now: Date): number {
  if (days.length === 0) return 0;
  const DAY_MS = 86_400_000;
  const toNum = (s: string) =>
    Math.floor(Date.parse(`${s}T00:00:00Z`) / DAY_MS);
  const todayNum = Math.floor(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) / DAY_MS
  );
  const nums = [...new Set(days.map(toNum))].sort((a, b) => b - a);
  if (nums[0] < todayNum - 1) return 0;
  let streak = 1;
  for (let i = 1; i < nums.length; i++) {
    if (nums[i - 1] - nums[i] === 1) streak += 1;
    else break;
  }
  return streak;
}

type NotificationType =
  | "challenge_accepted"
  | "challenge_completed"
  | "new_follower"
  | "list_purchased"
  | "added_as_collaborator";

type CreateNotificationInput = {
  recipientId: string;
  type: NotificationType;
  listId?: string | null;
  listName?: string | null;
  actorId?: string | null;
  actorName?: string | null;
  actorImage?: string | null;
  actionUrl?: string | null;
};

async function createNotification(input: CreateNotificationInput) {
  await db.insert(notifications).values({
    userId: input.recipientId,
    type: input.type,
    listId: input.listId ?? null,
    listName: input.listName ?? null,
    actorId: input.actorId ?? null,
    actorName: input.actorName ?? null,
    actorImage: input.actorImage ?? null,
    actionUrl: input.actionUrl ?? null,
  });
}

async function logActivity(
  listId: string,
  userId: string | null,
  action:
    | "item_added"
    | "item_edited"
    | "item_deleted"
    | "challenge_accepted"
    | "challenge_completed",
  itemId?: string,
  previousValue?: unknown,
  newValue?: unknown
) {
  await db.insert(listActivity).values({
    listId,
    userId,
    action,
    itemId,
    previousValue: previousValue ?? null,
    newValue: newValue ?? null,
  });
}

app.post(
  "/lists",
  zValidator("json", z.object({ name: z.string().min(1).max(200) })),
  async (c) => {
    const name = cleanName(c.req.valid("json").name);
    const authUser = getOptionalUser(c);
    const ownerId = authUser?.session?.user?.id ?? null;
    const baseSlug = slugify(name);
    let list: typeof lists.$inferSelect | undefined;
    for (let attempt = 0; attempt < 6; attempt++) {
      const slug =
        baseSlug.length === 0
          ? null
          : attempt === 0
            ? baseSlug
            : `${baseSlug}-${attempt + 1}`;
      try {
        [list] = await db
          .insert(lists)
          .values({ name, slug, ownerId })
          .returning();
        break;
      } catch (e: unknown) {
        if (!isUniqueViolation(e) || slug === null) throw e;
      }
    }
    if (!list) {
      [list] = await db
        .insert(lists)
        .values({ name, slug: null, ownerId })
        .returning();
    }
    await checkAchievements(ownerId);
    return c.json(list, 201);
  }
);

app.get("/my-lists", async (c) => {
  const authUser = getOptionalUser(c);
  const userId = authUser?.session?.user?.id ?? null;
  if (!userId) return c.json({ error: "Unauthorized" }, 401);
  const cursor = c.req.query("cursor");
  const q = c.req.query("q")?.trim();
  const sort = c.req.query("sort") ?? "recent";
  const visibility = c.req.query("visibility");
  const visibilityFilter =
    visibility === "public"
      ? eq(lists.public, true)
      : visibility === "private"
        ? eq(lists.public, false)
        : undefined;
  const participated = await db
    .select({ sourceListId: participations.sourceListId })
    .from(participations)
    .where(eq(participations.userId, userId));
  const participatedIds = participated
    .map((p) => p.sourceListId)
    .filter((id): id is string => id !== null);
  const ownerOrParticipant =
    participatedIds.length > 0
      ? or(eq(lists.ownerId, userId), inUuids(lists.id, participatedIds))
      : eq(lists.ownerId, userId);
  const baseWhere = and(
    ownerOrParticipant,
    q ? ilike(lists.name, `%${q}%`) : undefined,
    visibilityFilter
  );

  const itemCountExpr = sql<number>`cast((select count(*) from ${items} where ${items.listId} = ${lists.id}) as int)`;
  const doneCountExpr = sql<number>`cast((select count(*) from ${items} where ${items.listId} = ${lists.id} and ${items.done} = true) as int)`;
  const participantCountExpr = sql<number>`cast((select count(*) from ${participations} where ${participations.sourceListId} = ${lists.id}) as int)`;
  const likeCountExpr = sql<number>`cast((select count(*) from ${itemLikes} il join ${items} i on i.id = il.item_id where i.list_id = ${lists.id}) as int)`;

  if (sort === "likes") {
    const rows = await db
      .select({
        id: lists.id,
        name: lists.name,
        slug: lists.slug,
        description: lists.description,
        public: lists.public,
        collaborative: lists.collaborative,
        ownerId: lists.ownerId,
        createdAt: lists.createdAt,
        itemCount: itemCountExpr,
        doneCount: doneCountExpr,
        participantCount: participantCountExpr,
        likeCount: likeCountExpr,
      })
      .from(lists)
      .where(baseWhere)
      .orderBy(desc(likeCountExpr), desc(lists.createdAt))
      .limit(MY_LISTS_PAGE_SIZE);
    return c.json({ items: rows, nextCursor: null });
  }

  if (sort === "recent") {
    const activityExpr = sql<Date>`coalesce(max(${items.updatedAt}), ${lists.createdAt})`;
    const rows = await db
      .select({
        id: lists.id,
        name: lists.name,
        slug: lists.slug,
        description: lists.description,
        public: lists.public,
        collaborative: lists.collaborative,
        ownerId: lists.ownerId,
        createdAt: lists.createdAt,
        lastActivity: activityExpr,
        itemCount: itemCountExpr,
        doneCount: doneCountExpr,
        participantCount: participantCountExpr,
      })
      .from(lists)
      .leftJoin(items, eq(items.listId, lists.id))
      .where(baseWhere)
      .groupBy(lists.id)
      .having(cursor ? lt(activityExpr, new Date(cursor)) : undefined)
      .orderBy(desc(activityExpr))
      .limit(MY_LISTS_PAGE_SIZE);
    const nextCursor =
      rows.length === MY_LISTS_PAGE_SIZE
        ? new Date(rows[rows.length - 1].lastActivity).toISOString()
        : null;
    return c.json({
      items: rows.map(({ lastActivity: _la, ...list }) => list),
      nextCursor,
    });
  }

  const isAsc = sort === "created_asc";
  const where = cursor
    ? and(
        baseWhere,
        isAsc
          ? gt(lists.createdAt, new Date(cursor))
          : lt(lists.createdAt, new Date(cursor))
      )
    : baseWhere;
  const rows = await db
    .select({
      id: lists.id,
      name: lists.name,
      slug: lists.slug,
      description: lists.description,
      public: lists.public,
      collaborative: lists.collaborative,
      ownerId: lists.ownerId,
      createdAt: lists.createdAt,
      itemCount: itemCountExpr,
      doneCount: doneCountExpr,
      participantCount: participantCountExpr,
    })
    .from(lists)
    .where(where)
    .orderBy(isAsc ? lists.createdAt : desc(lists.createdAt))
    .limit(MY_LISTS_PAGE_SIZE);
  const nextCursor =
    rows.length === MY_LISTS_PAGE_SIZE
      ? rows[rows.length - 1].createdAt.toISOString()
      : null;
  return c.json({ items: rows, nextCursor });
});

app.get("/lists/:listId", async (c) => {
  const listId = c.req.param("listId");
  const list = await db.query.lists.findFirst({
    where: listWhere(listId),
  });
  if (!list) return c.json({ error: "Not found" }, 404);
  const authUser = getOptionalUser(c);
  const userId = authUser?.session?.user?.id ?? null;
  if (!(await canViewList(list, userId)))
    return c.json({ error: "Not found" }, 404);
  if (userId && list.collaborative && list.ownerId !== userId) {
    await db
      .insert(participations)
      .values({
        sourceListId: list.id,
        userId,
        role: "collaborator",
      })
      .onConflictDoNothing();
  }
  const participation = userId ? await getParticipation(list.id, userId) : null;
  const rating = await getListRatingStats(list.id, userId);
  return c.json({
    ...list,
    participated: !!participation,
    participationCompletedAt: participation?.completedAt ?? null,
    rating,
  });
});

app.patch(
  "/lists/:listId",
  zValidator(
    "json",
    z.object({
      name: z.string().min(1).max(200).optional(),
      slug: z
        .string()
        .min(1)
        .max(100)
        .regex(/^[a-z0-9-]+$/)
        .optional()
        .nullable(),
      description: z.string().max(500).optional().nullable(),
      category: z.enum(LIST_CATEGORIES).optional().nullable(),
      public: z.boolean().optional(),
      collaborative: z.boolean().optional(),
    })
  ),
  async (c) => {
    const listId = c.req.param("listId");
    const body = c.req.valid("json");
    const list = await db.query.lists.findFirst({
      where: listWhere(listId),
    });
    if (!list) return c.json({ error: "Not found" }, 404);
    const authUser = getOptionalUser(c);
    const userId = authUser?.session?.user?.id ?? null;
    if (list.ownerId !== null && list.ownerId !== userId)
      return c.json({ error: "Forbidden" }, 403);
    const patch: Record<string, unknown> = {};
    if (body.name !== undefined) patch.name = cleanName(body.name);
    if ("slug" in body) patch.slug = body.slug ?? null;
    if ("description" in body) patch.description = body.description ?? null;
    if ("category" in body) patch.category = body.category ?? null;
    if (body.public !== undefined) patch.public = body.public;
    if (body.collaborative !== undefined)
      patch.collaborative = body.collaborative;
    try {
      const [updated] = await db
        .update(lists)
        .set(patch)
        .where(eq(lists.id, list.id))
        .returning();
      if (!updated) return c.json({ error: "Not found" }, 404);
      if (body.public === true && !list.public) {
        await checkAchievements(list.ownerId);
      }
      return c.json(updated);
    } catch (e: unknown) {
      if (isUniqueViolation(e)) return c.json({ error: "slug_taken" }, 409);
      throw e;
    }
  }
);

app.get("/lists/:listId/items", async (c) => {
  const list = await resolveList(c.req.param("listId"));
  if (!list) return c.json({ error: "Not found" }, 404);
  const authUser = getOptionalUser(c);
  const userId = authUser?.session?.user?.id ?? null;
  if (!(await canViewList(list, userId)))
    return c.json({ error: "Not found" }, 404);
  const isOwner = list.ownerId === null || list.ownerId === userId;
  const participation =
    userId && !isOwner ? await getParticipation(list.id, userId) : null;

  const rows = await db.query.items.findMany({
    where: eq(items.listId, list.id),
    orderBy: (t, { asc }) => [asc(t.position), asc(t.createdAt)],
  });

  const itemIds = rows.map((r) => r.id);
  const likeRows =
    itemIds.length === 0
      ? []
      : await db.query.itemLikes.findMany({
          where: inUuids(itemLikes.itemId, itemIds),
          columns: { itemId: true, userId: true },
        });
  const likeCountByItem = new Map<string, number>();
  const likedByMeSet = new Set<string>();
  for (const row of likeRows) {
    likeCountByItem.set(row.itemId, (likeCountByItem.get(row.itemId) ?? 0) + 1);
    if (userId && row.userId === userId) likedByMeSet.add(row.itemId);
  }
  const withLikes = rows.map((item) => ({
    ...item,
    likeCount: likeCountByItem.get(item.id) ?? 0,
    likedByMe: likedByMeSet.has(item.id),
  }));

  if (!participation || participation.role !== "challenger")
    return c.json(withLikes);

  const progressRows =
    itemIds.length === 0
      ? []
      : await db.query.itemProgress.findMany({
          where: and(
            // biome-ignore lint/style/noNonNullAssertion: userId checked by participation lookup above
            eq(itemProgress.userId, userId!),
            inUuids(itemProgress.itemId, itemIds)
          ),
          columns: { itemId: true, done: true },
        });
  const progressMap = new Map(progressRows.map((p) => [p.itemId, p.done]));
  return c.json(
    withLikes.map((item) => ({
      ...item,
      done: progressMap.get(item.id) ?? false,
    }))
  );
});

app.post(
  "/lists/:listId/items",
  zValidator(
    "json",
    z.object({
      text: z.string().min(1).max(1000),
      latitude: z.string().optional(),
      longitude: z.string().optional(),
      placeName: z.string().optional(),
    })
  ),
  async (c) => {
    const list = await resolveList(c.req.param("listId"));
    if (!list) return c.json({ error: "Not found" }, 404);
    const authUser = getOptionalUser(c);
    const userId = authUser?.session?.user?.id ?? null;
    if (!canModifyList(list, userId))
      return c.json({ error: "Forbidden" }, 403);
    const { text, latitude, longitude, placeName } = c.req.valid("json");
    const [maxRow] = await db
      .select({ pos: max(items.position) })
      .from(items)
      .where(eq(items.listId, list.id));
    const position = (maxRow?.pos ?? -1) + 1;
    const [item] = await db
      .insert(items)
      .values({
        listId: list.id,
        text,
        position,
        latitude: latitude ?? null,
        longitude: longitude ?? null,
        placeName: placeName ?? null,
      })
      .returning();
    if (list.public && list.collaborative && userId) {
      await logActivity(list.id, userId, "item_added", item.id, null, { text });
    }
    await checkAchievements(list.ownerId);
    return c.json(item, 201);
  }
);

app.patch(
  "/lists/:listId/items/reorder",
  zValidator(
    "json",
    z.object({
      ids: z.array(z.string().uuid()).min(1).max(500),
    })
  ),
  async (c) => {
    const list = await resolveList(c.req.param("listId"));
    if (!list) return c.json({ error: "Not found" }, 404);
    const authUser = getOptionalUser(c);
    const userId = authUser?.session?.user?.id ?? null;
    if (!canModifyList(list, userId))
      return c.json({ error: "Forbidden" }, 403);
    const { ids } = c.req.valid("json");
    await Promise.all(
      ids.map((id, i) =>
        db
          .update(items)
          .set({ position: i })
          .where(and(eq(items.id, id), eq(items.listId, list.id)))
      )
    );
    return c.body(null, 204);
  }
);

app.patch(
  "/lists/:listId/items/:itemId",
  zValidator(
    "json",
    z.object({
      text: z.string().min(1).max(1000).optional(),
      done: z.boolean().optional(),
      latitude: z.string().nullable().optional(),
      longitude: z.string().nullable().optional(),
      placeName: z.string().nullable().optional(),
    })
  ),
  async (c) => {
    const list = await resolveList(c.req.param("listId"));
    if (!list) return c.json({ error: "Not found" }, 404);
    const authUser = getOptionalUser(c);
    const userId = authUser?.session?.user?.id ?? null;
    if (!canModifyList(list, userId))
      return c.json({ error: "Forbidden" }, 403);
    const itemId = c.req.param("itemId");
    const body = c.req.valid("json");
    const previous =
      list.public && list.collaborative && userId
        ? await db.query.items.findFirst({
            where: and(eq(items.id, itemId), eq(items.listId, list.id)),
            columns: { text: true },
          })
        : null;
    const [updated] = await db
      .update(items)
      .set({ ...body, updatedAt: new Date() })
      .where(and(eq(items.id, itemId), eq(items.listId, list.id)))
      .returning();
    if (!updated) return c.json({ error: "Not found" }, 404);
    if (
      list.public &&
      list.collaborative &&
      userId &&
      body.text !== undefined
    ) {
      await logActivity(
        list.id,
        userId,
        "item_edited",
        itemId,
        { text: previous?.text },
        { text: body.text }
      );
    }
    return c.json(updated);
  }
);

app.patch("/lists/:listId/items/:itemId/toggle", async (c) => {
  const list = await resolveList(c.req.param("listId"));
  if (!list) return c.json({ error: "Not found" }, 404);
  const authUser = getOptionalUser(c);
  const userId = authUser?.session?.user?.id ?? null;
  const itemId = c.req.param("itemId");

  const item = await db.query.items.findFirst({
    where: and(eq(items.id, itemId), eq(items.listId, list.id)),
    columns: { id: true, done: true },
  });
  if (!item) return c.json({ error: "Not found" }, 404);

  const isOwner = list.ownerId === null || list.ownerId === userId;
  const participation =
    userId && !isOwner ? await getParticipation(list.id, userId) : null;

  if (participation?.role === "challenger" && userId) {
    const existing = await db.query.itemProgress.findFirst({
      where: and(
        eq(itemProgress.userId, userId),
        eq(itemProgress.itemId, itemId)
      ),
      columns: { done: true },
    });
    const newDone = !(existing?.done ?? false);
    await db
      .insert(itemProgress)
      .values({ userId, itemId, done: newDone })
      .onConflictDoUpdate({
        target: [itemProgress.userId, itemProgress.itemId],
        set: { done: newDone, updatedAt: new Date() },
      });

    const allItems = await db.query.items.findMany({
      where: eq(items.listId, list.id),
      columns: { id: true },
    });
    const allItemIds = allItems.map((i) => i.id);
    const allProgress =
      allItemIds.length === 0
        ? []
        : await db.query.itemProgress.findMany({
            where: and(
              eq(itemProgress.userId, userId),
              inUuids(itemProgress.itemId, allItemIds)
            ),
            columns: { done: true },
          });
    const allDone =
      allItems.length > 0 &&
      allProgress.length === allItems.length &&
      allProgress.every((p) => p.done);
    if (allDone && !participation.completedAt) {
      await db
        .update(participations)
        .set({ completedAt: new Date() })
        .where(
          and(
            eq(participations.sourceListId, list.id),
            eq(participations.userId, userId)
          )
        );
      await logActivity(list.id, userId, "challenge_completed");
      await checkAchievements(userId);
      if (list.ownerId) {
        const [actor, listMeta] = await Promise.all([
          db.query.users.findFirst({
            where: eq(users.id, userId),
            columns: { name: true, image: true },
          }),
          db.query.lists.findFirst({
            where: eq(lists.id, list.id),
            columns: { name: true },
          }),
        ]);
        await createNotification({
          recipientId: list.ownerId,
          type: "challenge_completed",
          listId: list.id,
          listName: listMeta?.name ?? "",
          actorId: userId,
          actorName: actor?.name,
          actorImage: actor?.image,
        });
      }
    }

    return c.json({ ...item, done: newDone });
  }

  if (participation?.role !== "collaborator" && !canModifyList(list, userId)) {
    return c.json({ error: "Forbidden" }, 403);
  }

  const [updated] = await db
    .update(items)
    .set({
      done: sql`NOT ${items.done}`,
      updatedAt: new Date(),
    })
    .where(and(eq(items.id, itemId), eq(items.listId, list.id)))
    .returning();
  if (!updated) return c.json({ error: "Not found" }, 404);

  return c.json(updated);
});

app.post("/lists/:listId/items/:itemId/like", async (c) => {
  const list = await resolveList(c.req.param("listId"));
  if (!list) return c.json({ error: "Not found" }, 404);
  const authUser = getOptionalUser(c);
  const userId = authUser?.session?.user?.id ?? null;
  if (!userId) return c.json({ error: "Unauthorized" }, 401);
  if (!(await canViewList(list, userId)))
    return c.json({ error: "Not found" }, 404);
  const itemId = c.req.param("itemId");
  const item = await db.query.items.findFirst({
    where: and(eq(items.id, itemId), eq(items.listId, list.id)),
    columns: { id: true },
  });
  if (!item) return c.json({ error: "Not found" }, 404);

  const existing = await db.query.itemLikes.findFirst({
    where: and(eq(itemLikes.userId, userId), eq(itemLikes.itemId, itemId)),
    columns: { id: true },
  });
  if (existing) {
    await db.delete(itemLikes).where(eq(itemLikes.id, existing.id));
  } else {
    await db.insert(itemLikes).values({ userId, itemId });
  }
  const likeCount = await db.$count(itemLikes, eq(itemLikes.itemId, itemId));
  return c.json({ liked: !existing, likeCount });
});

app.delete("/lists/:listId/items/:itemId", async (c) => {
  const list = await resolveList(c.req.param("listId"));
  if (!list) return c.json({ error: "Not found" }, 404);
  const authUser = getOptionalUser(c);
  const userId = authUser?.session?.user?.id ?? null;
  if (!canModifyList(list, userId)) return c.json({ error: "Forbidden" }, 403);
  const itemId = c.req.param("itemId");
  const previous =
    list.public && list.collaborative && userId
      ? await db.query.items.findFirst({
          where: and(eq(items.id, itemId), eq(items.listId, list.id)),
          columns: { text: true },
        })
      : null;
  await db
    .delete(items)
    .where(and(eq(items.id, itemId), eq(items.listId, list.id)));
  if (list.public && list.collaborative && userId && previous) {
    await logActivity(
      list.id,
      userId,
      "item_deleted",
      itemId,
      { text: previous.text },
      null
    );
  }
  return c.body(null, 204);
});

app.delete(
  "/lists/:listId/items",
  zValidator("json", z.object({ ids: z.array(z.string().uuid()).min(1) })),
  async (c) => {
    const list = await resolveList(c.req.param("listId"));
    if (!list) return c.json({ error: "Not found" }, 404);
    const authUser = getOptionalUser(c);
    const userId = authUser?.session?.user?.id ?? null;
    if (!canModifyList(list, userId))
      return c.json({ error: "Forbidden" }, 403);
    const { ids } = c.req.valid("json");
    await db
      .delete(items)
      .where(and(eq(items.listId, list.id), inUuids(items.id, ids)));
    return c.body(null, 204);
  }
);

const EXPLORE_PAGE_SIZE = 6;
const MY_LISTS_PAGE_SIZE = 6;

const BULK_ITEM_LIMIT = 100;

app.post(
  "/lists/:listId/items/bulk",
  zValidator(
    "json",
    z.object({
      texts: z.array(z.string().min(1).max(1000)).min(1).max(BULK_ITEM_LIMIT),
    })
  ),
  async (c) => {
    const list = await resolveList(c.req.param("listId"));
    if (!list) return c.json({ error: "Not found" }, 404);
    const authUser = getOptionalUser(c);
    const userId = authUser?.session?.user?.id ?? null;
    if (!canModifyList(list, userId))
      return c.json({ error: "Forbidden" }, 403);
    const { texts } = c.req.valid("json");
    const [maxRow] = await db
      .select({ pos: max(items.position) })
      .from(items)
      .where(eq(items.listId, list.id));
    const basePosition = (maxRow?.pos ?? -1) + 1;
    const created = await db
      .insert(items)
      .values(
        texts.map((text, i) => ({
          listId: list.id,
          text,
          position: basePosition + i,
        }))
      )
      .returning();
    return c.json(created, 201);
  }
);

app.get("/explore", async (c) => {
  const viewerId = getOptionalUser(c)?.session?.user?.id ?? null;
  const q = c.req.query("q")?.trim();
  const cursor = c.req.query("cursor");
  const sort = c.req.query("sort") ?? "created_desc";
  const isAsc = sort === "created_asc";
  const isTrending = sort === "trending";
  const category = c.req.query("category");
  const categoryFilter =
    category && (LIST_CATEGORIES as readonly string[]).includes(category)
      ? eq(lists.category, category)
      : undefined;

  const baseWhere = and(
    eq(lists.public, true),
    q ? ilike(lists.name, `%${q}%`) : undefined,
    categoryFilter
  );
  const where =
    cursor && !isTrending
      ? and(
          baseWhere,
          isAsc
            ? gt(lists.createdAt, new Date(cursor))
            : lt(lists.createdAt, new Date(cursor))
        )
      : baseWhere;

  const trendScore = sql<number>`cast((select count(*) from ${participations} where ${participations.sourceListId} = ${lists.id} and ${participations.createdAt} > now() - interval '30 days') as int)`;

  const rows = await db
    .select({
      id: lists.id,
      name: lists.name,
      slug: lists.slug,
      description: lists.description,
      category: lists.category,
      createdAt: lists.createdAt,
      itemCount: sql<number>`cast((select count(*) from ${items} where ${items.listId} = ${lists.id}) as int)`,
      participantCount: sql<number>`cast((select count(*) from ${participations} where ${participations.sourceListId} = ${lists.id}) as int)`,
      completedCount: sql<number>`cast((select count(*) from ${participations} where ${participations.sourceListId} = ${lists.id} and ${participations.completedAt} is not null) as int)`,
      progressDoneTotal: sql<number>`cast((select count(*) from ${itemProgress} ip join ${items} i on i.id = ip.item_id where i.list_id = ${lists.id} and ip.done = true and ip.user_id in (select user_id from ${participations} where source_list_id = ${lists.id})) as int)`,
      previewItems: sql<
        string[]
      >`coalesce((select array_agg(p.text) from (select ${items.text} as text from ${items} where ${items.listId} = ${lists.id} order by ${items.position} asc limit 3) p), array[]::text[])`,
      participants: sql<
        Array<{ id: string; name: string | null; image: string | null }>
      >`coalesce((select json_agg(s) from (select u.id, u.name, u.image from ${participations} pa join ${users} u on u.id = pa.user_id where pa.source_list_id = ${lists.id} order by pa.created_at desc limit 5) s), '[]'::json)`,
      isParticipating: viewerId
        ? sql<boolean>`exists(select 1 from ${participations} where ${participations.sourceListId} = ${lists.id} and ${participations.userId} = ${viewerId})`
        : sql<boolean>`false`,
      ratingAvg: sql<
        number | null
      >`(select avg(${listRatings.value})::float8 from ${listRatings} where ${listRatings.listId} = ${lists.id})`,
      ratingCount: sql<number>`cast((select count(*) from ${listRatings} where ${listRatings.listId} = ${lists.id}) as int)`,
      ownerId: users.id,
      ownerName: users.name,
      ownerImage: users.image,
    })
    .from(lists)
    .leftJoin(users, eq(users.id, lists.ownerId))
    .where(where)
    .orderBy(
      ...(isTrending
        ? [desc(trendScore), desc(lists.createdAt)]
        : [isAsc ? lists.createdAt : desc(lists.createdAt)])
    )
    .limit(EXPLORE_PAGE_SIZE);

  const nextCursor =
    !isTrending && rows.length === EXPLORE_PAGE_SIZE
      ? rows[rows.length - 1].createdAt.toISOString()
      : null;

  const exploreItems = rows.map(
    ({
      ownerId,
      ownerName,
      ownerImage,
      completedCount,
      ratingAvg,
      ratingCount,
      ...row
    }) => ({
      ...row,
      completedCount,
      rating: { avg: ratingAvg, count: ratingCount },
      owner: ownerId
        ? { id: ownerId, name: ownerName, image: ownerImage }
        : null,
    })
  );

  return c.json({ items: exploreItems, nextCursor });
});

app.get("/stats", async (c) => {
  const [userCount, listCount, challengeCount] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .then(([r]) => r?.count ?? 0),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(lists)
      .where(eq(lists.public, true))
      .then(([r]) => r?.count ?? 0),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(participations)
      .where(sql`${participations.completedAt} is not null`)
      .then(([r]) => r?.count ?? 0),
  ]);
  return c.json({
    users: userCount,
    lists: listCount,
    challenges: challengeCount,
  });
});

const USERS_PAGE_SIZE = 6;

app.get("/users", async (c) => {
  const q = c.req.query("q")?.trim();
  const cursor = c.req.query("cursor");
  const viewerId = getOptionalUser(c)?.session?.user?.id ?? null;

  const baseWhere = and(
    eq(users.publicProfile, true),
    q ? ilike(users.name, `%${q}%`) : undefined
  );
  const where = cursor ? and(baseWhere, lt(users.id, cursor)) : baseWhere;

  const rows = await db
    .select({ id: users.id, name: users.name, image: users.image })
    .from(users)
    .where(where)
    .orderBy(desc(users.id))
    .limit(USERS_PAGE_SIZE);

  const nextCursor =
    rows.length === USERS_PAGE_SIZE ? rows[rows.length - 1].id : null;

  const userIds = rows.map((r) => r.id);

  const [
    listCounts,
    challengerCounts,
    completedCounts,
    collaboratorCounts,
    achievementCounts,
    followerCounts,
  ] =
    userIds.length === 0
      ? [[], [], [], [], [], []]
      : await Promise.all([
          db
            .select({ ownerId: lists.ownerId, count: countDistinct(lists.id) })
            .from(lists)
            .where(and(eq(lists.public, true), inArray(lists.ownerId, userIds)))
            .groupBy(lists.ownerId),
          db
            .select({
              userId: participations.userId,
              count: countDistinct(participations.id),
            })
            .from(participations)
            .where(
              and(
                inArray(participations.userId, userIds),
                eq(participations.role, "challenger")
              )
            )
            .groupBy(participations.userId),
          db
            .select({
              userId: participations.userId,
              count: countDistinct(participations.id),
            })
            .from(participations)
            .where(
              and(
                inArray(participations.userId, userIds),
                eq(participations.role, "challenger"),
                sql`${participations.completedAt} is not null`
              )
            )
            .groupBy(participations.userId),
          db
            .select({
              userId: participations.userId,
              count: countDistinct(participations.id),
            })
            .from(participations)
            .where(
              and(
                inArray(participations.userId, userIds),
                eq(participations.role, "collaborator")
              )
            )
            .groupBy(participations.userId),
          db
            .select({
              userId: achievements.userId,
              count: countDistinct(achievements.id),
            })
            .from(achievements)
            .where(inArray(achievements.userId, userIds))
            .groupBy(achievements.userId),
          db
            .select({
              followingId: follows.followingId,
              count: countDistinct(follows.id),
            })
            .from(follows)
            .where(inArray(follows.followingId, userIds))
            .groupBy(follows.followingId),
        ]);

  const listCountMap = new Map(listCounts.map((r) => [r.ownerId, r.count]));
  const challengerCountMap = new Map(
    challengerCounts.map((r) => [r.userId, r.count])
  );
  const completedCountMap = new Map(
    completedCounts.map((r) => [r.userId, r.count])
  );
  const collaboratorCountMap = new Map(
    collaboratorCounts.map((r) => [r.userId, r.count])
  );
  const achievementCountMap = new Map(
    achievementCounts.map((r) => [r.userId, r.count])
  );
  const followerCountMap = new Map(
    followerCounts.map((r) => [r.followingId, r.count])
  );

  const followingSet =
    viewerId && userIds.length > 0
      ? new Set(
          (
            await db
              .select({ followingId: follows.followingId })
              .from(follows)
              .where(
                and(
                  eq(follows.followerId, viewerId),
                  inArray(follows.followingId, userIds)
                )
              )
          ).map((r) => r.followingId)
        )
      : new Set<string>();

  return c.json({
    users: rows.map((u) => ({
      ...u,
      ownedListsCount: listCountMap.get(u.id) ?? 0,
      challengerCount: challengerCountMap.get(u.id) ?? 0,
      completedChallengesCount: completedCountMap.get(u.id) ?? 0,
      collaboratorCount: collaboratorCountMap.get(u.id) ?? 0,
      achievementsUnlocked: achievementCountMap.get(u.id) ?? 0,
      achievementsTotal: ACHIEVEMENT_CATALOG.length,
      followerCount: followerCountMap.get(u.id) ?? 0,
      isFollowing: followingSet.has(u.id),
    })),
    nextCursor,
  });
});

app.get("/users/search", async (c) => {
  const authUser = getOptionalUser(c);
  const viewerId = authUser?.session?.user?.id;
  if (!viewerId) return c.json({ error: "Unauthorized" }, 401);

  const q = c.req.query("q")?.trim();
  if (!q || q.length < 2) return c.json({ error: "invalid_query" }, 400);

  const pattern = `%${q}%`;
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      image: users.image,
    })
    .from(users)
    .where(
      and(
        eq(users.publicProfile, true),
        sql`${users.id} <> ${viewerId}`,
        or(ilike(users.name, pattern), ilike(users.email, pattern))
      )
    )
    .limit(8);

  return c.json({ users: rows });
});

app.patch(
  "/users/me",
  zValidator(
    "json",
    z.object({
      publicProfile: z.boolean().optional(),
      emailOptIn: z.boolean().optional(),
    })
  ),
  async (c) => {
    const authUser = getOptionalUser(c);
    const userId = authUser?.session?.user?.id;
    if (!userId) return c.json({ error: "Unauthorized" }, 401);
    const body = c.req.valid("json");
    const patch: Record<string, unknown> = {};
    if (body.publicProfile !== undefined)
      patch.publicProfile = body.publicProfile;
    if (body.emailOptIn !== undefined) patch.emailOptIn = body.emailOptIn;
    if (Object.keys(patch).length === 0)
      return c.json({ error: "no_fields" }, 400);
    const [updated] = await db
      .update(users)
      .set(patch)
      .where(eq(users.id, userId))
      .returning({
        publicProfile: users.publicProfile,
        emailOptIn: users.emailOptIn,
      });
    if (!updated) return c.json({ error: "Not found" }, 404);
    return c.json({
      publicProfile: updated.publicProfile,
      emailOptIn: updated.emailOptIn,
    });
  }
);

app.get("/users/me", async (c) => {
  const authUser = getOptionalUser(c);
  const userId = authUser?.session?.user?.id;
  if (!userId) return c.json({ error: "Unauthorized" }, 401);
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: {
      id: true,
      publicProfile: true,
      emailOptIn: true,
      passwordHash: true,
    },
  });
  if (!user) return c.json({ error: "Not found" }, 404);
  return c.json({
    publicProfile: user.publicProfile,
    emailOptIn: user.emailOptIn,
    hasPassword: user.passwordHash !== null,
  });
});

app.get("/me/streak", async (c) => {
  const authUser = getOptionalUser(c);
  const userId = authUser?.session?.user?.id;
  if (!userId) return c.json({ error: "Unauthorized" }, 401);
  const dayExpr = sql<string>`to_char(${itemProgress.updatedAt}, 'YYYY-MM-DD')`;
  const rows = await db
    .select({ day: dayExpr })
    .from(itemProgress)
    .where(and(eq(itemProgress.userId, userId), eq(itemProgress.done, true)))
    .groupBy(dayExpr)
    .orderBy(desc(dayExpr));
  return c.json({
    current: computeDayStreak(
      rows.map((r) => r.day),
      new Date()
    ),
  });
});

app.get("/users/:userId/profile", async (c) => {
  const userId = c.req.param("userId");

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { id: true, name: true, image: true },
  });
  if (!user) return c.json({ error: "Not found" }, 404);

  const publicListRows = await db
    .select({
      id: lists.id,
      name: lists.name,
      slug: lists.slug,
      description: lists.description,
      createdAt: lists.createdAt,
      itemCount: sql<number>`cast((select count(*) from ${items} where ${items.listId} = ${lists.id}) as int)`,
      participantCount: sql<number>`cast((select count(*) from ${participations} where ${participations.sourceListId} = ${lists.id}) as int)`,
      completedCount: sql<number>`cast((select count(*) from ${participations} where ${participations.sourceListId} = ${lists.id} and ${participations.completedAt} is not null) as int)`,
      ratingAvg: sql<
        number | null
      >`(select avg(${listRatings.value})::float8 from ${listRatings} where ${listRatings.listId} = ${lists.id})`,
      ratingCount: sql<number>`cast((select count(*) from ${listRatings} where ${listRatings.listId} = ${lists.id}) as int)`,
    })
    .from(lists)
    .where(and(eq(lists.ownerId, userId), eq(lists.public, true)))
    .orderBy(desc(lists.createdAt))
    .limit(20);

  const publicLists = publicListRows.map(
    ({ ratingAvg, ratingCount, ...row }) => ({
      ...row,
      rating: { avg: ratingAvg, count: ratingCount },
    })
  );

  const completedChallenges = await db
    .select({
      id: lists.id,
      name: lists.name,
      slug: lists.slug,
      completedAt: participations.completedAt,
    })
    .from(participations)
    .innerJoin(lists, eq(lists.id, participations.sourceListId))
    .where(
      and(
        eq(participations.userId, userId),
        sql`${participations.completedAt} is not null`
      )
    )
    .orderBy(desc(participations.completedAt))
    .limit(20);

  return c.json({
    id: user.id,
    name: user.name,
    image: user.image,
    publicLists,
    completedChallenges,
  });
});

async function checkAchievements(userId: string | null | undefined) {
  if (!userId) return;
  const metrics = await computeAchievementMetrics(userId);
  const toUnlock = ACHIEVEMENT_CATALOG.filter(
    (entry) => metrics[entry.metric] >= entry.target
  ).map((entry) => ({ userId, type: entry.type }));
  if (toUnlock.length === 0) return;
  await db
    .insert(achievements)
    .values(toUnlock)
    .onConflictDoNothing({
      target: [achievements.userId, achievements.type],
    });
}

type AchievementMetric =
  | "listsOwned"
  | "itemsInOwned"
  | "publicListsOwned"
  | "participations"
  | "participationsCompleted"
  | "followers"
  | "sales";

const ACHIEVEMENT_CATALOG: {
  type: AchievementType;
  target: number;
  metric: AchievementMetric;
}[] = [
  { type: "first_list_created", target: 1, metric: "listsOwned" },
  { type: "five_lists_created", target: 5, metric: "listsOwned" },
  { type: "first_item_added", target: 1, metric: "itemsInOwned" },
  { type: "hundred_items_created", target: 100, metric: "itemsInOwned" },
  { type: "first_public_list", target: 1, metric: "publicListsOwned" },
  { type: "first_list_accepted", target: 1, metric: "participations" },
  { type: "ten_lists_accepted", target: 10, metric: "participations" },
  {
    type: "first_list_completed",
    target: 1,
    metric: "participationsCompleted",
  },
  {
    type: "five_lists_completed",
    target: 5,
    metric: "participationsCompleted",
  },
  {
    type: "ten_lists_completed",
    target: 10,
    metric: "participationsCompleted",
  },
  { type: "first_follower", target: 1, metric: "followers" },
  { type: "ten_followers", target: 10, metric: "followers" },
  { type: "first_sale", target: 1, metric: "sales" },
];

async function computeAchievementMetrics(
  userId: string
): Promise<Record<AchievementMetric, number>> {
  const ownedListIds = db
    .select({ id: lists.id })
    .from(lists)
    .where(eq(lists.ownerId, userId));
  const [
    listsOwned,
    itemsInOwned,
    publicListsOwned,
    participationsCount,
    participationsCompleted,
    followers,
    sales,
  ] = await Promise.all([
    db.$count(lists, eq(lists.ownerId, userId)),
    db.$count(items, inArray(items.listId, ownedListIds)),
    db.$count(lists, and(eq(lists.ownerId, userId), eq(lists.public, true))),
    db.$count(participations, eq(participations.userId, userId)),
    db.$count(
      participations,
      and(
        eq(participations.userId, userId),
        isNotNull(participations.completedAt)
      )
    ),
    db.$count(follows, eq(follows.followingId, userId)),
    db.$count(listPurchases, inArray(listPurchases.listId, ownedListIds)),
  ]);
  return {
    listsOwned,
    itemsInOwned,
    publicListsOwned,
    participations: participationsCount,
    participationsCompleted,
    followers,
    sales,
  };
}

app.get("/users/:userId/achievements", async (c) => {
  const userId = c.req.param("userId");
  const [metrics, unlockedRows] = await Promise.all([
    computeAchievementMetrics(userId),
    db
      .select({
        type: achievements.type,
        unlockedAt: achievements.unlockedAt,
      })
      .from(achievements)
      .where(eq(achievements.userId, userId)),
  ]);
  const unlockedMap = new Map(
    unlockedRows.map((r) => [r.type, r.unlockedAt as Date | string])
  );
  const result = ACHIEVEMENT_CATALOG.map((entry) => {
    const raw = metrics[entry.metric];
    return {
      type: entry.type,
      target: entry.target,
      progress: Math.min(raw, entry.target),
      unlockedAt: unlockedMap.get(entry.type) ?? null,
    };
  });
  return c.json({ achievements: result });
});

app.post("/users/:userId/follow", async (c) => {
  const authUser = getOptionalUser(c);
  const followerId = authUser?.session?.user?.id;
  if (!followerId) return c.json({ error: "Unauthorized" }, 401);
  const followingId = c.req.param("userId");
  if (followingId === followerId)
    return c.json({ error: "Cannot follow yourself" }, 400);
  const target = await db.query.users.findFirst({
    where: eq(users.id, followingId),
    columns: { id: true },
  });
  if (!target) return c.json({ error: "Not found" }, 404);
  await db
    .insert(follows)
    .values({ followerId, followingId })
    .onConflictDoNothing();
  const recentNotif = await db.query.notifications.findFirst({
    where: and(
      eq(notifications.userId, followingId),
      eq(notifications.type, "new_follower"),
      eq(notifications.actorId, followerId),
      gt(notifications.createdAt, new Date(Date.now() - 60 * 60 * 1000))
    ),
    columns: { id: true },
  });
  if (!recentNotif) {
    const actor = await db.query.users.findFirst({
      where: eq(users.id, followerId),
      columns: { name: true, image: true },
    });
    await createNotification({
      recipientId: followingId,
      type: "new_follower",
      actorId: followerId,
      actorName: actor?.name,
      actorImage: actor?.image,
      actionUrl: `/u/${followerId}`,
    });
  }
  await checkAchievements(followingId);
  return c.json({ following: true });
});

app.delete("/users/:userId/follow", async (c) => {
  const authUser = getOptionalUser(c);
  const followerId = authUser?.session?.user?.id;
  if (!followerId) return c.json({ error: "Unauthorized" }, 401);
  const followingId = c.req.param("userId");
  await db
    .delete(follows)
    .where(
      and(
        eq(follows.followerId, followerId),
        eq(follows.followingId, followingId)
      )
    );
  return c.json({ following: false });
});

app.get("/users/:userId/follow-status", async (c) => {
  const authUser = getOptionalUser(c);
  const viewerId = authUser?.session?.user?.id ?? null;
  const userId = c.req.param("userId");
  const [followerCount, followingCount] = await Promise.all([
    db.$count(follows, eq(follows.followingId, userId)),
    db.$count(follows, eq(follows.followerId, userId)),
  ]);
  let isFollowing = false;
  if (viewerId && viewerId !== userId) {
    const existing = await db
      .select({ id: follows.id })
      .from(follows)
      .where(
        and(eq(follows.followerId, viewerId), eq(follows.followingId, userId))
      )
      .limit(1);
    isFollowing = existing.length > 0;
  }
  return c.json({ isFollowing, followerCount, followingCount });
});

async function handleUnsubscribe(c: Context<{ Variables: Variables }>) {
  const token = c.req.query("token");
  if (!token) return c.json({ error: "missing_token" }, 400);
  const secret = process.env.AUTH_SECRET ?? "";
  const userId = await verifyUnsubscribeToken(token, secret);
  if (!userId) return c.json({ error: "invalid_token" }, 400);
  await db.update(users).set({ emailOptIn: false }).where(eq(users.id, userId));
  if (c.req.method === "POST") return c.json({ ok: true });
  return c.html(
    `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Te has dado de baja — welist</title><style>html,body{margin:0;padding:0;background:#f8f7f5;color:#0c0c0b;font-family:system-ui,-apple-system,sans-serif}main{max-width:480px;margin:80px auto;padding:0 24px;text-align:center}h1{font-size:24px;margin:0 0 12px;letter-spacing:-0.02em}p{color:#a0a09c;line-height:1.6;margin:0}</style></head><body><main><h1>Te has dado de baja</h1><p>Ya no recibirás emails de empujón. Puedes reactivarlos cuando quieras desde los ajustes de tu perfil.</p></main></body></html>`
  );
}

app.get("/unsubscribe", handleUnsubscribe);
app.post("/unsubscribe", handleUnsubscribe);

function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) =>
      (
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        }) as Record<string, string>
      )[c]
  );
}

function buildNudgeEmail(args: {
  item: string;
  listName: string;
  listLink: string;
  unsubscribeUrl: string;
}): { subject: string; html: string; text: string } {
  const subject = `welist · No olvides este ítem de ${args.listName}`;
  const text = [
    "Hola,",
    "",
    `Tienes pendiente: ${args.item}`,
    `En tu lista "${args.listName}".`,
    "",
    `Abrir la lista: ${args.listLink}`,
    "",
    `Darte de baja: ${args.unsubscribeUrl}`,
  ].join("\n");
  const html = `<!doctype html><html lang="es"><body style="margin:0;padding:0;background:#f8f7f5;color:#0c0c0b;font-family:system-ui,-apple-system,sans-serif">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8f7f5">
  <tr><td align="center" style="padding:40px 16px">
    <table role="presentation" width="480" cellspacing="0" cellpadding="0" style="max-width:480px;background:#fff;border:1px solid #ebe9e4;border-radius:16px">
      <tr><td style="padding:32px">
        <p style="margin:0 0 4px;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#a0a09c">welist</p>
        <h1 style="margin:0 0 16px;font-size:18px;font-weight:600;letter-spacing:-0.01em">No olvides este ítem</h1>
        <p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.12em;color:#a0a09c">${escapeHtml(args.listName)}</p>
        <p style="margin:0 0 24px;font-size:16px;line-height:1.5;color:#0c0c0b">${escapeHtml(args.item)}</p>
        <a href="${args.listLink}" style="display:inline-block;background:#0c0c0b;color:#f8f7f5;padding:10px 16px;border-radius:10px;text-decoration:none;font-size:13px;font-weight:600">Abrir la lista →</a>
      </td></tr>
      <tr><td style="padding:0 32px 24px;border-top:1px solid #ebe9e4">
        <p style="margin:16px 0 0;font-size:11px;color:#a0a09c">¿Demasiados emails? <a href="${args.unsubscribeUrl}" style="color:#a0a09c;text-decoration:underline">Darte de baja</a>.</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
  return { subject, html, text };
}

app.get("/cron/random-item-nudge", async (c) => {
  const auth = c.req.header("Authorization") ?? "";
  const cronSecret = process.env.CRON_SECRET ?? "";
  if (!cronSecret || auth !== `Bearer ${cronSecret}`)
    return c.json({ error: "Unauthorized" }, 401);

  const eligible = await db
    .select({ id: users.id, email: users.email, name: users.name })
    .from(users)
    .where(and(eq(users.emailOptIn, true), isNotNull(users.email)));

  const authSecret = process.env.AUTH_SECRET ?? "";
  const appUrl = process.env.APP_URL ?? "https://welist.io";
  let sent = 0;
  for (const u of eligible) {
    if (!u.email) continue;
    const [pick] = await db
      .select({
        itemId: items.id,
        itemText: items.text,
        listId: lists.id,
        listName: lists.name,
        listSlug: lists.slug,
      })
      .from(items)
      .innerJoin(lists, eq(lists.id, items.listId))
      .where(and(eq(lists.ownerId, u.id), eq(items.done, false)))
      .orderBy(sql`random()`)
      .limit(1);
    if (!pick) continue;
    const token = await signUnsubscribeToken(u.id, authSecret);
    const unsubscribeUrl = `${appUrl}/api/unsubscribe?token=${encodeURIComponent(token)}`;
    const listLink = `${appUrl}/lists/${pick.listSlug ?? pick.listId}`;
    const email = buildNudgeEmail({
      item: plainItemText(pick.itemText),
      listName: pick.listName,
      listLink,
      unsubscribeUrl,
    });
    try {
      await sendEmail({
        to: u.email,
        subject: email.subject,
        html: email.html,
        text: email.text,
        listUnsubscribeUrl: unsubscribeUrl,
      });
      sent += 1;
    } catch {
      /* skip this user, continue */
    }
  }
  return c.json({ sent });
});

app.get("/explore/:listId", async (c) => {
  const listId = c.req.param("listId");
  const list = await db.query.lists.findFirst({
    where: listWhere(listId),
    columns: {
      id: true,
      name: true,
      slug: true,
      description: true,
      public: true,
      createdAt: true,
      ownerId: true,
    },
  });
  if (!list?.public) return c.json({ error: "Not found" }, 404);

  const [stats] = await db
    .select({
      itemCount: sql<number>`cast((select count(*) from ${items} where ${items.listId} = ${lists.id}) as int)`,
      ownerName: users.name,
      ownerImage: users.image,
    })
    .from(lists)
    .leftJoin(users, eq(users.id, lists.ownerId))
    .where(eq(lists.id, list.id))
    .groupBy(lists.id, users.name, users.image);

  const totalItems = await db.$count(items, eq(items.listId, list.id));

  const challengerRows = await db
    .select({
      id: users.id,
      name: users.name,
      image: users.image,
      completedAt: participations.completedAt,
      doneCount: sql<number>`cast(coalesce((select count(*) from ${itemProgress} where ${itemProgress.userId} = ${users.id} and ${itemProgress.itemId} in (select id from ${items} where ${items.listId} = ${list.id}) and ${itemProgress.done} = true), 0) as int)`,
    })
    .from(participations)
    .innerJoin(users, eq(users.id, participations.userId))
    .where(
      and(
        eq(participations.sourceListId, list.id),
        eq(participations.role, "challenger")
      )
    );

  const challengers = challengerRows.map((r) => ({ ...r, totalItems }));

  const totalParticipants = await db
    .select({ count: countDistinct(participations.userId) })
    .from(participations)
    .where(eq(participations.sourceListId, list.id));

  const completedRows = await db
    .select({
      name: users.name,
      image: users.image,
      completedAt: participations.completedAt,
    })
    .from(participations)
    .leftJoin(users, eq(users.id, participations.userId))
    .where(
      and(
        eq(participations.sourceListId, list.id),
        sql`${participations.completedAt} is not null`
      )
    )
    .orderBy(participations.completedAt)
    .limit(20);

  const owner =
    stats?.ownerName || stats?.ownerImage
      ? { name: stats.ownerName, image: stats.ownerImage }
      : null;

  return c.json({
    id: list.id,
    name: list.name,
    slug: list.slug,
    description: list.description,
    createdAt: list.createdAt,
    ownerId: list.ownerId,
    owner,
    itemCount: stats?.itemCount ?? 0,
    participantCount: totalParticipants[0]?.count ?? 0,
    challengers,
    completedParticipants: completedRows,
  });
});

app.get("/explore/:listId/items", async (c) => {
  const listId = c.req.param("listId");
  const list = await db.query.lists.findFirst({
    where: listWhere(listId),
    columns: { id: true, public: true },
  });
  if (!list?.public) return c.json({ error: "Not found" }, 404);
  const rows = await db.query.items.findMany({
    where: eq(items.listId, list.id),
    orderBy: (t, { asc }) => [asc(t.position), asc(t.createdAt)],
  });
  return c.json(rows.map(({ done: _done, ...item }) => item));
});

app.post("/lists/:listId/clone", async (c) => {
  const listId = c.req.param("listId");
  const source = await db.query.lists.findFirst({
    where: listWhere(listId),
  });
  if (!source) return c.json({ error: "Not found" }, 404);

  const sourceItems = await db.query.items.findMany({
    where: eq(items.listId, source.id),
    orderBy: (t, { asc }) => [asc(t.position), asc(t.createdAt)],
  });

  const [newList] = await db
    .insert(lists)
    .values({ name: source.name })
    .returning();

  if (sourceItems.length > 0) {
    await db.insert(items).values(
      sourceItems.map((item, i) => ({
        listId: newList.id,
        text: item.text,
        done: false,
        position: i,
      }))
    );
  }

  return c.json(newList, 201);
});

app.delete("/lists/:listId", async (c) => {
  const listId = c.req.param("listId");
  const list = await db.query.lists.findFirst({
    where: listWhere(listId),
    columns: { id: true, ownerId: true },
  });
  if (!list) return c.json({ error: "Not found" }, 404);
  const authUser = getOptionalUser(c);
  const userId = authUser?.session?.user?.id ?? null;
  if (!userId) return c.json({ error: "Forbidden" }, 403);
  if (list.ownerId !== userId) {
    const participation = await getParticipation(list.id, userId);
    if (!participation) return c.json({ error: "Forbidden" }, 403);
    await db
      .delete(participations)
      .where(
        and(
          eq(participations.sourceListId, list.id),
          eq(participations.userId, userId)
        )
      );
    return c.body(null, 204);
  }
  await db.delete(lists).where(eq(lists.id, list.id));
  return c.body(null, 204);
});

app.post("/lists/:listId/accept", async (c) => {
  const authUser = getOptionalUser(c);
  const userId = authUser?.session?.user?.id;
  if (!userId) return c.json({ error: "Unauthorized" }, 401);

  const listId = c.req.param("listId");
  const source = await db.query.lists.findFirst({
    where: listWhere(listId),
  });
  if (!source) return c.json({ error: "Not found" }, 404);
  if (!source.public) return c.json({ error: "Forbidden" }, 403);
  if (source.ownerId === userId)
    return c.json({ error: "Cannot accept your own list" }, 409);

  const existing = await getParticipation(source.id, userId);
  if (existing) return c.json({ error: "Already participating" }, 409);

  await db.insert(participations).values({
    sourceListId: source.id,
    userId,
    role: "challenger",
  });
  await logActivity(source.id, userId, "challenge_accepted");

  await checkAchievements(userId);

  if (source.ownerId) {
    const actor = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { name: true, image: true },
    });
    await createNotification({
      recipientId: source.ownerId,
      type: "challenge_accepted",
      listId: source.id,
      listName: source.name,
      actorId: userId,
      actorName: actor?.name,
      actorImage: actor?.image,
    });
  }

  return c.json(source, 201);
});

app.get("/lists/:listId/active-participants", async (c) => {
  const list = await resolveList(c.req.param("listId"));
  if (!list) return c.json({ error: "Not found" }, 404);
  const authUser = getOptionalUser(c);
  const userId = authUser?.session?.user?.id ?? null;
  if (!(await canViewList(list, userId)))
    return c.json({ error: "Not found" }, 404);

  const participationsCount = await db.$count(
    participations,
    eq(participations.sourceListId, list.id)
  );
  const owner = list.ownerId
    ? await db.query.users.findFirst({
        where: eq(users.id, list.ownerId),
        columns: { id: true, name: true, image: true },
      })
    : null;
  const ownerSlots = owner ? 1 : 0;
  const participantsRows = await db
    .select({
      id: users.id,
      name: users.name,
      image: users.image,
    })
    .from(participations)
    .innerJoin(users, eq(participations.userId, users.id))
    .where(eq(participations.sourceListId, list.id))
    .orderBy(desc(participations.createdAt))
    .limit(5 - ownerSlots);
  const filteredParticipants = owner
    ? participantsRows.filter((p) => p.id !== owner.id)
    : participantsRows;
  const total = participationsCount + ownerSlots;
  const participantsList = owner
    ? [owner, ...filteredParticipants].slice(0, 5)
    : participantsRows;
  return c.json({ participants: participantsList, total });
});

app.get("/lists/:listId/collaborators", async (c) => {
  const authUser = getOptionalUser(c);
  const userId = authUser?.session?.user?.id;
  if (!userId) return c.json({ error: "Unauthorized" }, 401);
  const list = await db.query.lists.findFirst({
    where: listWhere(c.req.param("listId")),
    columns: { id: true, ownerId: true },
  });
  if (!list) return c.json({ error: "Not found" }, 404);
  if (list.ownerId !== userId) return c.json({ error: "Forbidden" }, 403);
  const [totalItems, rows, progressCounts] = await Promise.all([
    db.$count(items, eq(items.listId, list.id)),
    db
      .select({
        id: users.id,
        name: users.name,
        image: users.image,
        role: participations.role,
        completedAt: participations.completedAt,
      })
      .from(participations)
      .innerJoin(users, eq(participations.userId, users.id))
      .where(eq(participations.sourceListId, list.id)),
    db
      .select({
        userId: itemProgress.userId,
        count: sql<number>`cast(count(*) as int)`,
      })
      .from(itemProgress)
      .innerJoin(items, eq(items.id, itemProgress.itemId))
      .where(and(eq(items.listId, list.id), eq(itemProgress.done, true)))
      .groupBy(itemProgress.userId),
  ]);
  const doneCountByUser = new Map(
    progressCounts.map((p) => [p.userId, p.count])
  );
  const collaborators = rows
    .filter((r) => r.role === "collaborator")
    .map(({ role: _, completedAt: __, ...rest }) => rest);
  const challengers = rows
    .filter((r) => r.role === "challenger")
    .map(({ role: _, ...rest }) => ({
      ...rest,
      doneCount: doneCountByUser.get(rest.id) ?? 0,
      totalItems,
    }));
  return c.json({ collaborators, challengers });
});

app.post(
  "/lists/:listId/collaborators",
  zValidator("json", z.object({ userId: z.string().min(1) })),
  async (c) => {
    const authUser = getOptionalUser(c);
    const viewerId = authUser?.session?.user?.id;
    if (!viewerId) return c.json({ error: "Unauthorized" }, 401);

    const list = await db.query.lists.findFirst({
      where: listWhere(c.req.param("listId")),
      columns: { id: true, name: true, ownerId: true, collaborative: true },
    });
    if (!list) return c.json({ error: "Not found" }, 404);
    if (list.ownerId !== viewerId) return c.json({ error: "Forbidden" }, 403);
    if (!list.collaborative)
      return c.json({ error: "list_not_collaborative" }, 400);

    const { userId } = c.req.valid("json");
    if (userId === list.ownerId)
      return c.json({ error: "owner_cannot_be_collaborator" }, 400);

    const target = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { id: true },
    });
    if (!target) return c.json({ error: "user_not_found" }, 404);

    const existing = await getParticipation(list.id, userId);
    if (existing?.role === "collaborator") return c.body(null, 204);

    if (existing) {
      await db
        .update(participations)
        .set({ role: "collaborator" })
        .where(eq(participations.id, existing.id));
    } else {
      await db.insert(participations).values({
        sourceListId: list.id,
        userId,
        role: "collaborator",
      });
    }

    const actor = await db.query.users.findFirst({
      where: eq(users.id, viewerId),
      columns: { name: true, image: true },
    });
    await createNotification({
      recipientId: userId,
      type: "added_as_collaborator",
      listId: list.id,
      listName: list.name,
      actorId: viewerId,
      actorName: actor?.name,
      actorImage: actor?.image,
    });

    return c.body(null, 204);
  }
);

app.delete("/lists/:listId/collaborators/:userId", async (c) => {
  const authUser = getOptionalUser(c);
  const viewerId = authUser?.session?.user?.id;
  if (!viewerId) return c.json({ error: "Unauthorized" }, 401);

  const list = await db.query.lists.findFirst({
    where: listWhere(c.req.param("listId")),
    columns: { id: true, ownerId: true },
  });
  if (!list) return c.json({ error: "Not found" }, 404);
  if (list.ownerId !== viewerId) return c.json({ error: "Forbidden" }, 403);

  const targetId = c.req.param("userId");
  if (targetId === list.ownerId)
    return c.json({ error: "cannot_remove_owner" }, 400);

  await db
    .delete(participations)
    .where(
      and(
        eq(participations.sourceListId, list.id),
        eq(participations.userId, targetId),
        eq(participations.role, "collaborator")
      )
    );

  return c.body(null, 204);
});

app.get("/lists/:listId/activity", async (c) => {
  const authUser = getOptionalUser(c);
  const userId = authUser?.session?.user?.id;
  if (!userId) return c.json({ error: "Unauthorized" }, 401);
  const list = await db.query.lists.findFirst({
    where: listWhere(c.req.param("listId")),
    columns: { id: true, ownerId: true },
  });
  if (!list) return c.json({ error: "Not found" }, 404);
  if (list.ownerId !== userId) return c.json({ error: "Forbidden" }, 403);
  const rows = await db
    .select({
      id: listActivity.id,
      action: listActivity.action,
      itemId: listActivity.itemId,
      previousValue: listActivity.previousValue,
      newValue: listActivity.newValue,
      createdAt: listActivity.createdAt,
      userName: users.name,
      userImage: users.image,
    })
    .from(listActivity)
    .leftJoin(users, eq(users.id, listActivity.userId))
    .where(eq(listActivity.listId, list.id))
    .orderBy(desc(listActivity.createdAt))
    .limit(100);
  return c.json(rows);
});

app.get("/lists/:listId/participation", async (c) => {
  const authUser = getOptionalUser(c);
  const userId = authUser?.session?.user?.id;
  if (!userId)
    return c.json({
      participated: false,
      completedAt: null,
    });
  const list = await resolveList(c.req.param("listId"));
  if (!list) return c.json({ error: "Not found" }, 404);
  const participation = await getParticipation(list.id, userId);
  return c.json({
    participated: !!participation,
    completedAt: participation?.completedAt ?? null,
  });
});

function getStripe(c: Context) {
  const key = c.env?.STRIPE_SECRET_KEY ?? process.env.STRIPE_SECRET_KEY ?? "";
  return new Stripe(key);
}

function getStripeWebhookSecret(c: Context) {
  return (
    c.env?.STRIPE_WEBHOOK_SECRET ?? process.env.STRIPE_WEBHOOK_SECRET ?? ""
  );
}

async function hasPurchased(userId: string, listId: string): Promise<boolean> {
  const purchase = await db.query.listPurchases.findFirst({
    where: and(
      eq(listPurchases.buyerId, userId),
      eq(listPurchases.listId, listId)
    ),
    columns: { id: true },
  });
  return !!purchase;
}

app.post("/stripe/connect", async (c) => {
  const authUser = getOptionalUser(c);
  const userId = authUser?.session?.user?.id;
  if (!userId) return c.json({ error: "Unauthorized" }, 401);

  const stripe = getStripe(c);
  const appUrl = process.env.APP_URL ?? "http://localhost:5173";

  const existing = await db.query.stripeAccounts.findFirst({
    where: eq(stripeAccounts.userId, userId),
    columns: {
      stripeAccountId: true,
      onboardingComplete: true,
    },
  });

  let accountId: string;
  if (existing) {
    accountId = existing.stripeAccountId;
  } else {
    const account = await stripe.accounts.create({
      type: "express",
    });
    accountId = account.id;
    await db
      .insert(stripeAccounts)
      .values({ userId, stripeAccountId: accountId });
  }

  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${appUrl}/settings?stripe=refresh`,
    return_url: `${appUrl}/settings?stripe=success`,
    type: "account_onboarding",
  });

  return c.json({ url: link.url });
});

app.get("/stripe/account-status", async (c) => {
  const authUser = getOptionalUser(c);
  const userId = authUser?.session?.user?.id;
  if (!userId)
    return c.json({
      connected: false,
      onboardingComplete: false,
    });

  const record = await db.query.stripeAccounts.findFirst({
    where: eq(stripeAccounts.userId, userId),
    columns: {
      stripeAccountId: true,
      onboardingComplete: true,
    },
  });
  if (!record)
    return c.json({
      connected: false,
      onboardingComplete: false,
    });

  if (!record.onboardingComplete) {
    const stripe = getStripe(c);
    const account = await stripe.accounts.retrieve(record.stripeAccountId);
    if (account.details_submitted) {
      await db
        .update(stripeAccounts)
        .set({ onboardingComplete: true })
        .where(eq(stripeAccounts.userId, userId));
      return c.json({
        connected: true,
        onboardingComplete: true,
      });
    }
    return c.json({
      connected: true,
      onboardingComplete: false,
    });
  }

  return c.json({
    connected: true,
    onboardingComplete: true,
  });
});

app.get("/lists/:listId/price", async (c) => {
  const authUser = getOptionalUser(c);
  const userId = authUser?.session?.user?.id;
  if (!userId) return c.json({ error: "Unauthorized" }, 401);

  const list = await db.query.lists.findFirst({
    where: listWhere(c.req.param("listId")),
    columns: { id: true, ownerId: true },
  });
  if (!list) return c.json({ error: "Not found" }, 404);
  if (list.ownerId !== userId) return c.json({ error: "Forbidden" }, 403);

  const price = await db.query.listPrices.findFirst({
    where: eq(listPrices.listId, list.id),
    columns: { priceInCents: true, currency: true },
  });
  return c.json(price ?? null);
});

app.post(
  "/lists/:listId/price",
  zValidator(
    "json",
    z.object({
      priceInCents: z.number().int().min(100).max(100_000),
    })
  ),
  async (c) => {
    const authUser = getOptionalUser(c);
    const userId = authUser?.session?.user?.id;
    if (!userId) return c.json({ error: "Unauthorized" }, 401);

    const list = await db.query.lists.findFirst({
      where: listWhere(c.req.param("listId")),
      columns: { id: true, ownerId: true },
    });
    if (!list) return c.json({ error: "Not found" }, 404);
    if (list.ownerId !== userId) return c.json({ error: "Forbidden" }, 403);

    const stripeAccount = await db.query.stripeAccounts.findFirst({
      where: and(
        eq(stripeAccounts.userId, userId),
        eq(stripeAccounts.onboardingComplete, true)
      ),
      columns: { id: true },
    });
    if (!stripeAccount) return c.json({ error: "stripe_not_connected" }, 400);

    const { priceInCents } = c.req.valid("json");
    const [price] = await db
      .insert(listPrices)
      .values({ listId: list.id, priceInCents })
      .onConflictDoUpdate({
        target: listPrices.listId,
        set: { priceInCents, updatedAt: new Date() },
      })
      .returning();

    return c.json(price);
  }
);

app.delete("/lists/:listId/price", async (c) => {
  const authUser = getOptionalUser(c);
  const userId = authUser?.session?.user?.id;
  if (!userId) return c.json({ error: "Unauthorized" }, 401);

  const list = await db.query.lists.findFirst({
    where: listWhere(c.req.param("listId")),
    columns: { id: true, ownerId: true },
  });
  if (!list) return c.json({ error: "Not found" }, 404);
  if (list.ownerId !== userId) return c.json({ error: "Forbidden" }, 403);

  await db.delete(listPrices).where(eq(listPrices.listId, list.id));
  return c.body(null, 204);
});

app.post(
  "/lists/:listId/rating",
  zValidator("json", z.object({ value: z.number().int().min(1).max(5) })),
  async (c) => {
    const authUser = getOptionalUser(c);
    const userId = authUser?.session?.user?.id;
    if (!userId) return c.json({ error: "Unauthorized" }, 401);

    const list = await db.query.lists.findFirst({
      where: listWhere(c.req.param("listId")),
      columns: {
        id: true,
        ownerId: true,
        public: true,
        collaborative: true,
      },
    });
    if (!list) return c.json({ error: "Not found" }, 404);
    if (!(await canViewList(list, userId)))
      return c.json({ error: "Not found" }, 404);

    const { value } = c.req.valid("json");
    const [rating] = await db
      .insert(listRatings)
      .values({ userId, listId: list.id, value })
      .onConflictDoUpdate({
        target: [listRatings.userId, listRatings.listId],
        set: { value, updatedAt: new Date() },
      })
      .returning();

    return c.json(rating);
  }
);

app.delete("/lists/:listId/rating", async (c) => {
  const authUser = getOptionalUser(c);
  const userId = authUser?.session?.user?.id;
  if (!userId) return c.json({ error: "Unauthorized" }, 401);

  const list = await db.query.lists.findFirst({
    where: listWhere(c.req.param("listId")),
    columns: { id: true },
  });
  if (!list) return c.body(null, 204);

  await db
    .delete(listRatings)
    .where(
      and(eq(listRatings.userId, userId), eq(listRatings.listId, list.id))
    );
  return c.body(null, 204);
});

app.post("/lists/:listId/checkout", async (c) => {
  const authUser = getOptionalUser(c);
  const userId = authUser?.session?.user?.id;
  if (!userId) return c.json({ error: "Unauthorized" }, 401);

  const listParam = c.req.param("listId");
  const list = await db.query.lists.findFirst({
    where: listWhere(listParam),
    columns: {
      id: true,
      ownerId: true,
      name: true,
      public: true,
    },
  });
  if (!list) return c.json({ error: "Not found" }, 404);
  if (list.ownerId === userId)
    return c.json({ error: "Cannot buy your own list" }, 409);

  const alreadyPurchased = await hasPurchased(userId, list.id);
  if (alreadyPurchased) return c.json({ error: "Already purchased" }, 409);

  const price = await db.query.listPrices.findFirst({
    where: eq(listPrices.listId, list.id),
    columns: { priceInCents: true, currency: true },
  });
  if (!price) return c.json({ error: "List is not for sale" }, 400);

  const sellerAccount = await db.query.stripeAccounts.findFirst({
    where: and(
      // biome-ignore lint/style/noNonNullAssertion: list.ownerId guaranteed by prior list query
      eq(stripeAccounts.userId, list.ownerId!),
      eq(stripeAccounts.onboardingComplete, true)
    ),
    columns: { stripeAccountId: true },
  });
  if (!sellerAccount) return c.json({ error: "Seller not configured" }, 400);

  const stripe = getStripe(c);
  const appFeeAmount = Math.round(price.priceInCents * 0.1);

  const paymentIntent = await stripe.paymentIntents.create({
    amount: price.priceInCents,
    currency: price.currency,
    application_fee_amount: appFeeAmount,
    transfer_data: {
      destination: sellerAccount.stripeAccountId,
    },
    metadata: { listId: list.id, buyerId: userId },
  });

  return c.json({
    clientSecret: paymentIntent.client_secret,
  });
});

app.post("/stripe/webhook", async (c) => {
  const stripe = getStripe(c);
  const sig = c.req.header("stripe-signature") ?? "";
  const webhookSecret = getStripeWebhookSecret(c);
  const body = await c.req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig, webhookSecret);
  } catch {
    return c.json({ error: "Invalid signature" }, 400);
  }

  if (event.type === "payment_intent.succeeded") {
    const intent = event.data.object as Stripe.PaymentIntent;
    const { listId, buyerId } = intent.metadata;
    if (listId && buyerId) {
      await db
        .insert(listPurchases)
        .values({
          buyerId,
          listId,
          stripePaymentIntentId: intent.id,
        })
        .onConflictDoNothing();
      const soldList = await db.query.lists.findFirst({
        where: eq(lists.id, listId),
        columns: { ownerId: true, name: true },
      });
      if (soldList?.ownerId) {
        const buyer = await db.query.users.findFirst({
          where: eq(users.id, buyerId),
          columns: { name: true, image: true },
        });
        await createNotification({
          recipientId: soldList.ownerId,
          type: "list_purchased",
          listId,
          listName: soldList.name,
          actorId: buyerId,
          actorName: buyer?.name,
          actorImage: buyer?.image,
          actionUrl: `/lists/${listId}`,
        });
      }
      await checkAchievements(soldList?.ownerId);
    }
  }

  return c.json({ received: true });
});

app.get("/lists/:listId/purchase-status", async (c) => {
  const authUser = getOptionalUser(c);
  const userId = authUser?.session?.user?.id;
  if (!userId) return c.json({ purchased: false });

  const list = await resolveList(c.req.param("listId"));
  if (!list) return c.json({ error: "Not found" }, 404);

  const purchased = await hasPurchased(userId, list.id);
  return c.json({ purchased });
});

function checkAdminAuth(c: Context): boolean {
  const header = c.req.header("Authorization") ?? "";
  if (!header.startsWith("Basic ")) return false;
  const decoded = atob(header.slice(6));
  const [, password] = decoded.split(":");
  const adminPassword = c.env?.ADMIN_PASSWORD ?? process.env.ADMIN_PASSWORD;
  return !!adminPassword && password === adminPassword;
}

app.get("/notifications", async (c) => {
  const authUser = getOptionalUser(c);
  const userId = authUser?.session?.user?.id;
  if (!userId) return c.json({ error: "Unauthorized" }, 401);

  const rows = await db.query.notifications.findMany({
    where: eq(notifications.userId, userId),
    orderBy: (t, { desc: d }) => [d(t.createdAt)],
    limit: 30,
  });

  return c.json(rows);
});

app.patch("/notifications/:id/read", async (c) => {
  const authUser = getOptionalUser(c);
  const userId = authUser?.session?.user?.id;
  if (!userId) return c.json({ error: "Unauthorized" }, 401);

  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(notifications.id, c.req.param("id")),
        eq(notifications.userId, userId)
      )
    );

  return c.body(null, 204);
});

app.patch("/notifications/read-all", async (c) => {
  const authUser = getOptionalUser(c);
  const userId = authUser?.session?.user?.id;
  if (!userId) return c.json({ error: "Unauthorized" }, 401);

  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(notifications.userId, userId),
        sql`${notifications.readAt} is null`
      )
    );

  return c.body(null, 204);
});

const eventInputSchema = z.object({
  type: z.string().min(1).max(64),
  listId: z.string().optional(),
  itemId: z.string().optional(),
  sessionId: z.string().max(64).optional(),
  metadata: z.record(z.unknown()).optional(),
});

app.post(
  "/events",
  zValidator(
    "json",
    z.object({
      events: z.array(eventInputSchema).min(1).max(50),
    })
  ),
  async (c) => {
    const authUser = getOptionalUser(c);
    const userId = authUser?.session?.user?.id ?? null;
    const { events: batch } = c.req.valid("json");

    await db.insert(events).values(
      batch.map((e) => ({
        userId,
        sessionId: e.sessionId ?? null,
        type: e.type,
        listId: e.listId ?? null,
        itemId: e.itemId ?? null,
        metadata: e.metadata ?? null,
      }))
    );

    return c.body(null, 204);
  }
);

app.get("/admin/stats", async (c) => {
  if (!checkAdminAuth(c)) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const [userCount, listCount, itemCount, participationCount, purchaseCount] =
    await Promise.all([
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(users)
        .then(([r]) => r?.count ?? 0),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(lists)
        .then(([r]) => r?.count ?? 0),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(items)
        .then(([r]) => r?.count ?? 0),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(participations)
        .then(([r]) => r?.count ?? 0),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(listPurchases)
        .then(([r]) => r?.count ?? 0),
    ]);

  const topLists = await db
    .select({
      id: lists.id,
      name: lists.name,
      slug: lists.slug,
      participations: sql<number>`count(${participations.id})::int`,
    })
    .from(lists)
    .leftJoin(participations, eq(participations.sourceListId, lists.id))
    .groupBy(lists.id)
    .orderBy(desc(sql`count(${participations.id})`))
    .limit(10);

  const weeklyLists = await db
    .select({
      week: sql<string>`to_char(date_trunc('week', ${lists.createdAt}), 'YYYY-MM-DD')`,
      count: sql<number>`count(*)::int`,
    })
    .from(lists)
    .where(gt(lists.createdAt, sql`now() - interval '8 weeks'`))
    .groupBy(sql`date_trunc('week', ${lists.createdAt})`)
    .orderBy(sql`date_trunc('week', ${lists.createdAt})`);

  const revenueRow = await db
    .select({
      total: sql<number>`coalesce(sum(${listPrices.priceInCents}), 0)::int`,
    })
    .from(listPurchases)
    .leftJoin(listPrices, eq(listPrices.listId, listPurchases.listId));

  return c.json({
    users: userCount,
    lists: listCount,
    items: itemCount,
    participations: participationCount,
    purchases: purchaseCount,
    topLists,
    weeklyLists,
    revenue: revenueRow[0]?.total ?? 0,
  });
});
