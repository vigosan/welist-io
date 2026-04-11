import { describe, it, expect, vi, beforeEach } from "vitest";

const mockDb = {
  query: {
    lists: { findFirst: vi.fn() },
    items: { findMany: vi.fn() },
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
    const list = { id: "abc-123", name: "Mi lista", createdAt: new Date().toISOString() };
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
});

describe("GET /api/lists/:listId/items", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns items ordered by position", async () => {
    const rows = [
      { id: "i1", listId: "abc", text: "Primero", done: false, position: 0 },
      { id: "i2", listId: "abc", text: "Segundo", done: true, position: 1 },
    ];
    mockDb.query.lists.findFirst.mockResolvedValue({ id: "abc", ownerId: null });
    mockDb.query.items.findMany.mockResolvedValue(rows);

    const res = await app.request("/api/lists/abc/items");
    expect(res.status).toBe(200);
    const body = await res.json() as Array<Record<string, unknown>>;
    expect(body).toHaveLength(2);
    expect(body[0].text).toBe("Primero");
  });
});

describe("POST /api/lists/:listId/items", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates an item and returns 201", async () => {
    const item = { id: "i1", listId: "abc", text: "Nueva tarea", done: false, position: 0 };
    mockDb.query.lists.findFirst.mockResolvedValue({ id: "abc", ownerId: null });
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

  it("assigns position 0 when list has no items", async () => {
    const item = { id: "i1", listId: "abc", text: "Primero", done: false, position: 0 };
    mockDb.query.lists.findFirst.mockResolvedValue({ id: "abc", ownerId: null });
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

    expect(valuesMock).toHaveBeenCalledWith(expect.objectContaining({ position: 0 }));
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
    const updated = { id: "i1", listId: "abc", text: "Tarea", done: true, position: 0 };
    mockDb.query.lists.findFirst.mockResolvedValue({ id: "abc", ownerId: null });
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
    mockDb.query.lists.findFirst.mockResolvedValue({ id: "abc", ownerId: null });
    mockDb.update.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([]) }),
      }),
    });

    const res = await app.request("/api/lists/abc/items/bad-id/toggle", { method: "PATCH" });
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/lists/:listId/items/:itemId", () => {
  beforeEach(() => vi.clearAllMocks());

  it("deletes an item and returns 204", async () => {
    mockDb.query.lists.findFirst.mockResolvedValue({ id: "abc", ownerId: null });
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
    mockDb.query.lists.findFirst.mockResolvedValue({ id: "abc", ownerId: null });
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
    mockDb.query.lists.findFirst.mockResolvedValue({ id: "abc", ownerId: null });
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
    mockDb.query.lists.findFirst.mockResolvedValue({ id: "abc", ownerId: "other-user-id" });

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
    mockDb.query.lists.findFirst.mockResolvedValue({ id: "abc", ownerId: null });
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
    mockDb.query.lists.findFirst.mockResolvedValue({ id: "abc", ownerId: null });
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
    const rows = Array.from({ length: 20 }, (_, i) => ({
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
