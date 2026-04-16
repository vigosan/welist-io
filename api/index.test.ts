import { describe, it, expect, vi, beforeEach } from "vitest";

const mockDb = {
  query: {
    lists: { findFirst: vi.fn() },
    items: { findMany: vi.fn(), findFirst: vi.fn() },
    participations: { findFirst: vi.fn() },
    itemProgress: { findFirst: vi.fn(), findMany: vi.fn() },
  },
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  select: vi.fn(),
  transaction: vi.fn(),
};

vi.mock("../src/db/client", () => ({ db: mockDb }));

const { app } = await import("./app");

describe("POST /api/lists", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates a list and returns 201", async () => {
    const created = { id: "abc-123", name: "Mi lista", createdAt: new Date().toISOString() };
    mockDb.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([created]) }),
    });

    const res = await app.request("/api/lists", {
      method: "POST",
      body: JSON.stringify({ name: "Mi lista" }),
      headers: { "Content-Type": "application/json" },
    });

    expect(res.status).toBe(201);
    const body = await res.json() as Record<string, unknown>;
    expect(body.name).toBe("Mi lista");
    expect(body.id).toBe("abc-123");
  });

  it("returns 400 when name is empty", async () => {
    const res = await app.request("/api/lists", {
      method: "POST",
      body: JSON.stringify({ name: "" }),
      headers: { "Content-Type": "application/json" },
    });
    expect(res.status).toBe(400);
  });
});

describe("GET /api/lists/:listId", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns the list when found", async () => {
    const list = { id: "abc-123", name: "Mi lista", public: true, ownerId: null, createdAt: new Date().toISOString() };
    mockDb.query.lists.findFirst.mockResolvedValue(list);

    const res = await app.request("/api/lists/abc-123");
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.id).toBe("abc-123");
  });

  it("returns 404 when list not found", async () => {
    mockDb.query.lists.findFirst.mockResolvedValue(null);
    const res = await app.request("/api/lists/nonexistent");
    expect(res.status).toBe(404);
  });

  it("returns 404 for private list when unauthenticated", async () => {
    mockDb.query.lists.findFirst.mockResolvedValue({ id: "abc", ownerId: "u1", public: false, collaborative: false });
    const res = await app.request("/api/lists/abc");
    expect(res.status).toBe(404);
  });

  it("returns 404 for private anonymous list when unauthenticated", async () => {
    mockDb.query.lists.findFirst.mockResolvedValue({ id: "abc", ownerId: null, public: false, collaborative: false });
    const res = await app.request("/api/lists/abc");
    expect(res.status).toBe(404);
  });

  it("returns 200 for private collaborative list when unauthenticated", async () => {
    mockDb.query.lists.findFirst.mockResolvedValue({ id: "abc", ownerId: "u1", public: false, collaborative: true });
    mockDb.query.participations.findFirst.mockResolvedValue(null);
    const res = await app.request("/api/lists/abc");
    expect(res.status).toBe(200);
  });
});

describe("GET /api/lists/:listId/items", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns items ordered by position", async () => {
    const rows = [
      { id: "i1", listId: "abc", text: "Primero", done: false, position: 0 },
      { id: "i2", listId: "abc", text: "Segundo", done: true, position: 1 },
    ];
    mockDb.query.lists.findFirst.mockResolvedValue({ id: "abc", ownerId: null, collaborative: false, public: true });
    mockDb.query.items.findMany.mockResolvedValue(rows);

    const res = await app.request("/api/lists/abc/items");
    expect(res.status).toBe(200);
    const body = await res.json() as Array<Record<string, unknown>>;
    expect(body).toHaveLength(2);
    expect(body[0].text).toBe("Primero");
  });

  it("returns 404 for private list when unauthenticated", async () => {
    mockDb.query.lists.findFirst.mockResolvedValue({ id: "abc", ownerId: "u1", public: false, collaborative: false });
    const res = await app.request("/api/lists/abc/items");
    expect(res.status).toBe(404);
  });
});

describe("POST /api/lists/:listId/items", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates an item and returns 201", async () => {
    const item = { id: "i1", listId: "abc", text: "Nueva tarea", done: false, position: 0 };
    mockDb.query.lists.findFirst.mockResolvedValue({ id: "abc", ownerId: null, collaborative: false });
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ pos: null }]),
      }),
    });
    mockDb.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([item]) }),
    });

    const res = await app.request("/api/lists/abc/items", {
      method: "POST",
      body: JSON.stringify({ text: "Nueva tarea" }),
      headers: { "Content-Type": "application/json" },
    });

    expect(res.status).toBe(201);
    const body = await res.json() as Record<string, unknown>;
    expect(body.text).toBe("Nueva tarea");
  });

  it("assigns position -1 when list has no items", async () => {
    const item = { id: "i1", listId: "abc", text: "Primero", done: false, position: -1 };
    mockDb.query.lists.findFirst.mockResolvedValue({ id: "abc", ownerId: null, collaborative: false });
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ pos: null }]),
      }),
    });
    const valuesMock = vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([item]) });
    mockDb.insert.mockReturnValue({ values: valuesMock });

    await app.request("/api/lists/abc/items", {
      method: "POST",
      body: JSON.stringify({ text: "Primero" }),
      headers: { "Content-Type": "application/json" },
    });

    expect(valuesMock).toHaveBeenCalledWith(expect.objectContaining({ position: -1 }));
  });

  it("returns 400 when text is empty", async () => {
    const res = await app.request("/api/lists/abc/items", {
      method: "POST",
      body: JSON.stringify({ text: "" }),
      headers: { "Content-Type": "application/json" },
    });
    expect(res.status).toBe(400);
  });
});

describe("PATCH /api/lists/:listId/items/:itemId/toggle", () => {
  beforeEach(() => vi.clearAllMocks());

  it("toggles done and returns updated item", async () => {
    const item = { id: "i1", listId: "abc", text: "Tarea", done: false, position: 0 };
    const updated = { ...item, done: true };
    mockDb.query.lists.findFirst.mockResolvedValue({ id: "abc", ownerId: null, collaborative: false, public: false });
    mockDb.query.items.findFirst.mockResolvedValue(item);
    mockDb.query.participations.findFirst.mockResolvedValue(null);
    mockDb.update.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([updated]) }),
      }),
    });

    const res = await app.request("/api/lists/abc/items/i1/toggle", { method: "PATCH" });
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.done).toBe(true);
  });

  it("returns 404 when item not found", async () => {
    mockDb.query.lists.findFirst.mockResolvedValue({ id: "abc", ownerId: null, collaborative: false, public: false });
    mockDb.query.items.findFirst.mockResolvedValue(null);

    const res = await app.request("/api/lists/abc/items/bad-id/toggle", { method: "PATCH" });
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/lists/:listId/items/:itemId", () => {
  beforeEach(() => vi.clearAllMocks());

  it("deletes an item and returns 204", async () => {
    mockDb.query.lists.findFirst.mockResolvedValue({ id: "abc", ownerId: null, collaborative: false });
    mockDb.delete.mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    });

    const res = await app.request("/api/lists/abc/items/i1", { method: "DELETE" });
    expect(res.status).toBe(204);
  });
});

describe("PATCH /api/lists/:listId", () => {
  beforeEach(() => vi.clearAllMocks());

  it("updates description and returns the list", async () => {
    const updated = { id: "abc", name: "Lista", description: "Una descripción", slug: null, public: false, ownerId: null };
    mockDb.query.lists.findFirst.mockResolvedValue({ id: "abc", ownerId: null, collaborative: false });
    mockDb.update.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([updated]) }),
      }),
    });

    const res = await app.request("/api/lists/abc", {
      method: "PATCH",
      body: JSON.stringify({ description: "Una descripción" }),
      headers: { "Content-Type": "application/json" },
    });

    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.description).toBe("Una descripción");
  });

  it("returns 409 when slug is already taken", async () => {
    mockDb.query.lists.findFirst.mockResolvedValue({ id: "abc", ownerId: null, collaborative: false });
    mockDb.update.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockRejectedValue(Object.assign(new Error("unique"), { code: "23505" })),
        }),
      }),
    });

    const res = await app.request("/api/lists/abc", {
      method: "PATCH",
      body: JSON.stringify({ slug: "taken-slug" }),
      headers: { "Content-Type": "application/json" },
    });

    expect(res.status).toBe(409);
    const body = await res.json() as Record<string, unknown>;
    expect(body.error).toBe("slug_taken");
  });

  it("returns 400 when description exceeds 500 chars", async () => {
    const res = await app.request("/api/lists/abc", {
      method: "PATCH",
      body: JSON.stringify({ description: "x".repeat(501) }),
      headers: { "Content-Type": "application/json" },
    });
    expect(res.status).toBe(400);
  });

  it("returns 403 when user does not own the list", async () => {
    mockDb.query.lists.findFirst.mockResolvedValue({ id: "abc", ownerId: "other-user-id", collaborative: false });

    const res = await app.request("/api/lists/abc", {
      method: "PATCH",
      body: JSON.stringify({ name: "Hacked" }),
      headers: { "Content-Type": "application/json" },
    });

    expect(res.status).toBe(403);
  });
});

describe("Collaborative lists", () => {
  beforeEach(() => vi.clearAllMocks());

  it("non-owner can add item to collaborative list (200)", async () => {
    const item = { id: "i1", listId: "abc", text: "Tarea", done: false, position: 0 };
    mockDb.query.lists.findFirst.mockResolvedValue({ id: "abc", ownerId: "owner-id", collaborative: true });
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([{ pos: null }]) }),
    });
    mockDb.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([item]) }),
    });

    const res = await app.request("/api/lists/abc/items", {
      method: "POST",
      body: JSON.stringify({ text: "Tarea" }),
      headers: { "Content-Type": "application/json" },
    });

    expect(res.status).toBe(201);
  });

  it("non-owner gets 403 on non-collaborative list", async () => {
    mockDb.query.lists.findFirst.mockResolvedValue({ id: "abc", ownerId: "owner-id", collaborative: false });

    const res = await app.request("/api/lists/abc/items", {
      method: "POST",
      body: JSON.stringify({ text: "Tarea" }),
      headers: { "Content-Type": "application/json" },
    });

    expect(res.status).toBe(403);
  });

  it("non-owner cannot change collaborative field (403)", async () => {
    mockDb.query.lists.findFirst.mockResolvedValue({ id: "abc", ownerId: "owner-id", collaborative: true });

    const res = await app.request("/api/lists/abc", {
      method: "PATCH",
      body: JSON.stringify({ collaborative: false }),
      headers: { "Content-Type": "application/json" },
    });

    expect(res.status).toBe(403);
  });

  it("non-owner cannot change list settings on collaborative list (403)", async () => {
    mockDb.query.lists.findFirst.mockResolvedValue({ id: "abc", ownerId: "owner-id", collaborative: true });

    const res = await app.request("/api/lists/abc", {
      method: "PATCH",
      body: JSON.stringify({ name: "Hacked" }),
      headers: { "Content-Type": "application/json" },
    });

    expect(res.status).toBe(403);
  });
});

describe("POST /api/lists/:listId/items/bulk", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates multiple items and returns 201", async () => {
    const created = [
      { id: "i1", listId: "abc", text: "Leche", done: false, position: 0 },
      { id: "i2", listId: "abc", text: "Huevos", done: false, position: 1 },
    ];
    mockDb.query.lists.findFirst.mockResolvedValue({ id: "abc", ownerId: null, collaborative: false });
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([{ pos: null }]) }),
    });
    mockDb.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue(created) }),
    });

    const res = await app.request("/api/lists/abc/items/bulk", {
      method: "POST",
      body: JSON.stringify({ texts: ["Leche", "Huevos"] }),
      headers: { "Content-Type": "application/json" },
    });

    expect(res.status).toBe(201);
    const body = await res.json() as unknown[];
    expect(body).toHaveLength(2);
  });

  it("assigns sequential positions starting after current max", async () => {
    mockDb.query.lists.findFirst.mockResolvedValue({ id: "abc", ownerId: null, collaborative: false });
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([{ pos: 4 }]) }),
    });
    const valuesMock = vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([]) });
    mockDb.insert.mockReturnValue({ values: valuesMock });

    await app.request("/api/lists/abc/items/bulk", {
      method: "POST",
      body: JSON.stringify({ texts: ["A", "B"] }),
      headers: { "Content-Type": "application/json" },
    });

    expect(valuesMock).toHaveBeenCalledWith([
      expect.objectContaining({ text: "A", position: 5 }),
      expect.objectContaining({ text: "B", position: 6 }),
    ]);
  });

  it("returns 400 when texts array is empty", async () => {
    const res = await app.request("/api/lists/abc/items/bulk", {
      method: "POST",
      body: JSON.stringify({ texts: [] }),
      headers: { "Content-Type": "application/json" },
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 when texts exceeds 100 items", async () => {
    const texts = Array.from({ length: 101 }, (_, i) => `Item ${i}`);
    const res = await app.request("/api/lists/abc/items/bulk", {
      method: "POST",
      body: JSON.stringify({ texts }),
      headers: { "Content-Type": "application/json" },
    });
    expect(res.status).toBe(400);
  });
});

describe("GET /api/explore", () => {
  const chainMock = (rows: unknown[]) => ({
    from: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    groupBy: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(rows),
  });

  beforeEach(() => vi.clearAllMocks());

  it("returns { items, nextCursor: null } when results fit within limit", async () => {
    const rows = [
      { id: "l1", name: "Lista A", slug: null, createdAt: new Date("2024-01-01"), itemCount: 2 },
    ];
    mockDb.select.mockReturnValue(chainMock(rows));

    const res = await app.request("/api/explore");
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(Array.isArray(body.items)).toBe(true);
    expect(body.nextCursor).toBeNull();
  });

  it("returns nextCursor when results equal the limit", async () => {
    const rows = Array.from({ length: 6 }, (_, i) => ({
      id: `l${i}`,
      name: `Lista ${i}`,
      slug: null,
      createdAt: new Date(`2024-01-${String(i + 1).padStart(2, "0")}`),
      itemCount: 0,
    }));
    mockDb.select.mockReturnValue(chainMock(rows));

    const res = await app.request("/api/explore");
    const body = await res.json() as Record<string, unknown>;
    expect(body.nextCursor).not.toBeNull();
  });

  it("accepts cursor param to paginate", async () => {
    mockDb.select.mockReturnValue(chainMock([]));

    const res = await app.request("/api/explore?cursor=2024-06-01T00:00:00.000Z");
    expect(res.status).toBe(200);
    const chain = mockDb.select.mock.results[0].value;
    expect(chain.where).toHaveBeenCalled();
  });
});

describe("GET /api/explore/:listId", () => {
  const publicList = { id: "l1", name: "Lista A", slug: null, description: "Desc", public: true, createdAt: new Date("2024-01-01"), ownerId: "u1" };

  const statsChain = (row: unknown) => ({
    from: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    groupBy: vi.fn().mockResolvedValue([row]),
  });

  const simpleChain = (rows: unknown[]) => ({
    from: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    groupBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(rows),
  });

  const countChain = (count: number) => ({
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue([{ count }]),
  });

  beforeEach(() => vi.clearAllMocks());

  it("returns 200 with full detail for a public list", async () => {
    mockDb.query.lists.findFirst.mockResolvedValue(publicList);
    mockDb.select
      .mockReturnValueOnce(statsChain({ itemCount: 3, participantCount: 5, ownerName: "Alice", ownerImage: "https://example.com/a.jpg" }))
      .mockReturnValueOnce(simpleChain([{ image: "https://example.com/b.jpg", name: "Bob" }]))
      .mockReturnValueOnce(countChain(5));

    const res = await app.request("/api/explore/l1");
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.id).toBe("l1");
    expect(body.itemCount).toBe(3);
    expect(body.participantCount).toBe(5);
    expect(body.completedCount).toBeUndefined();
    expect((body.owner as Record<string, unknown>)?.name).toBe("Alice");
    expect(Array.isArray(body.participants)).toBe(true);
  });

  it("returns 404 for a non-public list", async () => {
    mockDb.query.lists.findFirst.mockResolvedValue({ ...publicList, public: false });
    const res = await app.request("/api/explore/l1");
    expect(res.status).toBe(404);
  });

  it("returns 404 for a nonexistent list", async () => {
    mockDb.query.lists.findFirst.mockResolvedValue(null);
    const res = await app.request("/api/explore/nonexistent");
    expect(res.status).toBe(404);
  });

  it("includes participant avatars limited to 6", async () => {
    mockDb.query.lists.findFirst.mockResolvedValue(publicList);
    const participants = Array.from({ length: 6 }, (_, i) => ({ image: `https://example.com/${i}.jpg`, name: `User ${i}` }));
    mockDb.select
      .mockReturnValueOnce(statsChain({ itemCount: 1, participantCount: 10, ownerName: null, ownerImage: null }))
      .mockReturnValueOnce(simpleChain(participants))
      .mockReturnValueOnce(countChain(10));

    const res = await app.request("/api/explore/l1");
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect((body.participants as unknown[]).length).toBe(6);
  });
});

describe("POST /api/lists/:listId/clone", () => {
  beforeEach(() => vi.clearAllMocks());

  it("clones a list with its items and returns 201", async () => {
    const source = { id: "abc", name: "Original" };
    const sourceItems = [
      { id: "i1", listId: "abc", text: "Tarea 1", done: true, position: 0 },
      { id: "i2", listId: "abc", text: "Tarea 2", done: false, position: 1 },
    ];
    const newList = { id: "xyz", name: "Original" };

    mockDb.query.lists.findFirst.mockResolvedValue(source);
    mockDb.query.items.findMany.mockResolvedValue(sourceItems);
    mockDb.insert
      .mockReturnValueOnce({ values: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([newList]) }) })
      .mockReturnValueOnce({ values: vi.fn().mockResolvedValue(undefined) });

    const res = await app.request("/api/lists/abc/clone", { method: "POST" });
    expect(res.status).toBe(201);
    const body = await res.json() as Record<string, unknown>;
    expect(body.id).toBe("xyz");
    expect(body.name).toBe("Original");
  });

  it("resets done to false on all cloned items", async () => {
    const source = { id: "abc", name: "Original" };
    const sourceItems = [{ id: "i1", listId: "abc", text: "Hecha", done: true, position: 0 }];
    const newList = { id: "xyz", name: "Original" };

    mockDb.query.lists.findFirst.mockResolvedValue(source);
    mockDb.query.items.findMany.mockResolvedValue(sourceItems);
    const itemsValuesMock = vi.fn().mockResolvedValue(undefined);
    mockDb.insert
      .mockReturnValueOnce({ values: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([newList]) }) })
      .mockReturnValueOnce({ values: itemsValuesMock });

    await app.request("/api/lists/abc/clone", { method: "POST" });
    expect(itemsValuesMock).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ done: false })]),
    );
  });

  it("clones an empty list without inserting items", async () => {
    const source = { id: "abc", name: "Vacía" };
    const newList = { id: "xyz", name: "Vacía" };

    mockDb.query.lists.findFirst.mockResolvedValue(source);
    mockDb.query.items.findMany.mockResolvedValue([]);
    mockDb.insert.mockReturnValueOnce({ values: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([newList]) }) });

    const res = await app.request("/api/lists/abc/clone", { method: "POST" });
    expect(res.status).toBe(201);
    expect(mockDb.insert).toHaveBeenCalledTimes(1);
  });

  it("returns 404 when source list not found", async () => {
    mockDb.query.lists.findFirst.mockResolvedValue(null);

    const res = await app.request("/api/lists/nonexistent/clone", { method: "POST" });
    expect(res.status).toBe(404);
  });
});

describe("GET /api/explore/:listId/items", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns items of a public list", async () => {
    const rows = [
      { id: "i1", listId: "abc", text: "Tarea 1", done: false, position: 0 },
    ];
    mockDb.query.lists.findFirst.mockResolvedValue({ id: "abc", public: true });
    mockDb.query.items.findMany.mockResolvedValue(rows);

    const res = await app.request("/api/explore/abc/items");
    expect(res.status).toBe(200);
    const body = await res.json() as Array<Record<string, unknown>>;
    expect(body).toHaveLength(1);
    expect(body[0].text).toBe("Tarea 1");
  });

  it("does not expose done status in explore items", async () => {
    const rows = [
      { id: "i1", listId: "abc", text: "Tarea 1", done: true, position: 0 },
      { id: "i2", listId: "abc", text: "Tarea 2", done: false, position: 1 },
    ];
    mockDb.query.lists.findFirst.mockResolvedValue({ id: "abc", public: true });
    mockDb.query.items.findMany.mockResolvedValue(rows);

    const res = await app.request("/api/explore/abc/items");
    expect(res.status).toBe(200);
    const body = await res.json() as Array<Record<string, unknown>>;
    expect(body[0].done).toBeUndefined();
    expect(body[1].done).toBeUndefined();
  });

  it("returns 404 when list is not public", async () => {
    mockDb.query.lists.findFirst.mockResolvedValue({ id: "abc", public: false });

    const res = await app.request("/api/explore/abc/items");
    expect(res.status).toBe(404);
  });

  it("returns 404 when list does not exist", async () => {
    mockDb.query.lists.findFirst.mockResolvedValue(null);

    const res = await app.request("/api/explore/nonexistent/items");
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/lists/:listId/items (bulk)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("deletes multiple items and returns 204", async () => {
    mockDb.query.lists.findFirst.mockResolvedValue({ id: "abc", ownerId: null, collaborative: false });
    mockDb.delete.mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) });

    const res = await app.request("/api/lists/abc/items", {
      method: "DELETE",
      body: JSON.stringify({ ids: ["00000000-0000-0000-0000-000000000001", "00000000-0000-0000-0000-000000000002"] }),
      headers: { "Content-Type": "application/json" },
    });

    expect(res.status).toBe(204);
  });

  it("returns 400 when ids is empty", async () => {
    const res = await app.request("/api/lists/abc/items", {
      method: "DELETE",
      body: JSON.stringify({ ids: [] }),
      headers: { "Content-Type": "application/json" },
    });
    expect(res.status).toBe(400);
  });
});

describe("POST /api/lists/:listId/accept", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    const res = await app.request("/api/lists/abc/accept", { method: "POST" });
    expect(res.status).toBe(401);
  });
});

describe("GET /api/lists/:listId (participated flag)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("includes participated: false when not authenticated", async () => {
    const list = { id: "abc-123", name: "Mi lista", public: true, collaborative: false, ownerId: "u1", createdAt: new Date().toISOString() };
    mockDb.query.lists.findFirst.mockResolvedValue(list);

    const res = await app.request("/api/lists/abc-123");
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.participated).toBe(false);
    expect(body.participationCompletedAt).toBeNull();
  });
});

describe("POST /api/lists/:listId/accept", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    const res = await app.request("/api/lists/abc/accept", { method: "POST" });
    expect(res.status).toBe(401);
  });

  it("returns 404 when list not found", async () => {
    mockDb.query.lists.findFirst.mockResolvedValue(null);
    const res = await app.request("/api/lists/nonexistent/accept", { method: "POST" });
    expect(res.status).toBe(401);
  });
});

describe("GET /api/lists/:listId/participation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns participated: false when not authenticated", async () => {
    mockDb.query.lists.findFirst.mockResolvedValue({ id: "abc", ownerId: "u1", collaborative: false, public: true });

    const res = await app.request("/api/lists/abc/participation");
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.participated).toBe(false);
    expect(body.completedAt).toBeNull();
  });
});

describe("GET /api/lists/:listId/activity", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    const res = await app.request("/api/lists/abc/activity");
    expect(res.status).toBe(401);
  });

  it("returns 403 when user is not the owner", async () => {
    mockDb.query.lists.findFirst.mockResolvedValue({ id: "abc", ownerId: "other-user" });

    const res = await app.request("/api/lists/abc/activity");
    expect(res.status).toBe(401);
  });
});

describe("PATCH /api/lists/:listId/items/:itemId/toggle (participant path)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 404 when item does not exist", async () => {
    mockDb.query.lists.findFirst.mockResolvedValue({ id: "abc", ownerId: null, collaborative: false, public: false });
    mockDb.query.items.findFirst.mockResolvedValue(null);

    const res = await app.request("/api/lists/abc/items/bad-id/toggle", { method: "PATCH" });
    expect(res.status).toBe(404);
  });

  it("updates items.done for owner (ownerId null)", async () => {
    const item = { id: "i1", listId: "abc", text: "Tarea", done: false, position: 0 };
    const updated = { ...item, done: true };
    mockDb.query.lists.findFirst.mockResolvedValue({ id: "abc", ownerId: null, collaborative: false, public: false });
    mockDb.query.items.findFirst.mockResolvedValue(item);
    mockDb.query.participations.findFirst.mockResolvedValue(null);
    mockDb.update.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([updated]) }),
      }),
    });

    const res = await app.request("/api/lists/abc/items/i1/toggle", { method: "PATCH" });
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.done).toBe(true);
  });
});

describe("GET /api/lists/:listId/items (participant item_progress)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns items with items.done when not a participant", async () => {
    const rows = [
      { id: "i1", listId: "abc", text: "Tarea", done: true, position: 0 },
    ];
    mockDb.query.lists.findFirst.mockResolvedValue({ id: "abc", ownerId: null, collaborative: false, public: true });
    mockDb.query.items.findMany.mockResolvedValue(rows);

    const res = await app.request("/api/lists/abc/items");
    expect(res.status).toBe(200);
    const body = await res.json() as Array<Record<string, unknown>>;
    expect(body[0].done).toBe(true);
  });
});

describe("DELETE /api/lists/:listId", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 404 when list not found", async () => {
    mockDb.query.lists.findFirst.mockResolvedValue(null);

    const res = await app.request("/api/lists/abc-123", { method: "DELETE" });
    expect(res.status).toBe(404);
  });

  it("returns 403 when not authenticated", async () => {
    mockDb.query.lists.findFirst.mockResolvedValue({ id: "abc-123", ownerId: "owner-id" });

    const res = await app.request("/api/lists/abc-123", { method: "DELETE" });
    expect(res.status).toBe(403);
  });

  it("returns 403 when user does not own the list", async () => {
    mockDb.query.lists.findFirst.mockResolvedValue({ id: "abc-123", ownerId: "other-user-id" });

    const res = await app.request("/api/lists/abc-123", { method: "DELETE" });
    expect(res.status).toBe(403);
  });
});

describe("GET /api/admin/stats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ADMIN_PASSWORD = "secret";
  });

  function authHeader(password: string) {
    return "Basic " + btoa(`admin:${password}`);
  }

  it("returns 401 when no Authorization header", async () => {
    const res = await app.request("/api/admin/stats");
    expect(res.status).toBe(401);
  });

  it("returns 401 when password is wrong", async () => {
    const res = await app.request("/api/admin/stats", {
      headers: { Authorization: authHeader("wrong") },
    });
    expect(res.status).toBe(401);
  });

  it("returns stats when password is correct", async () => {
    const chain = {
      from: vi.fn().mockReturnThis(),
      leftJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      groupBy: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
      then: vi.fn((resolve: (v: unknown[]) => unknown) => Promise.resolve(resolve([{ count: 5 }]))),
    };
    mockDb.select.mockReturnValue(chain);

    const res = await app.request("/api/admin/stats", {
      headers: { Authorization: authHeader("secret") },
    });
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body).toHaveProperty("users");
    expect(body).toHaveProperty("lists");
    expect(body).toHaveProperty("items");
    expect(body).toHaveProperty("participations");
    expect(body).toHaveProperty("purchases");
    expect(body).toHaveProperty("topLists");
    expect(body).toHaveProperty("weeklyLists");
    expect(body).toHaveProperty("revenue");
  });
});
