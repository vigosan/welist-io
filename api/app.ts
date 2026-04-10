import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, max, sql, and, or, ilike, count } from "drizzle-orm";
import { db } from "../src/db/client.js";
import { lists, items } from "../src/db/schema/index.js";

export const app = new Hono().basePath("/api");

async function resolveListId(param: string): Promise<string | null> {
  const list = await db.query.lists.findFirst({
    where: or(eq(lists.id, param), eq(lists.slug, param)),
    columns: { id: true },
  });
  return list?.id ?? null;
}

app.post(
  "/lists",
  zValidator("json", z.object({ name: z.string().min(1).max(200) })),
  async (c) => {
    const { name } = c.req.valid("json");
    const [list] = await db.insert(lists).values({ name }).returning();
    return c.json(list, 201);
  },
);

app.get("/lists/:listId", async (c) => {
  const listId = c.req.param("listId");
  const list = await db.query.lists.findFirst({
    where: or(eq(lists.id, listId), eq(lists.slug, listId)),
  });
  if (!list) return c.json({ error: "Not found" }, 404);
  return c.json(list);
});

app.patch(
  "/lists/:listId",
  zValidator("json", z.object({
    name: z.string().min(1).max(200).optional(),
    slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/).optional().nullable(),
    public: z.boolean().optional(),
  })),
  async (c) => {
    const listId = c.req.param("listId");
    const body = c.req.valid("json");
    const patch: Record<string, unknown> = {};
    if (body.name !== undefined) patch.name = body.name;
    if ("slug" in body) patch.slug = body.slug ?? null;
    if (body.public !== undefined) patch.public = body.public;
    try {
      const [updated] = await db
        .update(lists)
        .set(patch)
        .where(or(eq(lists.id, listId), eq(lists.slug, listId)))
        .returning();
      if (!updated) return c.json({ error: "Not found" }, 404);
      return c.json(updated);
    } catch (e: any) {
      if (e?.code === "23505") return c.json({ error: "slug_taken" }, 409);
      throw e;
    }
  },
);

app.get("/lists/:listId/items", async (c) => {
  const listId = await resolveListId(c.req.param("listId"));
  if (!listId) return c.json({ error: "Not found" }, 404);
  const rows = await db.query.items.findMany({
    where: eq(items.listId, listId),
    orderBy: (t, { asc }) => [asc(t.position), asc(t.createdAt)],
  });
  return c.json(rows);
});

app.post(
  "/lists/:listId/items",
  zValidator("json", z.object({ text: z.string().min(1).max(1000) })),
  async (c) => {
    const listId = await resolveListId(c.req.param("listId"));
    if (!listId) return c.json({ error: "Not found" }, 404);
    const { text } = c.req.valid("json");
    const [maxRow] = await db.select({ pos: max(items.position) }).from(items).where(eq(items.listId, listId));
    const position = (maxRow?.pos ?? -1) + 1;
    const [item] = await db.insert(items).values({ listId, text, position }).returning();
    return c.json(item, 201);
  },
);

app.patch(
  "/lists/:listId/items/:itemId",
  zValidator("json", z.object({ text: z.string().min(1).max(1000).optional(), done: z.boolean().optional() })),
  async (c) => {
    const listId = await resolveListId(c.req.param("listId"));
    if (!listId) return c.json({ error: "Not found" }, 404);
    const itemId = c.req.param("itemId");
    const body = c.req.valid("json");
    const [updated] = await db
      .update(items)
      .set({ ...body, updatedAt: new Date() })
      .where(and(eq(items.id, itemId), eq(items.listId, listId)))
      .returning();
    if (!updated) return c.json({ error: "Not found" }, 404);
    return c.json(updated);
  },
);

app.patch("/lists/:listId/items/:itemId/toggle", async (c) => {
  const listId = await resolveListId(c.req.param("listId"));
  if (!listId) return c.json({ error: "Not found" }, 404);
  const itemId = c.req.param("itemId");
  const [updated] = await db
    .update(items)
    .set({ done: sql`NOT ${items.done}`, updatedAt: new Date() })
    .where(and(eq(items.id, itemId), eq(items.listId, listId)))
    .returning();
  if (!updated) return c.json({ error: "Not found" }, 404);
  return c.json(updated);
});

app.delete("/lists/:listId/items/:itemId", async (c) => {
  const listId = await resolveListId(c.req.param("listId"));
  if (!listId) return c.json({ error: "Not found" }, 404);
  const itemId = c.req.param("itemId");
  await db.delete(items).where(and(eq(items.id, itemId), eq(items.listId, listId)));
  return c.body(null, 204);
});

app.get("/explore", async (c) => {
  const q = c.req.query("q")?.trim();
  const rows = await db
    .select({ id: lists.id, name: lists.name, slug: lists.slug, createdAt: lists.createdAt, itemCount: count(items.id) })
    .from(lists)
    .leftJoin(items, eq(items.listId, lists.id))
    .where(q ? and(eq(lists.public, true), ilike(lists.name, `%${q}%`)) : eq(lists.public, true))
    .groupBy(lists.id)
    .orderBy(lists.createdAt)
    .limit(50);
  return c.json(rows);
});

app.post("/lists/:listId/clone", async (c) => {
  const listId = c.req.param("listId");
  const source = await db.query.lists.findFirst({
    where: or(eq(lists.id, listId), eq(lists.slug, listId)),
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
