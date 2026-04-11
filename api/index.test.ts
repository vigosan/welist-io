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
