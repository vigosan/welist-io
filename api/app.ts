import { Hono, type Context } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, max, sql, and, or, ilike, gt, lt, inArray, desc, countDistinct } from "drizzle-orm";
import { db } from "../src/db/client.js";
import { lists, items, participations, itemProgress, listActivity, users, stripeAccounts, listPrices, listPurchases } from "../src/db/schema/index.js";
import { rateLimit } from "./rate-limit.js";
import { authHandler, initAuthConfig, getAuthUser } from "@hono/auth-js";
import Google from "@auth/core/providers/google";
import type { AuthUser } from "@hono/auth-js";
import Stripe from "stripe";

type Variables = { authUser: AuthUser | null };

export const app = new Hono<{ Variables: Variables }>().basePath("/api");

app.use(rateLimit({ limit: 120, windowMs: 60_000 }));

app.use(
  "*",
  initAuthConfig((c) => ({
    secret: c.env?.AUTH_SECRET ?? process.env.AUTH_SECRET ?? "",
    basePath: "/api/auth",
    providers: [
      Google({
        clientId: c.env?.GOOGLE_CLIENT_ID ?? process.env.GOOGLE_CLIENT_ID ?? "",
        clientSecret: c.env?.GOOGLE_CLIENT_SECRET ?? process.env.GOOGLE_CLIENT_SECRET ?? "",
      }),
    ],
    session: { strategy: "jwt" },
    callbacks: {
      async signIn({ user, account }) {
        if (!user.email || !account) return true;
        const existing = await db.query.users.findFirst({ where: eq(users.email, user.email), columns: { id: true } });
        if (!existing) {
          const [created] = await db.insert(users).values({ id: user.id!, name: user.name, email: user.email, image: user.image }).returning({ id: users.id });
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
  })),
);

app.use("/auth/*", authHandler());

app.use("*", async (c, next) => {
  try {
    const authUser = await getAuthUser(c);
    c.set("authUser", authUser);
  } catch {
    c.set("authUser", null);
  }
  await next();
});

function getOptionalUser(c: Context<{ Variables: Variables }>): AuthUser | null {
  return c.get("authUser") ?? null;
}

app.get("/me", (c) => {
  const authUser = getOptionalUser(c);
  return c.json(authUser?.session?.user ?? null);
});

function isUniqueViolation(e: unknown): boolean {
  if (typeof e !== "object" || e === null || !("code" in e)) return false;
  const { code } = e as { code: unknown };
  return code === "23505";
}

async function canViewList(list: { id?: string; ownerId: string | null; public: boolean; collaborative: boolean }, userId: string | null): Promise<boolean> {
  if (list.public || list.collaborative || (userId !== null && list.ownerId === userId)) return true;
  if (userId && list.id) return hasPurchased(userId, list.id);
  return false;
}

function canModifyList(list: { ownerId: string | null; collaborative: boolean }, userId: string | null): boolean {
  return list.ownerId === null || list.ownerId === userId || list.collaborative;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function listWhere(param: string) {
  return UUID_RE.test(param)
    ? or(eq(lists.id, param), eq(lists.slug, param))
    : eq(lists.slug, param);
}

async function resolveList(param: string): Promise<{ id: string; ownerId: string | null; collaborative: boolean; public: boolean } | null> {
  const list = await db.query.lists.findFirst({
    where: listWhere(param),
    columns: { id: true, ownerId: true, collaborative: true, public: true },
  });
  return list ?? null;
}

async function getParticipation(sourceListId: string, userId: string) {
  return db.query.participations.findFirst({
    where: and(eq(participations.sourceListId, sourceListId), eq(participations.userId, userId)),
    columns: { id: true, completedAt: true },
  });
}

async function logActivity(
  listId: string,
  userId: string | null,
  action: "item_added" | "item_edited" | "item_deleted" | "challenge_accepted" | "challenge_completed",
  itemId?: string,
  previousValue?: unknown,
  newValue?: unknown,
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
    const { name } = c.req.valid("json");
    const authUser = getOptionalUser(c);
    const ownerId = authUser?.session?.user?.id ?? null;
    const [list] = await db.insert(lists).values({ name, ownerId }).returning();
    return c.json(list, 201);
  },
);

app.get("/my-lists", async (c) => {
  const authUser = getOptionalUser(c);
  const userId = authUser?.session?.user?.id ?? null;
  if (!userId) return c.json({ error: "Unauthorized" }, 401);
  const cursor = c.req.query("cursor");
  const q = c.req.query("q")?.trim();
  const sort = c.req.query("sort") ?? "recent";
  const visibility = c.req.query("visibility");
  const visibilityFilter = visibility === "public" ? eq(lists.public, true)
    : visibility === "private" ? eq(lists.public, false)
    : undefined;
  const participated = await db
    .select({ sourceListId: participations.sourceListId })
    .from(participations)
    .where(eq(participations.userId, userId));
  const participatedIds = participated
    .map(p => p.sourceListId)
    .filter((id): id is string => id !== null);
  const ownerOrParticipant = participatedIds.length > 0
    ? or(eq(lists.ownerId, userId), inArray(lists.id, participatedIds))
    : eq(lists.ownerId, userId);
  const baseWhere = and(
    ownerOrParticipant,
    q ? ilike(lists.name, `%${q}%`) : undefined,
    visibilityFilter,
  );

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
      })
      .from(lists)
      .leftJoin(items, eq(items.listId, lists.id))
      .where(baseWhere)
      .groupBy(lists.id)
      .having(cursor ? lt(activityExpr, new Date(cursor)) : undefined)
      .orderBy(desc(activityExpr))
      .limit(MY_LISTS_PAGE_SIZE);
    const nextCursor = rows.length === MY_LISTS_PAGE_SIZE
      ? new Date(rows[rows.length - 1].lastActivity).toISOString()
      : null;
    return c.json({ items: rows.map(({ lastActivity: _la, ...list }) => list), nextCursor });
  }

  const isAsc = sort === "created_asc";
  const where = cursor
    ? and(baseWhere, isAsc ? gt(lists.createdAt, new Date(cursor)) : lt(lists.createdAt, new Date(cursor)))
    : baseWhere;
  const rows = await db.query.lists.findMany({
    where,
    orderBy: (t, { asc, desc }) => [isAsc ? asc(t.createdAt) : desc(t.createdAt)],
    limit: MY_LISTS_PAGE_SIZE,
  });
  const nextCursor = rows.length === MY_LISTS_PAGE_SIZE
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
  if (!await canViewList(list, userId)) return c.json({ error: "Not found" }, 404);
  if (userId && list.collaborative && list.ownerId !== userId) {
    await db.insert(participations).values({ sourceListId: list.id, userId }).onConflictDoNothing();
  }
  const participation = userId
    ? await getParticipation(list.id, userId)
    : null;
  return c.json({ ...list, participated: !!participation, participationCompletedAt: participation?.completedAt ?? null });
});

app.patch(
  "/lists/:listId",
  zValidator("json", z.object({
    name: z.string().min(1).max(200).optional(),
    slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/).optional().nullable(),
    description: z.string().max(500).optional().nullable(),
    public: z.boolean().optional(),
    collaborative: z.boolean().optional(),
  })),
  async (c) => {
    const listId = c.req.param("listId");
    const body = c.req.valid("json");
    const list = await db.query.lists.findFirst({ where: listWhere(listId) });
    if (!list) return c.json({ error: "Not found" }, 404);
    const authUser = getOptionalUser(c);
    const userId = authUser?.session?.user?.id ?? null;
    if (list.ownerId !== null && list.ownerId !== userId) return c.json({ error: "Forbidden" }, 403);
    const patch: Record<string, unknown> = {};
    if (body.name !== undefined) patch.name = body.name;
    if ("slug" in body) patch.slug = body.slug ?? null;
    if ("description" in body) patch.description = body.description ?? null;
    if (body.public !== undefined) patch.public = body.public;
    if (body.collaborative !== undefined) patch.collaborative = body.collaborative;
    try {
      const [updated] = await db
        .update(lists)
        .set(patch)
        .where(eq(lists.id, list.id))
        .returning();
      if (!updated) return c.json({ error: "Not found" }, 404);
      return c.json(updated);
    } catch (e: unknown) {
      if (isUniqueViolation(e)) return c.json({ error: "slug_taken" }, 409);
      throw e;
    }
  },
);

app.get("/lists/:listId/items", async (c) => {
  const list = await resolveList(c.req.param("listId"));
  if (!list) return c.json({ error: "Not found" }, 404);
  const authUser = getOptionalUser(c);
  const userId = authUser?.session?.user?.id ?? null;
  if (!await canViewList(list, userId)) return c.json({ error: "Not found" }, 404);
  const isOwner = list.ownerId === null || list.ownerId === userId;
  const participation = userId && list.public && !isOwner
    ? await getParticipation(list.id, userId)
    : null;

  const rows = await db.query.items.findMany({
    where: eq(items.listId, list.id),
    orderBy: (t, { asc }) => [asc(t.position), asc(t.createdAt)],
  });

  if (!participation) return c.json(rows);

  const progressRows = await db.query.itemProgress.findMany({
    where: and(
      eq(itemProgress.userId, userId!),
      inArray(itemProgress.itemId, rows.map((r) => r.id)),
    ),
    columns: { itemId: true, done: true },
  });
  const progressMap = new Map(progressRows.map((p) => [p.itemId, p.done]));
  return c.json(rows.map((item) => ({ ...item, done: progressMap.get(item.id) ?? false })));
});

app.post(
  "/lists/:listId/items",
  zValidator("json", z.object({ text: z.string().min(1).max(1000) })),
  async (c) => {
    const list = await resolveList(c.req.param("listId"));
    if (!list) return c.json({ error: "Not found" }, 404);
    const authUser = getOptionalUser(c);
    const userId = authUser?.session?.user?.id ?? null;
    if (!canModifyList(list, userId)) return c.json({ error: "Forbidden" }, 403);
    const { text } = c.req.valid("json");
    const [maxRow] = await db.select({ pos: max(items.position) }).from(items).where(eq(items.listId, list.id));
    const position = (maxRow?.pos ?? -1) + 1;
    const [item] = await db.insert(items).values({ listId: list.id, text, position }).returning();
    if (list.public && list.collaborative && userId) {
      await logActivity(list.id, userId, "item_added", item.id, null, { text });
    }
    return c.json(item, 201);
  },
);

app.patch(
  "/lists/:listId/items/reorder",
  zValidator("json", z.object({ ids: z.array(z.string().uuid()).min(1).max(500) })),
  async (c) => {
    const list = await resolveList(c.req.param("listId"));
    if (!list) return c.json({ error: "Not found" }, 404);
    const authUser = getOptionalUser(c);
    const userId = authUser?.session?.user?.id ?? null;
    if (!canModifyList(list, userId)) return c.json({ error: "Forbidden" }, 403);
    const { ids } = c.req.valid("json");
    await Promise.all(
      ids.map((id, i) =>
        db.update(items).set({ position: i }).where(and(eq(items.id, id), eq(items.listId, list.id))),
      ),
    );
    return c.body(null, 204);
  },
);

app.patch(
  "/lists/:listId/items/:itemId",
  zValidator("json", z.object({ text: z.string().min(1).max(1000).optional(), done: z.boolean().optional() })),
  async (c) => {
    const list = await resolveList(c.req.param("listId"));
    if (!list) return c.json({ error: "Not found" }, 404);
    const authUser = getOptionalUser(c);
    const userId = authUser?.session?.user?.id ?? null;
    if (!canModifyList(list, userId)) return c.json({ error: "Forbidden" }, 403);
    const itemId = c.req.param("itemId");
    const body = c.req.valid("json");
    const previous = list.public && list.collaborative && userId
      ? await db.query.items.findFirst({ where: and(eq(items.id, itemId), eq(items.listId, list.id)), columns: { text: true } })
      : null;
    const [updated] = await db
      .update(items)
      .set({ ...body, updatedAt: new Date() })
      .where(and(eq(items.id, itemId), eq(items.listId, list.id)))
      .returning();
    if (!updated) return c.json({ error: "Not found" }, 404);
    if (list.public && list.collaborative && userId && body.text !== undefined) {
      await logActivity(list.id, userId, "item_edited", itemId, { text: previous?.text }, { text: body.text });
    }
    return c.json(updated);
  },
);

app.patch("/lists/:listId/items/:itemId/toggle", async (c) => {
  const list = await resolveList(c.req.param("listId"));
  if (!list) return c.json({ error: "Not found" }, 404);
  const authUser = getOptionalUser(c);
  const userId = authUser?.session?.user?.id ?? null;
  if (!canModifyList(list, userId)) return c.json({ error: "Forbidden" }, 403);
  const itemId = c.req.param("itemId");

  const item = await db.query.items.findFirst({
    where: and(eq(items.id, itemId), eq(items.listId, list.id)),
    columns: { id: true, done: true },
  });
  if (!item) return c.json({ error: "Not found" }, 404);

  const isOwner = list.ownerId === null || list.ownerId === userId;
  const participation = userId && list.public && !isOwner
    ? await getParticipation(list.id, userId)
    : null;

  if (participation && userId) {
    const existing = await db.query.itemProgress.findFirst({
      where: and(eq(itemProgress.userId, userId), eq(itemProgress.itemId, itemId)),
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
    const allProgress = await db.query.itemProgress.findMany({
      where: and(
        eq(itemProgress.userId, userId),
        inArray(itemProgress.itemId, allItems.map((i) => i.id)),
      ),
      columns: { done: true },
    });
    const allDone = allItems.length > 0 && allProgress.length === allItems.length && allProgress.every((p) => p.done);
    if (allDone && !participation.completedAt) {
      await db
        .update(participations)
        .set({ completedAt: new Date() })
        .where(and(eq(participations.sourceListId, list.id), eq(participations.userId, userId)));
      await logActivity(list.id, userId, "challenge_completed");
    }

    return c.json({ ...item, done: newDone });
  }

  const [updated] = await db
    .update(items)
    .set({ done: sql`NOT ${items.done}`, updatedAt: new Date() })
    .where(and(eq(items.id, itemId), eq(items.listId, list.id)))
    .returning();
  if (!updated) return c.json({ error: "Not found" }, 404);

  if (userId && !list.public) {
    const allItems = await db.query.items.findMany({
      where: eq(items.listId, list.id),
      columns: { done: true },
    });
    const allDone = allItems.length > 0 && allItems.every((i) => i.done);
    if (allDone) {
      await db
        .update(participations)
        .set({ completedAt: new Date() })
        .where(and(eq(participations.userListId, list.id), eq(participations.userId, userId)));
    }
  }

  return c.json(updated);
});

app.delete("/lists/:listId/items/:itemId", async (c) => {
  const list = await resolveList(c.req.param("listId"));
  if (!list) return c.json({ error: "Not found" }, 404);
  const authUser = getOptionalUser(c);
  const userId = authUser?.session?.user?.id ?? null;
  if (!canModifyList(list, userId)) return c.json({ error: "Forbidden" }, 403);
  const itemId = c.req.param("itemId");
  const previous = list.public && list.collaborative && userId
    ? await db.query.items.findFirst({ where: and(eq(items.id, itemId), eq(items.listId, list.id)), columns: { text: true } })
    : null;
  await db.delete(items).where(and(eq(items.id, itemId), eq(items.listId, list.id)));
  if (list.public && list.collaborative && userId && previous) {
    await logActivity(list.id, userId, "item_deleted", itemId, { text: previous.text }, null);
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
    if (!canModifyList(list, userId)) return c.json({ error: "Forbidden" }, 403);
    const { ids } = c.req.valid("json");
    await db.delete(items).where(and(eq(items.listId, list.id), inArray(items.id, ids)));
    return c.body(null, 204);
  },
);

const EXPLORE_PAGE_SIZE = 6;
const MY_LISTS_PAGE_SIZE = 6;

const BULK_ITEM_LIMIT = 100;

app.post(
  "/lists/:listId/items/bulk",
  zValidator("json", z.object({
    texts: z.array(z.string().min(1).max(1000)).min(1).max(BULK_ITEM_LIMIT),
  })),
  async (c) => {
    const list = await resolveList(c.req.param("listId"));
    if (!list) return c.json({ error: "Not found" }, 404);
    const authUser = getOptionalUser(c);
    const userId = authUser?.session?.user?.id ?? null;
    if (!canModifyList(list, userId)) return c.json({ error: "Forbidden" }, 403);
    const { texts } = c.req.valid("json");
    const [maxRow] = await db.select({ pos: max(items.position) }).from(items).where(eq(items.listId, list.id));
    const basePosition = (maxRow?.pos ?? -1) + 1;
    const created = await db.insert(items).values(
      texts.map((text, i) => ({ listId: list.id, text, position: basePosition + i })),
    ).returning();
    return c.json(created, 201);
  },
);

app.get("/explore", async (c) => {
  const q = c.req.query("q")?.trim();
  const cursor = c.req.query("cursor");
  const sort = c.req.query("sort") ?? "created_desc";
  const isAsc = sort === "created_asc";

  const baseWhere = q ? and(eq(lists.public, true), ilike(lists.name, `%${q}%`)) : eq(lists.public, true);
  const where = cursor
    ? and(baseWhere, isAsc ? gt(lists.createdAt, new Date(cursor)) : lt(lists.createdAt, new Date(cursor)))
    : baseWhere;

  const rows = await db
    .select({
      id: lists.id,
      name: lists.name,
      slug: lists.slug,
      description: lists.description,
      createdAt: lists.createdAt,
      itemCount: sql<number>`cast((select count(*) from ${items} where ${items.listId} = ${lists.id}) as int)`,
      participantCount: sql<number>`cast((select count(*) from ${participations} where ${participations.sourceListId} = ${lists.id}) as int)`,
      completedCount: sql<number>`cast((select count(*) from ${participations} where ${participations.sourceListId} = ${lists.id} and ${participations.completedAt} is not null) as int)`,
      ownerImage: users.image,
    })
    .from(lists)
    .leftJoin(users, eq(users.id, lists.ownerId))
    .where(where)
    .orderBy(isAsc ? lists.createdAt : desc(lists.createdAt))
    .limit(EXPLORE_PAGE_SIZE);

  const nextCursor = rows.length === EXPLORE_PAGE_SIZE
    ? rows[rows.length - 1].createdAt.toISOString()
    : null;

  const exploreItems = rows.map(({ ownerImage, completedCount, ...row }) => ({
    ...row,
    completedCount,
    owner: ownerImage ? { image: ownerImage } : null,
  }));

  return c.json({ items: exploreItems, nextCursor });
});

app.get("/explore/:listId", async (c) => {
  const listId = c.req.param("listId");
  const list = await db.query.lists.findFirst({
    where: listWhere(listId),
    columns: { id: true, name: true, slug: true, description: true, public: true, createdAt: true, ownerId: true },
  });
  if (!list || !list.public) return c.json({ error: "Not found" }, 404);

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

  const participantRows = await db
    .select({ image: users.image, name: users.name })
    .from(participations)
    .leftJoin(users, eq(users.id, participations.userId))
    .where(eq(participations.sourceListId, list.id))
    .groupBy(participations.userId, users.image, users.name)
    .limit(6);

  const totalParticipants = await db
    .select({ count: countDistinct(participations.userId) })
    .from(participations)
    .where(eq(participations.sourceListId, list.id));

  const owner = stats?.ownerName || stats?.ownerImage
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
    participants: participantRows,
  });
});

app.get("/explore/:listId/items", async (c) => {
  const listId = c.req.param("listId");
  const list = await db.query.lists.findFirst({
    where: listWhere(listId),
    columns: { id: true, public: true },
  });
  if (!list || !list.public) return c.json({ error: "Not found" }, 404);
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

  const [newList] = await db.insert(lists).values({ name: source.name }).returning();

  if (sourceItems.length > 0) {
    await db.insert(items).values(
      sourceItems.map((item, i) => ({
        listId: newList.id,
        text: item.text,
        done: false,
        position: i,
      })),
    );
  }

  return c.json(newList, 201);
});

app.delete("/lists/:listId", async (c) => {
  const listId = c.req.param("listId");
  const list = await db.query.lists.findFirst({ where: listWhere(listId), columns: { id: true, ownerId: true } });
  if (!list) return c.json({ error: "Not found" }, 404);
  const authUser = getOptionalUser(c);
  const userId = authUser?.session?.user?.id ?? null;
  if (!userId) return c.json({ error: "Forbidden" }, 403);
  if (list.ownerId !== userId) {
    const participation = await getParticipation(list.id, userId);
    if (!participation) return c.json({ error: "Forbidden" }, 403);
    await db.delete(participations).where(and(eq(participations.sourceListId, list.id), eq(participations.userId, userId)));
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
  const source = await db.query.lists.findFirst({ where: listWhere(listId) });
  if (!source) return c.json({ error: "Not found" }, 404);
  if (!source.public) return c.json({ error: "Forbidden" }, 403);
  if (source.ownerId === userId) return c.json({ error: "Cannot accept your own list" }, 409);

  const existing = await getParticipation(source.id, userId);
  if (existing) return c.json({ error: "Already participating" }, 409);

  await db.insert(participations).values({ sourceListId: source.id, userId });
  await logActivity(source.id, userId, "challenge_accepted");

  return c.json(source, 201);
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
  if (!userId) return c.json({ participated: false, completedAt: null });
  const list = await resolveList(c.req.param("listId"));
  if (!list) return c.json({ error: "Not found" }, 404);
  const participation = await getParticipation(list.id, userId);
  return c.json({ participated: !!participation, completedAt: participation?.completedAt ?? null });
});

function getStripe(c: Context) {
  const key = c.env?.STRIPE_SECRET_KEY ?? process.env.STRIPE_SECRET_KEY ?? "";
  return new Stripe(key);
}

function getStripeWebhookSecret(c: Context) {
  return c.env?.STRIPE_WEBHOOK_SECRET ?? process.env.STRIPE_WEBHOOK_SECRET ?? "";
}

async function hasPurchased(userId: string, listId: string): Promise<boolean> {
  const purchase = await db.query.listPurchases.findFirst({
    where: and(eq(listPurchases.buyerId, userId), eq(listPurchases.listId, listId)),
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
    columns: { stripeAccountId: true, onboardingComplete: true },
  });

  let accountId: string;
  if (existing) {
    accountId = existing.stripeAccountId;
  } else {
    const account = await stripe.accounts.create({ type: "express" });
    accountId = account.id;
    await db.insert(stripeAccounts).values({ userId, stripeAccountId: accountId });
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
  if (!userId) return c.json({ connected: false, onboardingComplete: false });

  const record = await db.query.stripeAccounts.findFirst({
    where: eq(stripeAccounts.userId, userId),
    columns: { stripeAccountId: true, onboardingComplete: true },
  });
  if (!record) return c.json({ connected: false, onboardingComplete: false });

  if (!record.onboardingComplete) {
    const stripe = getStripe(c);
    const account = await stripe.accounts.retrieve(record.stripeAccountId);
    if (account.details_submitted) {
      await db.update(stripeAccounts)
        .set({ onboardingComplete: true })
        .where(eq(stripeAccounts.userId, userId));
      return c.json({ connected: true, onboardingComplete: true });
    }
    return c.json({ connected: true, onboardingComplete: false });
  }

  return c.json({ connected: true, onboardingComplete: true });
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
  zValidator("json", z.object({ priceInCents: z.number().int().min(100).max(100_000) })),
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
      where: and(eq(stripeAccounts.userId, userId), eq(stripeAccounts.onboardingComplete, true)),
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
  },
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

app.post("/lists/:listId/checkout", async (c) => {
  const authUser = getOptionalUser(c);
  const userId = authUser?.session?.user?.id;
  if (!userId) return c.json({ error: "Unauthorized" }, 401);

  const listParam = c.req.param("listId");
  const list = await db.query.lists.findFirst({
    where: listWhere(listParam),
    columns: { id: true, ownerId: true, name: true, public: true },
  });
  if (!list) return c.json({ error: "Not found" }, 404);
  if (list.ownerId === userId) return c.json({ error: "Cannot buy your own list" }, 409);

  const alreadyPurchased = await hasPurchased(userId, list.id);
  if (alreadyPurchased) return c.json({ error: "Already purchased" }, 409);

  const price = await db.query.listPrices.findFirst({
    where: eq(listPrices.listId, list.id),
    columns: { priceInCents: true, currency: true },
  });
  if (!price) return c.json({ error: "List is not for sale" }, 400);

  const sellerAccount = await db.query.stripeAccounts.findFirst({
    where: and(
      eq(stripeAccounts.userId, list.ownerId!),
      eq(stripeAccounts.onboardingComplete, true),
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
    transfer_data: { destination: sellerAccount.stripeAccountId },
    metadata: { listId: list.id, buyerId: userId },
  });

  return c.json({ clientSecret: paymentIntent.client_secret });
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
        .values({ buyerId, listId, stripePaymentIntentId: intent.id })
        .onConflictDoNothing();
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
