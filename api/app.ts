import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, max, sql, and, or, ilike, count, gt, inArray } from "drizzle-orm";
import { db } from "../src/db/client.js";
import { lists, items, participations, users, accounts, sessions, verificationTokens } from "../src/db/schema/index.js";
import { rateLimit } from "./rate-limit.js";
import { authHandler, initAuthConfig, getAuthUser, verifyAuth } from "@hono/auth-js";
import Google from "@auth/core/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import type { AuthUser } from "@hono/auth-js";

export const app = new Hono().basePath("/api");

app.use(rateLimit({ limit: 120, windowMs: 60_000 }));

app.use(
  "*",
  initAuthConfig((c) => ({
    secret: c.env?.AUTH_SECRET ?? process.env.AUTH_SECRET ?? "",
    basePath: "/api/auth",
    adapter: DrizzleAdapter(db, { usersTable: users, accountsTable: accounts, sessionsTable: sessions, verificationTokensTable: verificationTokens }),
    providers: [
      Google({
        clientId: c.env?.GOOGLE_CLIENT_ID ?? process.env.GOOGLE_CLIENT_ID ?? "",
        clientSecret: c.env?.GOOGLE_CLIENT_SECRET ?? process.env.GOOGLE_CLIENT_SECRET ?? "",
      }),
    ],
    session: { strategy: "jwt" },
    callbacks: {
      jwt({ token, user }) {
        if (user?.id) token.sub = user.id;
        return token;
      },
      session({ session, token, user }) {
        if (session.user) session.user.id = token?.sub ?? user?.id ?? null;
        return session;
      },
    },
    trustHost: true,
  })),
);

app.use("/auth/*", authHandler());

app.get("/me", async (c) => {
  const authUser = await getOptionalUser(c);
  return c.json(authUser?.session?.user ?? null);
});


async function getOptionalUser(c: Parameters<typeof getAuthUser>[0]): Promise<AuthUser | null> {
  try {
    return await getAuthUser(c);
  } catch {
    return null;
  }
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

async function resolveList(param: string): Promise<{ id: string; ownerId: string | null; collaborative: boolean } | null> {
  const list = await db.query.lists.findFirst({
    where: listWhere(param),
    columns: { id: true, ownerId: true, collaborative: true },
  });
  return list ?? null;
}

app.post(
  "/lists",
  zValidator("json", z.object({ name: z.string().min(1).max(200) })),
  async (c) => {
    const { name } = c.req.valid("json");
    const authUser = await getOptionalUser(c);
    const ownerId = authUser?.session?.user?.id ?? null;
    const [list] = await db.insert(lists).values({ name, ownerId }).returning();
    return c.json(list, 201);
  },
);

app.get("/my-lists", async (c) => {
  const authUser = await getOptionalUser(c);
  const userId = authUser?.session?.user?.id ?? null;
  if (!userId) return c.json({ error: "Unauthorized" }, 401);
  const rows = await db.query.lists.findMany({
    where: eq(lists.ownerId, userId),
    orderBy: (t, { desc }) => [desc(t.createdAt)],
  });
  return c.json(rows);
});

app.get("/lists/:listId", async (c) => {
  const listId = c.req.param("listId");
  const list = await db.query.lists.findFirst({
    where: listWhere(listId),
  });
  if (!list) return c.json({ error: "Not found" }, 404);
  return c.json(list);
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
    const authUser = await getOptionalUser(c);
    const userId = authUser?.session?.user?.id ?? null;
    if (!canModifyList(list, userId)) return c.json({ error: "Forbidden", debug: { userId, ownerId: list.ownerId, collaborative: list.collaborative } }, 403);
    const patch: Record<string, unknown> = {};
    if (body.name !== undefined) patch.name = body.name;
    if ("slug" in body) patch.slug = body.slug ?? null;
    if ("description" in body) patch.description = body.description ?? null;
    if (body.public !== undefined) patch.public = body.public;
    if (body.collaborative !== undefined) {
      if (list.ownerId !== null && list.ownerId !== userId) return c.json({ error: "Forbidden" }, 403);
      patch.collaborative = body.collaborative;
    }
    try {
      const [updated] = await db
        .update(lists)
        .set(patch)
        .where(eq(lists.id, list.id))
        .returning();
      if (!updated) return c.json({ error: "Not found" }, 404);
      return c.json(updated);
    } catch (e: unknown) {
      if (typeof e === "object" && e !== null && (e as Record<string, unknown>).code === "23505") {
        return c.json({ error: "slug_taken" }, 409);
      }
      throw e;
    }
  },
);

app.get("/lists/:listId/items", async (c) => {
  const list = await resolveList(c.req.param("listId"));
  if (!list) return c.json({ error: "Not found" }, 404);
  const rows = await db.query.items.findMany({
    where: eq(items.listId, list.id),
    orderBy: (t, { asc }) => [asc(t.position), asc(t.createdAt)],
  });
  return c.json(rows);
});

app.post(
  "/lists/:listId/items",
  zValidator("json", z.object({ text: z.string().min(1).max(1000) })),
  async (c) => {
    const list = await resolveList(c.req.param("listId"));
    if (!list) return c.json({ error: "Not found" }, 404);
    const authUser = await getOptionalUser(c);
    const userId = authUser?.session?.user?.id ?? null;
    if (!canModifyList(list, userId)) return c.json({ error: "Forbidden", debug: { userId, ownerId: list.ownerId, collaborative: list.collaborative } }, 403);
    const { text } = c.req.valid("json");
    const [maxRow] = await db.select({ pos: max(items.position) }).from(items).where(eq(items.listId, list.id));
    const position = (maxRow?.pos ?? -1) + 1;
    const [item] = await db.insert(items).values({ listId: list.id, text, position }).returning();
    return c.json(item, 201);
  },
);

app.patch(
  "/lists/:listId/items/:itemId",
  zValidator("json", z.object({ text: z.string().min(1).max(1000).optional(), done: z.boolean().optional() })),
  async (c) => {
    const list = await resolveList(c.req.param("listId"));
    if (!list) return c.json({ error: "Not found" }, 404);
    const authUser = await getOptionalUser(c);
    const userId = authUser?.session?.user?.id ?? null;
    if (!canModifyList(list, userId)) return c.json({ error: "Forbidden" }, 403);
    const itemId = c.req.param("itemId");
    const body = c.req.valid("json");
    const [updated] = await db
      .update(items)
      .set({ ...body, updatedAt: new Date() })
      .where(and(eq(items.id, itemId), eq(items.listId, list.id)))
      .returning();
    if (!updated) return c.json({ error: "Not found" }, 404);
    return c.json(updated);
  },
);

app.patch("/lists/:listId/items/:itemId/toggle", async (c) => {
  const list = await resolveList(c.req.param("listId"));
  if (!list) return c.json({ error: "Not found" }, 404);
  const authUser = await getOptionalUser(c);
  const userId = authUser?.session?.user?.id ?? null;
  if (!canModifyList(list, userId)) return c.json({ error: "Forbidden" }, 403);
  const itemId = c.req.param("itemId");
  const [updated] = await db
    .update(items)
    .set({ done: sql`NOT ${items.done}`, updatedAt: new Date() })
    .where(and(eq(items.id, itemId), eq(items.listId, list.id)))
    .returning();
  if (!updated) return c.json({ error: "Not found" }, 404);

  if (userId) {
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
  const authUser = await getOptionalUser(c);
  const userId = authUser?.session?.user?.id ?? null;
  if (!canModifyList(list, userId)) return c.json({ error: "Forbidden" }, 403);
  const itemId = c.req.param("itemId");
  await db.delete(items).where(and(eq(items.id, itemId), eq(items.listId, list.id)));
  return c.body(null, 204);
});

app.delete(
  "/lists/:listId/items",
  zValidator("json", z.object({ ids: z.array(z.string().uuid()).min(1) })),
  async (c) => {
    const list = await resolveList(c.req.param("listId"));
    if (!list) return c.json({ error: "Not found" }, 404);
    const authUser = await getOptionalUser(c);
    const userId = authUser?.session?.user?.id ?? null;
    if (!canModifyList(list, userId)) return c.json({ error: "Forbidden" }, 403);
    const { ids } = c.req.valid("json");
    await db.delete(items).where(and(eq(items.listId, list.id), inArray(items.id, ids)));
    return c.body(null, 204);
  },
);

const EXPLORE_PAGE_SIZE = 20;

const BULK_ITEM_LIMIT = 100;

app.post(
  "/lists/:listId/items/bulk",
  zValidator("json", z.object({
    texts: z.array(z.string().min(1).max(1000)).min(1).max(BULK_ITEM_LIMIT),
  })),
  async (c) => {
    const list = await resolveList(c.req.param("listId"));
    if (!list) return c.json({ error: "Not found" }, 404);
    const authUser = await getOptionalUser(c);
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

  const baseWhere = q ? and(eq(lists.public, true), ilike(lists.name, `%${q}%`)) : eq(lists.public, true);
  const where = cursor ? and(baseWhere, gt(lists.createdAt, new Date(cursor))) : baseWhere;

  const rows = await db
    .select({
      id: lists.id,
      name: lists.name,
      slug: lists.slug,
      description: lists.description,
      createdAt: lists.createdAt,
      itemCount: count(items.id),
      participantCount: sql<number>`cast(count(distinct ${participations.id}) as int)`,
      completedCount: sql<number>`cast(count(distinct case when ${participations.completedAt} is not null then ${participations.id} end) as int)`,
      ownerImage: users.image,
    })
    .from(lists)
    .leftJoin(items, eq(items.listId, lists.id))
    .leftJoin(participations, eq(participations.sourceListId, lists.id))
    .leftJoin(users, eq(users.id, lists.ownerId))
    .where(where)
    .groupBy(lists.id, users.image)
    .orderBy(lists.createdAt)
    .limit(EXPLORE_PAGE_SIZE);

  const nextCursor = rows.length === EXPLORE_PAGE_SIZE
    ? rows[rows.length - 1].createdAt.toISOString()
    : null;

  return c.json({ items: rows, nextCursor });
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
  return c.json(rows);
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

app.post("/lists/:listId/accept", async (c) => {
  const authUser = await getOptionalUser(c);
  const userId = authUser?.session?.user?.id;
  if (!userId) return c.json({ error: "Unauthorized" }, 401);

  const listId = c.req.param("listId");
  const source = await db.query.lists.findFirst({ where: listWhere(listId) });
  if (!source) return c.json({ error: "Not found" }, 404);

  const sourceItems = await db.query.items.findMany({
    where: eq(items.listId, source.id),
    orderBy: (t, { asc }) => [asc(t.position), asc(t.createdAt)],
  });

  const [newList] = await db.insert(lists).values({ name: source.name, ownerId: userId }).returning();

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

  await db.insert(participations).values({
    sourceListId: source.id,
    userListId: newList.id,
    userId,
  });

  return c.json(newList, 201);
});
