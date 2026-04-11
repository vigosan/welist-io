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
    mockDb.query.lists.findFirst.mockResolvedValue({ id: "abc" });
    mockDb.query.items.findMany.mockResolvedValue(rows);

    const res = await app.request("/api/lists/abc/items");
    expect(res.status).toBe(200);
    const body = await res.json() as Array<Record<string, unknown>>;
    expect(body).toHaveLength(2);
    expect(body[0].text).toBe("Primero");
  });
});

describe("POST /api/lists/:listId/items", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.transaction.mockImplementation((fn: (tx: typeof mockDb) => Promise<unknown>) => fn(mockDb));
  });

  it("creates an item and returns 201", async () => {
    const item = { id: "i1", listId: "abc", text: "Nueva tarea", done: false, position: 0 };
    mockDb.query.lists.findFirst.mockResolvedValue({ id: "abc" });
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

  it("uses a transaction to avoid race conditions on position", async () => {
    const item = { id: "i1", listId: "abc", text: "Tarea", done: false, position: 0 };
    mockDb.query.lists.findFirst.mockResolvedValue({ id: "abc" });
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ pos: null }]),
      }),
    });
    mockDb.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([item]) }),
    });

    await app.request("/api/lists/abc/items", {
      method: "POST",
      body: JSON.stringify({ text: "Tarea" }),
      headers: { "Content-Type": "application/json" },
    });

    expect(mockDb.transaction).toHaveBeenCalledTimes(1);
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
    mockDb.query.lists.findFirst.mockResolvedValue({ id: "abc" });
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
    mockDb.query.lists.findFirst.mockResolvedValue({ id: "abc" });
    mockDb.delete.mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    });

    const res = await app.request("/api/lists/abc/items/i1", { method: "DELETE" });
    expect(res.status).toBe(204);
  });
});

describe("POST /api/lists/:listId/items/bulk", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.transaction.mockImplementation((fn: (tx: typeof mockDb) => Promise<unknown>) => fn(mockDb));
  });

  it("creates multiple items and returns 201", async () => {
    const created = [
      { id: "i1", listId: "abc", text: "Leche", done: false, position: 0 },
      { id: "i2", listId: "abc", text: "Huevos", done: false, position: 1 },
    ];
    mockDb.query.lists.findFirst.mockResolvedValue({ id: "abc" });
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

  it("uses a transaction for atomicity", async () => {
    const created = [{ id: "i1", listId: "abc", text: "Pan", done: false, position: 0 }];
    mockDb.query.lists.findFirst.mockResolvedValue({ id: "abc" });
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([{ pos: 2 }]) }),
    });
    mockDb.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue(created) }),
    });

    await app.request("/api/lists/abc/items/bulk", {
      method: "POST",
      body: JSON.stringify({ texts: ["Pan"] }),
      headers: { "Content-Type": "application/json" },
    });

    expect(mockDb.transaction).toHaveBeenCalledTimes(1);
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
