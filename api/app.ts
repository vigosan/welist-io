import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, max, sql, and, or } from "drizzle-orm";
import { db } from "../src/db/client";
import { lists, items } from "../src/db/schema";

export const app = new Hono().basePath("/api");

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
  })),
  async (c) => {
    const listId = c.req.param("listId");
    const body = c.req.valid("json");
    const patch: Record<string, unknown> = {};
    if (body.name !== undefined) patch.name = body.name;
    if ("slug" in body) patch.slug = body.slug ?? null;
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
  const listId = c.req.param("listId");
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
    const listId = c.req.param("listId");
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
    const listId = c.req.param("listId");
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
  const listId = c.req.param("listId");
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
  const listId = c.req.param("listId");
  const itemId = c.req.param("itemId");
  await db.delete(items).where(and(eq(items.id, itemId), eq(items.listId, listId)));
  return c.body(null, 204);
});
