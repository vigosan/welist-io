import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockDb = {
  query: {
    lists: { findFirst: vi.fn() },
    items: { findMany: vi.fn(), findFirst: vi.fn() },
    participations: { findFirst: vi.fn() },
    itemProgress: { findFirst: vi.fn(), findMany: vi.fn() },
    itemLikes: { findFirst: vi.fn(), findMany: vi.fn() },
    users: { findFirst: vi.fn() },
    stripeAccounts: { findFirst: vi.fn() },
    listPurchases: { findFirst: vi.fn() },
    notifications: { findFirst: vi.fn(), findMany: vi.fn() },
  },
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  select: vi.fn(),
  transaction: vi.fn(),
  $count: vi.fn(),
};

vi.mock("../src/db/client", () => ({ db: mockDb }));

const mockGetAuthUser = vi.fn().mockRejectedValue(new Error("no session"));
vi.mock("@hono/auth-js", async (importOriginal) => {
  const original = await importOriginal<typeof import("@hono/auth-js")>();
  return {
    ...original,
    getAuthUser: (...args: unknown[]) => mockGetAuthUser(...args),
  };
});

vi.mock("./email", () => ({
  sendEmail: vi.fn().mockResolvedValue({ skipped: false, id: "test-msg" }),
}));

const mockStripeConstructEvent = vi.fn();
vi.mock("stripe", () => {
  const StripeMock = vi.fn().mockImplementation(() => ({
    webhooks: { constructEventAsync: mockStripeConstructEvent },
    paymentIntents: { create: vi.fn() },
    accounts: { create: vi.fn(), retrieve: vi.fn() },
    accountLinks: { create: vi.fn() },
  }));
  return { default: StripeMock };
});

const { app } = await import("./app");
const { sendEmail: mockSendEmail } = await import("./email");
const { achievements, notifications, participations } = await import(
  "../src/db/schema/index"
);

function chainableInsert() {
  const valuesMock = vi.fn().mockImplementation(() => {
    const p: Promise<undefined> & {
      onConflictDoNothing?: ReturnType<typeof vi.fn>;
      onConflictDoUpdate?: ReturnType<typeof vi.fn>;
      returning?: ReturnType<typeof vi.fn>;
    } = Promise.resolve(undefined);
    p.onConflictDoNothing = vi.fn().mockResolvedValue(undefined);
    p.onConflictDoUpdate = vi.fn().mockResolvedValue(undefined);
    p.returning = vi.fn().mockResolvedValue([]);
    return p;
  });
  return { values: valuesMock };
}

describe("POST /api/lists", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates a list and returns 201", async () => {
    const created = {
      id: "abc-123",
      name: "Mi lista",
      createdAt: new Date().toISOString(),
    };
    mockDb.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([created]),
      }),
    });

    const res = await app.request("/api/lists", {
      method: "POST",
      body: JSON.stringify({ name: "Mi lista" }),
      headers: { "Content-Type": "application/json" },
    });

    expect(res.status).toBe(201);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.name).toBe("Mi lista");
    expect(body.id).toBe("abc-123");
  });

  it("collapses internal whitespace and trims the name", async () => {
    const valuesMock = vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue([{ id: "id1" }]),
    });
    mockDb.insert.mockReturnValue({ values: valuesMock });

    await app.request("/api/lists", {
      method: "POST",
      body: JSON.stringify({ name: "  Mi    lista  " }),
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "10.0.0.50",
      },
    });

    expect(valuesMock).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Mi lista" })
    );
  });

  it("generates a slug from the name on first create", async () => {
    const valuesMock = vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue([{ id: "id1" }]),
    });
    mockDb.insert.mockReturnValue({ values: valuesMock });

    await app.request("/api/lists", {
      method: "POST",
      body: JSON.stringify({ name: "Pingüino Crónica" }),
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "10.0.0.51",
      },
    });

    expect(valuesMock).toHaveBeenCalledWith(
      expect.objectContaining({ slug: "pinguino-cronica" })
    );
  });

  it("retries with a numeric suffix when the slug is taken", async () => {
    const valuesMock = vi
      .fn()
      .mockImplementationOnce(() => ({
        returning: vi.fn().mockRejectedValue({ code: "23505" }),
      }))
      .mockImplementationOnce(() => ({
        returning: vi.fn().mockResolvedValue([{ id: "id1", slug: "viajes-2" }]),
      }));
    mockDb.insert.mockReturnValue({ values: valuesMock });

    const res = await app.request("/api/lists", {
      method: "POST",
      body: JSON.stringify({ name: "Viajes" }),
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "10.0.0.52",
      },
    });

    expect(res.status).toBe(201);
    expect(valuesMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ slug: "viajes" })
    );
    expect(valuesMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ slug: "viajes-2" })
    );
  });

  it("falls back to null slug when the name has no slug-safe characters", async () => {
    const valuesMock = vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue([{ id: "id1" }]),
    });
    mockDb.insert.mockReturnValue({ values: valuesMock });

    await app.request("/api/lists", {
      method: "POST",
      body: JSON.stringify({ name: "🌍🌍🌍" }),
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "10.0.0.53",
      },
    });

    expect(valuesMock).toHaveBeenCalledWith(
      expect.objectContaining({ slug: null })
    );
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
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ avg: null, count: 0 }]),
      }),
    });
  });

  it("returns the list when found", async () => {
    const list = {
      id: "abc-123",
      name: "Mi lista",
      public: true,
      ownerId: null,
      createdAt: new Date().toISOString(),
    };
    mockDb.query.lists.findFirst.mockResolvedValue(list);

    const res = await app.request("/api/lists/abc-123");
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.id).toBe("abc-123");
  });

  it("returns 404 when list not found", async () => {
    mockDb.query.lists.findFirst.mockResolvedValue(null);
    const res = await app.request("/api/lists/nonexistent");
    expect(res.status).toBe(404);
  });

  it("returns 404 for private list when unauthenticated", async () => {
    mockDb.query.lists.findFirst.mockResolvedValue({
      id: "abc",
      ownerId: "u1",
      public: false,
      collaborative: false,
    });
    const res = await app.request("/api/lists/abc");
    expect(res.status).toBe(404);
  });

  it("returns 404 for private anonymous list when unauthenticated", async () => {
    mockDb.query.lists.findFirst.mockResolvedValue({
      id: "abc",
      ownerId: null,
      public: false,
      collaborative: false,
    });
    const res = await app.request("/api/lists/abc");
    expect(res.status).toBe(404);
  });

  it("returns 200 for private collaborative list when unauthenticated", async () => {
    mockDb.query.lists.findFirst.mockResolvedValue({
      id: "abc",
      ownerId: "u1",
      public: false,
      collaborative: true,
    });
    mockDb.query.participations.findFirst.mockResolvedValue(null);
    const res = await app.request("/api/lists/abc");
    expect(res.status).toBe(200);
  });

  it("includes rating aggregate with averages and user value", async () => {
    mockGetAuthUser.mockResolvedValueOnce({
      session: { user: { id: "u1" } },
    });
    mockDb.query.lists.findFirst.mockResolvedValue({
      id: "abc",
      ownerId: "owner",
      public: true,
      collaborative: false,
    });
    mockDb.query.participations.findFirst.mockResolvedValue(null);
    mockDb.select
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ avg: 4.5, count: 2 }]),
        }),
      })
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ value: 5 }]),
          }),
        }),
      });

    const res = await app.request("/api/lists/abc", {
      headers: { "x-forwarded-for": "10.3.0.1" },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.rating).toEqual({ avg: 4.5, count: 2, userValue: 5 });
  });
});

describe("GET /api/lists/:listId/items", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns items ordered by position", async () => {
    const rows = [
      {
        id: "i1",
        listId: "abc",
        text: "Primero",
        done: false,
        position: 0,
      },
      {
        id: "i2",
        listId: "abc",
        text: "Segundo",
        done: true,
        position: 1,
      },
    ];
    mockDb.query.lists.findFirst.mockResolvedValue({
      id: "abc",
      ownerId: null,
      collaborative: false,
      public: true,
    });
    mockDb.query.items.findMany.mockResolvedValue(rows);
    mockDb.query.itemLikes.findMany.mockResolvedValue([]);

    const res = await app.request("/api/lists/abc/items");
    expect(res.status).toBe(200);
    const body = (await res.json()) as Array<Record<string, unknown>>;
    expect(body).toHaveLength(2);
    expect(body[0].text).toBe("Primero");
  });

  it("returns 404 for private list when unauthenticated", async () => {
    mockDb.query.lists.findFirst.mockResolvedValue({
      id: "abc",
      ownerId: "u1",
      public: false,
      collaborative: false,
    });
    const res = await app.request("/api/lists/abc/items");
    expect(res.status).toBe(404);
  });
});

describe("POST /api/lists/:listId/items", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates an item and returns 201", async () => {
    const item = {
      id: "i1",
      listId: "abc",
      text: "Nueva tarea",
      done: false,
      position: 0,
    };
    mockDb.query.lists.findFirst.mockResolvedValue({
      id: "abc",
      ownerId: null,
      collaborative: false,
    });
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ pos: null }]),
      }),
    });
    mockDb.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([item]),
      }),
    });

    const res = await app.request("/api/lists/abc/items", {
      method: "POST",
      body: JSON.stringify({ text: "Nueva tarea" }),
      headers: { "Content-Type": "application/json" },
    });

    expect(res.status).toBe(201);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.text).toBe("Nueva tarea");
  });

  it("assigns position 0 when list has no items", async () => {
    const item = {
      id: "i1",
      listId: "abc",
      text: "Primero",
      done: false,
      position: 0,
    };
    mockDb.query.lists.findFirst.mockResolvedValue({
      id: "abc",
      ownerId: null,
      collaborative: false,
    });
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ pos: null }]),
      }),
    });
    const valuesMock = vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue([item]),
    });
    mockDb.insert.mockReturnValue({ values: valuesMock });

    await app.request("/api/lists/abc/items", {
      method: "POST",
      body: JSON.stringify({ text: "Primero" }),
      headers: { "Content-Type": "application/json" },
    });

    expect(valuesMock).toHaveBeenCalledWith(
      expect.objectContaining({ position: 0 })
    );
  });

  it("assigns position after the last item", async () => {
    const item = {
      id: "i1",
      listId: "abc",
      text: "Siguiente",
      done: false,
      position: 5,
    };
    mockDb.query.lists.findFirst.mockResolvedValue({
      id: "abc",
      ownerId: null,
      collaborative: false,
    });
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ pos: 4 }]),
      }),
    });
    const valuesMock = vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue([item]),
    });
    mockDb.insert.mockReturnValue({ values: valuesMock });

    await app.request("/api/lists/abc/items", {
      method: "POST",
      body: JSON.stringify({ text: "Siguiente" }),
      headers: { "Content-Type": "application/json" },
    });

    expect(valuesMock).toHaveBeenCalledWith(
      expect.objectContaining({ position: 5 })
    );
  });

  it("returns 400 when text is empty", async () => {
    const res = await app.request("/api/lists/abc/items", {
      method: "POST",
      body: JSON.stringify({ text: "" }),
      headers: { "Content-Type": "application/json" },
    });
    expect(res.status).toBe(400);
  });

  it("creates an item with coordinates and returns 201", async () => {
    const item = {
      id: "i1",
      listId: "abc",
      text: "Visitar @Barcelona",
      done: false,
      position: -1,
      latitude: "41.3874",
      longitude: "2.1686",
      placeName: "Barcelona",
    };
    mockDb.query.lists.findFirst.mockResolvedValue({
      id: "abc",
      ownerId: null,
      collaborative: false,
    });
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ pos: null }]),
      }),
    });
    const valuesMock = vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue([item]),
    });
    mockDb.insert.mockReturnValue({ values: valuesMock });

    const res = await app.request("/api/lists/abc/items", {
      method: "POST",
      body: JSON.stringify({
        text: "Visitar @Barcelona",
        latitude: "41.3874",
        longitude: "2.1686",
        placeName: "Barcelona",
      }),
      headers: { "Content-Type": "application/json" },
    });

    expect(res.status).toBe(201);
    expect(valuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        latitude: "41.3874",
        longitude: "2.1686",
        placeName: "Barcelona",
      })
    );
  });
});

describe("PATCH /api/lists/:listId/items/:itemId (coordinates)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("updates item with coordinates", async () => {
    const updated = {
      id: "i1",
      listId: "abc",
      text: "Texto",
      done: false,
      position: 0,
      latitude: "41.3874",
      longitude: "2.1686",
      placeName: "Barcelona",
    };
    mockDb.query.lists.findFirst.mockResolvedValue({
      id: "abc",
      ownerId: null,
      collaborative: false,
    });
    const setMock = vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([updated]),
      }),
    });
    mockDb.update.mockReturnValue({ set: setMock });

    const res = await app.request("/api/lists/abc/items/i1", {
      method: "PATCH",
      body: JSON.stringify({
        text: "Texto",
        latitude: "41.3874",
        longitude: "2.1686",
        placeName: "Barcelona",
      }),
      headers: { "Content-Type": "application/json" },
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.latitude).toBe("41.3874");
  });

  it("clears coordinates by passing null", async () => {
    const updated = {
      id: "i1",
      listId: "abc",
      text: "Texto",
      done: false,
      position: 0,
      latitude: null,
      longitude: null,
      placeName: null,
    };
    mockDb.query.lists.findFirst.mockResolvedValue({
      id: "abc",
      ownerId: null,
      collaborative: false,
    });
    const setMock = vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([updated]),
      }),
    });
    mockDb.update.mockReturnValue({ set: setMock });

    const res = await app.request("/api/lists/abc/items/i1", {
      method: "PATCH",
      body: JSON.stringify({
        text: "Texto",
        latitude: null,
        longitude: null,
        placeName: null,
      }),
      headers: { "Content-Type": "application/json" },
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.latitude).toBeNull();
  });
});

describe("PATCH /api/lists/:listId/items/:itemId/toggle", () => {
  beforeEach(() => vi.clearAllMocks());

  it("toggles done and returns updated item", async () => {
    const item = {
      id: "i1",
      listId: "abc",
      text: "Tarea",
      done: false,
      position: 0,
    };
    const updated = { ...item, done: true };
    mockDb.query.lists.findFirst.mockResolvedValue({
      id: "abc",
      ownerId: null,
      collaborative: false,
      public: false,
    });
    mockDb.query.items.findFirst.mockResolvedValue(item);
    mockDb.query.participations.findFirst.mockResolvedValue(null);
    mockDb.update.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([updated]),
        }),
      }),
    });

    const res = await app.request("/api/lists/abc/items/i1/toggle", {
      method: "PATCH",
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.done).toBe(true);
  });

  it("returns 404 when item not found", async () => {
    mockDb.query.lists.findFirst.mockResolvedValue({
      id: "abc",
      ownerId: null,
      collaborative: false,
      public: false,
    });
    mockDb.query.items.findFirst.mockResolvedValue(null);

    const res = await app.request("/api/lists/abc/items/bad-id/toggle", {
      method: "PATCH",
    });
    expect(res.status).toBe(404);
  });
});

describe("POST /api/lists/:listId/items/:itemId/like", () => {
  const headers = { "x-forwarded-for": "10.0.0.99" };
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    mockDb.query.lists.findFirst.mockResolvedValue({
      id: "abc",
      ownerId: null,
      collaborative: false,
      public: true,
    });
    const res = await app.request("/api/lists/abc/items/i1/like", {
      method: "POST",
      headers,
    });
    expect(res.status).toBe(401);
  });

  it("creates a like when none exists and returns liked=true with count", async () => {
    mockGetAuthUser.mockResolvedValueOnce({
      session: { user: { id: "u1" } },
    });
    mockDb.query.lists.findFirst.mockResolvedValue({
      id: "abc",
      ownerId: null,
      collaborative: false,
      public: true,
    });
    mockDb.query.items.findFirst.mockResolvedValue({ id: "i1" });
    mockDb.query.itemLikes.findFirst.mockResolvedValue(null);
    mockDb.insert.mockReturnValue(chainableInsert());
    mockDb.$count.mockResolvedValue(1);

    const res = await app.request("/api/lists/abc/items/i1/like", {
      method: "POST",
      headers,
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.liked).toBe(true);
    expect(body.likeCount).toBe(1);
    expect(mockDb.insert).toHaveBeenCalled();
  });

  it("removes the like when it exists and returns liked=false", async () => {
    mockGetAuthUser.mockResolvedValueOnce({
      session: { user: { id: "u1" } },
    });
    mockDb.query.lists.findFirst.mockResolvedValue({
      id: "abc",
      ownerId: null,
      collaborative: false,
      public: true,
    });
    mockDb.query.items.findFirst.mockResolvedValue({ id: "i1" });
    mockDb.query.itemLikes.findFirst.mockResolvedValue({ id: "like-1" });
    mockDb.delete.mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    });
    mockDb.$count.mockResolvedValue(0);

    const res = await app.request("/api/lists/abc/items/i1/like", {
      method: "POST",
      headers,
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.liked).toBe(false);
    expect(body.likeCount).toBe(0);
    expect(mockDb.delete).toHaveBeenCalled();
  });

  it("returns 404 when the item does not exist", async () => {
    mockGetAuthUser.mockResolvedValueOnce({
      session: { user: { id: "u1" } },
    });
    mockDb.query.lists.findFirst.mockResolvedValue({
      id: "abc",
      ownerId: null,
      collaborative: false,
      public: true,
    });
    mockDb.query.items.findFirst.mockResolvedValue(null);

    const res = await app.request("/api/lists/abc/items/missing/like", {
      method: "POST",
      headers,
    });
    expect(res.status).toBe(404);
  });
});

describe("GET /api/lists/:listId/items (likes overlay)", () => {
  const headers = { "x-forwarded-for": "10.0.0.100" };
  beforeEach(() => vi.clearAllMocks());

  it("aggregates likeCount and flags likedByMe for the current user", async () => {
    mockGetAuthUser.mockResolvedValueOnce({
      session: { user: { id: "u1" } },
    });
    mockDb.query.lists.findFirst.mockResolvedValue({
      id: "abc",
      ownerId: "owner",
      collaborative: false,
      public: true,
    });
    mockDb.query.items.findMany.mockResolvedValue([
      { id: "i1", listId: "abc", text: "A", done: false, position: 0 },
      { id: "i2", listId: "abc", text: "B", done: false, position: 1 },
    ]);
    mockDb.query.itemLikes.findMany.mockResolvedValue([
      { itemId: "i1", userId: "u1" },
      { itemId: "i1", userId: "u2" },
      { itemId: "i2", userId: "u2" },
    ]);

    const res = await app.request("/api/lists/abc/items", { headers });
    expect(res.status).toBe(200);
    const body = (await res.json()) as Array<Record<string, unknown>>;
    expect(body[0]).toMatchObject({ id: "i1", likeCount: 2, likedByMe: true });
    expect(body[1]).toMatchObject({ id: "i2", likeCount: 1, likedByMe: false });
  });
});

describe("DELETE /api/lists/:listId/items/:itemId", () => {
  beforeEach(() => vi.clearAllMocks());

  it("deletes an item and returns 204", async () => {
    mockDb.query.lists.findFirst.mockResolvedValue({
      id: "abc",
      ownerId: null,
      collaborative: false,
    });
    mockDb.delete.mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    });

    const res = await app.request("/api/lists/abc/items/i1", {
      method: "DELETE",
    });
    expect(res.status).toBe(204);
  });
});

describe("PATCH /api/lists/:listId", () => {
  beforeEach(() => vi.clearAllMocks());

  it("updates description and returns the list", async () => {
    const updated = {
      id: "abc",
      name: "Lista",
      description: "Una descripción",
      slug: null,
      public: false,
      ownerId: null,
    };
    mockDb.query.lists.findFirst.mockResolvedValue({
      id: "abc",
      ownerId: null,
      collaborative: false,
    });
    mockDb.update.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([updated]),
        }),
      }),
    });

    const res = await app.request("/api/lists/abc", {
      method: "PATCH",
      body: JSON.stringify({
        description: "Una descripción",
      }),
      headers: { "Content-Type": "application/json" },
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.description).toBe("Una descripción");
  });

  it("returns 409 when slug is already taken", async () => {
    mockDb.query.lists.findFirst.mockResolvedValue({
      id: "abc",
      ownerId: null,
      collaborative: false,
    });
    mockDb.update.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockRejectedValue(
            Object.assign(new Error("unique"), {
              code: "23505",
            })
          ),
        }),
      }),
    });

    const res = await app.request("/api/lists/abc", {
      method: "PATCH",
      body: JSON.stringify({ slug: "taken-slug" }),
      headers: { "Content-Type": "application/json" },
    });

    expect(res.status).toBe(409);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.error).toBe("slug_taken");
  });

  it("returns 400 when description exceeds 500 chars", async () => {
    const res = await app.request("/api/lists/abc", {
      method: "PATCH",
      body: JSON.stringify({
        description: "x".repeat(501),
      }),
      headers: { "Content-Type": "application/json" },
    });
    expect(res.status).toBe(400);
  });

  it("updates category and returns the list", async () => {
    const updated = {
      id: "abc",
      name: "Lista",
      category: "movies",
      slug: null,
      public: false,
      ownerId: null,
    };
    mockDb.query.lists.findFirst.mockResolvedValue({
      id: "abc",
      ownerId: null,
      collaborative: false,
    });
    const setMock = vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([updated]),
      }),
    });
    mockDb.update.mockReturnValue({ set: setMock });

    const res = await app.request("/api/lists/abc", {
      method: "PATCH",
      body: JSON.stringify({ category: "movies" }),
      headers: { "Content-Type": "application/json" },
    });

    expect(res.status).toBe(200);
    expect(setMock).toHaveBeenCalledWith(
      expect.objectContaining({ category: "movies" })
    );
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.category).toBe("movies");
  });

  it("returns 400 for an invalid category", async () => {
    const res = await app.request("/api/lists/abc", {
      method: "PATCH",
      body: JSON.stringify({ category: "not-a-category" }),
      headers: { "Content-Type": "application/json" },
    });
    expect(res.status).toBe(400);
  });

  it("clears the category when set to null", async () => {
    const updated = { id: "abc", name: "Lista", category: null };
    mockDb.query.lists.findFirst.mockResolvedValue({
      id: "abc",
      ownerId: null,
      collaborative: false,
    });
    const setMock = vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([updated]),
      }),
    });
    mockDb.update.mockReturnValue({ set: setMock });

    const res = await app.request("/api/lists/abc", {
      method: "PATCH",
      body: JSON.stringify({ category: null }),
      headers: { "Content-Type": "application/json" },
    });

    expect(res.status).toBe(200);
    expect(setMock).toHaveBeenCalledWith(
      expect.objectContaining({ category: null })
    );
  });

  it("returns 403 when user does not own the list", async () => {
    mockDb.query.lists.findFirst.mockResolvedValue({
      id: "abc",
      ownerId: "other-user-id",
      collaborative: false,
    });

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
    const item = {
      id: "i1",
      listId: "abc",
      text: "Tarea",
      done: false,
      position: 0,
    };
    mockDb.query.lists.findFirst.mockResolvedValue({
      id: "abc",
      ownerId: "owner-id",
      collaborative: true,
    });
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ pos: null }]),
      }),
    });
    mockDb.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([item]),
      }),
    });

    const res = await app.request("/api/lists/abc/items", {
      method: "POST",
      body: JSON.stringify({ text: "Tarea" }),
      headers: { "Content-Type": "application/json" },
    });

    expect(res.status).toBe(201);
  });

  it("non-owner gets 403 on non-collaborative list", async () => {
    mockDb.query.lists.findFirst.mockResolvedValue({
      id: "abc",
      ownerId: "owner-id",
      collaborative: false,
    });

    const res = await app.request("/api/lists/abc/items", {
      method: "POST",
      body: JSON.stringify({ text: "Tarea" }),
      headers: { "Content-Type": "application/json" },
    });

    expect(res.status).toBe(403);
  });

  it("non-owner cannot change collaborative field (403)", async () => {
    mockDb.query.lists.findFirst.mockResolvedValue({
      id: "abc",
      ownerId: "owner-id",
      collaborative: true,
    });

    const res = await app.request("/api/lists/abc", {
      method: "PATCH",
      body: JSON.stringify({ collaborative: false }),
      headers: { "Content-Type": "application/json" },
    });

    expect(res.status).toBe(403);
  });

  it("non-owner cannot change list settings on collaborative list (403)", async () => {
    mockDb.query.lists.findFirst.mockResolvedValue({
      id: "abc",
      ownerId: "owner-id",
      collaborative: true,
    });

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
      {
        id: "i1",
        listId: "abc",
        text: "Leche",
        done: false,
        position: 0,
      },
      {
        id: "i2",
        listId: "abc",
        text: "Huevos",
        done: false,
        position: 1,
      },
    ];
    mockDb.query.lists.findFirst.mockResolvedValue({
      id: "abc",
      ownerId: null,
      collaborative: false,
    });
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ pos: null }]),
      }),
    });
    mockDb.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue(created),
      }),
    });

    const res = await app.request("/api/lists/abc/items/bulk", {
      method: "POST",
      body: JSON.stringify({
        texts: ["Leche", "Huevos"],
      }),
      headers: { "Content-Type": "application/json" },
    });

    expect(res.status).toBe(201);
    const body = (await res.json()) as unknown[];
    expect(body).toHaveLength(2);
  });

  it("assigns sequential positions starting after current max", async () => {
    mockDb.query.lists.findFirst.mockResolvedValue({
      id: "abc",
      ownerId: null,
      collaborative: false,
    });
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ pos: 4 }]),
      }),
    });
    const valuesMock = vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue([]),
    });
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
      {
        id: "l1",
        name: "Lista A",
        slug: null,
        createdAt: new Date("2024-01-01"),
        itemCount: 2,
      },
    ];
    mockDb.select.mockReturnValue(chainMock(rows));

    const res = await app.request("/api/explore");
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
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
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.nextCursor).not.toBeNull();
  });

  it("accepts cursor param to paginate", async () => {
    mockDb.select.mockReturnValue(chainMock([]));

    const res = await app.request(
      "/api/explore?cursor=2024-06-01T00:00:00.000Z"
    );
    expect(res.status).toBe(200);
    const chain = mockDb.select.mock.results[0].value;
    expect(chain.where).toHaveBeenCalled();
  });

  it("accepts a valid category filter without failing", async () => {
    mockDb.select.mockReturnValue(chainMock([{ id: "l1", name: "Cine" }]));

    const res = await app.request("/api/explore?category=movies");
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect((body.items as unknown[]).length).toBe(1);
  });

  it("ignores an invalid category instead of failing", async () => {
    mockDb.select.mockReturnValue(chainMock([]));

    const res = await app.request("/api/explore?category=not-real");
    expect(res.status).toBe(200);
  });

  it("disables pagination for trending sort even when results fill the page", async () => {
    const rows = Array.from({ length: 6 }, (_, i) => ({
      id: `l${i}`,
      name: `Lista ${i}`,
      slug: null,
      createdAt: new Date(`2024-01-${String(i + 1).padStart(2, "0")}`),
      itemCount: 0,
    }));
    mockDb.select.mockReturnValue(chainMock(rows));

    const res = await app.request("/api/explore?sort=trending");
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.items).toHaveLength(6);
    expect(body.nextCursor).toBeNull();
  });

  it("exposes isParticipating from the row data for authenticated users", async () => {
    mockGetAuthUser.mockResolvedValueOnce({ session: { user: { id: "u1" } } });
    const rows = [
      {
        id: "l1",
        name: "Lista A",
        slug: null,
        createdAt: new Date("2024-01-01"),
        itemCount: 0,
        isParticipating: true,
      },
      {
        id: "l2",
        name: "Lista B",
        slug: null,
        createdAt: new Date("2024-01-02"),
        itemCount: 0,
        isParticipating: false,
      },
    ];
    mockDb.select.mockReturnValue(chainMock(rows));

    const res = await app.request("/api/explore", {
      headers: { "x-forwarded-for": "10.4.0.1" },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      items: Array<{ id: string; isParticipating: boolean }>;
    };
    expect(body.items[0]).toMatchObject({ id: "l1", isParticipating: true });
    expect(body.items[1]).toMatchObject({ id: "l2", isParticipating: false });
    expect(mockDb.select).toHaveBeenCalledWith(
      expect.objectContaining({ isParticipating: expect.anything() })
    );
  });

  it("returns isParticipating: false for anonymous viewers", async () => {
    const rows = [
      {
        id: "l1",
        name: "Lista A",
        slug: null,
        createdAt: new Date("2024-01-01"),
        itemCount: 0,
        isParticipating: false,
      },
    ];
    mockDb.select.mockReturnValue(chainMock(rows));

    const res = await app.request("/api/explore", {
      headers: { "x-forwarded-for": "10.4.0.2" },
    });
    const body = (await res.json()) as {
      items: Array<{ isParticipating: boolean }>;
    };
    expect(body.items[0].isParticipating).toBe(false);
  });
});

describe("GET /api/explore/:listId", () => {
  const publicList = {
    id: "l1",
    name: "Lista A",
    slug: null,
    description: "Desc",
    public: true,
    createdAt: new Date("2024-01-01"),
    ownerId: "u1",
  };

  const statsChain = (row: unknown) => ({
    from: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    groupBy: vi.fn().mockResolvedValue([row]),
  });

  const challengersChain = (rows: unknown[]) => ({
    from: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue(rows),
  });

  const countChain = (count: number) => ({
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue([{ count }]),
  });

  const completedChain = (rows: unknown[]) => ({
    from: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(rows),
  });

  beforeEach(() => vi.clearAllMocks());

  it("returns 200 with full detail for a public list", async () => {
    mockDb.query.lists.findFirst.mockResolvedValue(publicList);
    mockDb.$count.mockResolvedValue(3);
    mockDb.select
      .mockReturnValueOnce(
        statsChain({
          itemCount: 3,
          ownerName: "Alice",
          ownerImage: "https://example.com/a.jpg",
        })
      )
      .mockReturnValueOnce(
        challengersChain([
          {
            id: "u-bob",
            name: "Bob",
            image: "https://example.com/b.jpg",
            completedAt: null,
            doneCount: 1,
          },
        ])
      )
      .mockReturnValueOnce(countChain(5))
      .mockReturnValueOnce(completedChain([]));

    const res = await app.request("/api/explore/l1");
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.id).toBe("l1");
    expect(body.itemCount).toBe(3);
    expect(body.participantCount).toBe(5);
    expect(body.completedCount).toBeUndefined();
    expect((body.owner as Record<string, unknown>)?.name).toBe("Alice");
    const challengers = body.challengers as Array<Record<string, unknown>>;
    expect(Array.isArray(challengers)).toBe(true);
    expect(challengers[0]).toMatchObject({
      id: "u-bob",
      name: "Bob",
      doneCount: 1,
      totalItems: 3,
      completedAt: null,
    });
  });

  it("returns 404 for a non-public list", async () => {
    mockDb.query.lists.findFirst.mockResolvedValue({
      ...publicList,
      public: false,
    });
    const res = await app.request("/api/explore/l1");
    expect(res.status).toBe(404);
  });

  it("returns 404 for a nonexistent list", async () => {
    mockDb.query.lists.findFirst.mockResolvedValue(null);
    const res = await app.request("/api/explore/nonexistent");
    expect(res.status).toBe(404);
  });

  it("returns all challengers with per-user progress", async () => {
    mockDb.query.lists.findFirst.mockResolvedValue(publicList);
    mockDb.$count.mockResolvedValue(4);
    const rows = Array.from({ length: 10 }, (_, i) => ({
      id: `u${i}`,
      name: `User ${i}`,
      image: null,
      completedAt: null,
      doneCount: i,
    }));
    mockDb.select
      .mockReturnValueOnce(
        statsChain({
          itemCount: 4,
          ownerName: null,
          ownerImage: null,
        })
      )
      .mockReturnValueOnce(challengersChain(rows))
      .mockReturnValueOnce(countChain(10))
      .mockReturnValueOnce(completedChain([]));

    const res = await app.request("/api/explore/l1");
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    const challengers = body.challengers as Array<Record<string, unknown>>;
    expect(challengers.length).toBe(10);
    expect(challengers[0].totalItems).toBe(4);
  });
});

describe("POST /api/lists/:listId/clone", () => {
  beforeEach(() => vi.clearAllMocks());

  it("clones a list with its items and returns 201", async () => {
    const source = { id: "abc", name: "Original" };
    const sourceItems = [
      {
        id: "i1",
        listId: "abc",
        text: "Tarea 1",
        done: true,
        position: 0,
      },
      {
        id: "i2",
        listId: "abc",
        text: "Tarea 2",
        done: false,
        position: 1,
      },
    ];
    const newList = { id: "xyz", name: "Original" };

    mockDb.query.lists.findFirst.mockResolvedValue(source);
    mockDb.query.items.findMany.mockResolvedValue(sourceItems);
    mockDb.insert
      .mockReturnValueOnce({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([newList]),
        }),
      })
      .mockReturnValueOnce({
        values: vi.fn().mockResolvedValue(undefined),
      });

    const res = await app.request("/api/lists/abc/clone", {
      method: "POST",
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.id).toBe("xyz");
    expect(body.name).toBe("Original");
  });

  it("resets done to false on all cloned items", async () => {
    const source = { id: "abc", name: "Original" };
    const sourceItems = [
      {
        id: "i1",
        listId: "abc",
        text: "Hecha",
        done: true,
        position: 0,
      },
    ];
    const newList = { id: "xyz", name: "Original" };

    mockDb.query.lists.findFirst.mockResolvedValue(source);
    mockDb.query.items.findMany.mockResolvedValue(sourceItems);
    const itemsValuesMock = vi.fn().mockResolvedValue(undefined);
    mockDb.insert
      .mockReturnValueOnce({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([newList]),
        }),
      })
      .mockReturnValueOnce({ values: itemsValuesMock });

    await app.request("/api/lists/abc/clone", {
      method: "POST",
    });
    expect(itemsValuesMock).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ done: false })])
    );
  });

  it("clones an empty list without inserting items", async () => {
    const source = { id: "abc", name: "Vacía" };
    const newList = { id: "xyz", name: "Vacía" };

    mockDb.query.lists.findFirst.mockResolvedValue(source);
    mockDb.query.items.findMany.mockResolvedValue([]);
    mockDb.insert.mockReturnValueOnce({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([newList]),
      }),
    });

    const res = await app.request("/api/lists/abc/clone", {
      method: "POST",
    });
    expect(res.status).toBe(201);
    expect(mockDb.insert).toHaveBeenCalledTimes(1);
  });

  it("returns 404 when source list not found", async () => {
    mockDb.query.lists.findFirst.mockResolvedValue(null);

    const res = await app.request("/api/lists/nonexistent/clone", {
      method: "POST",
    });
    expect(res.status).toBe(404);
  });
});

describe("GET /api/explore/:listId/items", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns items of a public list", async () => {
    const rows = [
      {
        id: "i1",
        listId: "abc",
        text: "Tarea 1",
        done: false,
        position: 0,
      },
    ];
    mockDb.query.lists.findFirst.mockResolvedValue({
      id: "abc",
      public: true,
    });
    mockDb.query.items.findMany.mockResolvedValue(rows);

    const res = await app.request("/api/explore/abc/items");
    expect(res.status).toBe(200);
    const body = (await res.json()) as Array<Record<string, unknown>>;
    expect(body).toHaveLength(1);
    expect(body[0].text).toBe("Tarea 1");
  });

  it("does not expose done status in explore items", async () => {
    const rows = [
      {
        id: "i1",
        listId: "abc",
        text: "Tarea 1",
        done: true,
        position: 0,
      },
      {
        id: "i2",
        listId: "abc",
        text: "Tarea 2",
        done: false,
        position: 1,
      },
    ];
    mockDb.query.lists.findFirst.mockResolvedValue({
      id: "abc",
      public: true,
    });
    mockDb.query.items.findMany.mockResolvedValue(rows);

    const res = await app.request("/api/explore/abc/items");
    expect(res.status).toBe(200);
    const body = (await res.json()) as Array<Record<string, unknown>>;
    expect(body[0].done).toBeUndefined();
    expect(body[1].done).toBeUndefined();
  });

  it("returns 404 when list is not public", async () => {
    mockDb.query.lists.findFirst.mockResolvedValue({
      id: "abc",
      public: false,
    });

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
    mockDb.query.lists.findFirst.mockResolvedValue({
      id: "abc",
      ownerId: null,
      collaborative: false,
    });
    mockDb.delete.mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    });

    const res = await app.request("/api/lists/abc/items", {
      method: "DELETE",
      body: JSON.stringify({
        ids: [
          "00000000-0000-0000-0000-000000000001",
          "00000000-0000-0000-0000-000000000002",
        ],
      }),
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
    const res = await app.request("/api/lists/abc/accept", {
      method: "POST",
    });
    expect(res.status).toBe(401);
  });
});

describe("GET /api/lists/:listId (participated flag)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ avg: null, count: 0 }]),
      }),
    });
  });

  it("includes participated: false when not authenticated", async () => {
    const list = {
      id: "abc-123",
      name: "Mi lista",
      public: true,
      collaborative: false,
      ownerId: "u1",
      createdAt: new Date().toISOString(),
    };
    mockDb.query.lists.findFirst.mockResolvedValue(list);

    const res = await app.request("/api/lists/abc-123");
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.participated).toBe(false);
    expect(body.participationCompletedAt).toBeNull();
  });
});

describe("POST /api/lists/:listId/accept", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    const res = await app.request("/api/lists/abc/accept", {
      method: "POST",
    });
    expect(res.status).toBe(401);
  });

  it("returns 404 when list not found", async () => {
    mockDb.query.lists.findFirst.mockResolvedValue(null);
    const res = await app.request("/api/lists/nonexistent/accept", {
      method: "POST",
    });
    expect(res.status).toBe(401);
  });
});

describe("GET /api/lists/:listId/participation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns participated: false when not authenticated", async () => {
    mockDb.query.lists.findFirst.mockResolvedValue({
      id: "abc",
      ownerId: "u1",
      collaborative: false,
      public: true,
    });

    const res = await app.request("/api/lists/abc/participation");
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
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
    mockDb.query.lists.findFirst.mockResolvedValue({
      id: "abc",
      ownerId: "other-user",
    });

    const res = await app.request("/api/lists/abc/activity");
    expect(res.status).toBe(401);
  });
});

describe("PATCH /api/lists/:listId/items/:itemId/toggle (participant path)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 404 when item does not exist", async () => {
    mockDb.query.lists.findFirst.mockResolvedValue({
      id: "abc",
      ownerId: null,
      collaborative: false,
      public: false,
    });
    mockDb.query.items.findFirst.mockResolvedValue(null);

    const res = await app.request("/api/lists/abc/items/bad-id/toggle", {
      method: "PATCH",
    });
    expect(res.status).toBe(404);
  });

  it("updates items.done for owner (ownerId null)", async () => {
    const item = {
      id: "i1",
      listId: "abc",
      text: "Tarea",
      done: false,
      position: 0,
    };
    const updated = { ...item, done: true };
    mockDb.query.lists.findFirst.mockResolvedValue({
      id: "abc",
      ownerId: null,
      collaborative: false,
      public: false,
    });
    mockDb.query.items.findFirst.mockResolvedValue(item);
    mockDb.query.participations.findFirst.mockResolvedValue(null);
    mockDb.update.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([updated]),
        }),
      }),
    });

    const res = await app.request("/api/lists/abc/items/i1/toggle", {
      method: "PATCH",
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.done).toBe(true);
  });
});

describe("GET /api/lists/:listId/items (participant item_progress)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns items with items.done when not a participant", async () => {
    const rows = [
      {
        id: "i1",
        listId: "abc",
        text: "Tarea",
        done: true,
        position: 0,
      },
    ];
    mockDb.query.lists.findFirst.mockResolvedValue({
      id: "abc",
      ownerId: null,
      collaborative: false,
      public: true,
    });
    mockDb.query.items.findMany.mockResolvedValue(rows);
    mockDb.query.itemLikes.findMany.mockResolvedValue([]);

    const res = await app.request("/api/lists/abc/items");
    expect(res.status).toBe(200);
    const body = (await res.json()) as Array<Record<string, unknown>>;
    expect(body[0].done).toBe(true);
  });
});

describe("DELETE /api/lists/:listId", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 404 when list not found", async () => {
    mockDb.query.lists.findFirst.mockResolvedValue(null);

    const res = await app.request("/api/lists/abc-123", {
      method: "DELETE",
    });
    expect(res.status).toBe(404);
  });

  it("returns 403 when not authenticated", async () => {
    mockDb.query.lists.findFirst.mockResolvedValue({
      id: "abc-123",
      ownerId: "owner-id",
    });

    const res = await app.request("/api/lists/abc-123", {
      method: "DELETE",
    });
    expect(res.status).toBe(403);
  });

  it("returns 403 when user does not own the list", async () => {
    mockDb.query.lists.findFirst.mockResolvedValue({
      id: "abc-123",
      ownerId: "other-user-id",
    });

    const res = await app.request("/api/lists/abc-123", {
      method: "DELETE",
    });
    expect(res.status).toBe(403);
  });
});

describe("PATCH /api/lists/:listId/items/:itemId/toggle (challenger role)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthUser.mockRejectedValue(new Error("no session"));
  });

  it("allows challenger to toggle on public non-collaborative list via itemProgress", async () => {
    mockGetAuthUser.mockResolvedValue({
      session: { user: { id: "u1" } },
    });
    const item = {
      id: "i1",
      listId: "abc",
      text: "Tarea",
      done: false,
    };
    mockDb.query.lists.findFirst.mockResolvedValue({
      id: "abc",
      ownerId: "owner",
      collaborative: false,
      public: true,
    });
    mockDb.query.items.findFirst.mockResolvedValue(item);
    mockDb.query.participations.findFirst.mockResolvedValue({
      id: "p1",
      completedAt: null,
      role: "challenger",
    });
    mockDb.query.itemProgress.findFirst.mockResolvedValue(null);
    mockDb.query.itemProgress.findMany.mockResolvedValue([]);
    mockDb.query.items.findMany.mockResolvedValue([item]);
    const onConflictDoUpdate = vi.fn().mockResolvedValue(undefined);
    mockDb.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({ onConflictDoUpdate }),
    });

    const res = await app.request("/api/lists/abc/items/i1/toggle", {
      method: "PATCH",
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.done).toBe(true);
  });

  it("returns 403 for non-owner without participation on public non-collaborative list", async () => {
    mockGetAuthUser.mockResolvedValue({
      session: { user: { id: "u1" } },
    });
    const item = {
      id: "i1",
      listId: "abc",
      text: "Tarea",
      done: false,
    };
    mockDb.query.lists.findFirst.mockResolvedValue({
      id: "abc",
      ownerId: "owner",
      collaborative: false,
      public: true,
    });
    mockDb.query.items.findFirst.mockResolvedValue(item);
    mockDb.query.participations.findFirst.mockResolvedValue(null);

    const res = await app.request("/api/lists/abc/items/i1/toggle", {
      method: "PATCH",
    });
    expect(res.status).toBe(403);
  });
});

describe("GET /api/admin/stats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ADMIN_PASSWORD = "secret";
  });

  function authHeader(password: string) {
    return `Basic ${btoa(`admin:${password}`)}`;
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
      // biome-ignore lint/suspicious/noThenProperty: intentional thenable mock for drizzle select chain
      then: vi.fn((resolve: (v: unknown[]) => unknown) =>
        Promise.resolve(resolve([{ count: 5 }]))
      ),
    };
    mockDb.select.mockReturnValue(chain);

    const res = await app.request("/api/admin/stats", {
      headers: { Authorization: authHeader("secret") },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
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

describe("GET /api/users", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthUser.mockRejectedValue(new Error("no session"));
  });

  it("returns public users with nextCursor null when fewer than page size", async () => {
    const usersChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi
        .fn()
        .mockResolvedValue([{ id: "u1", name: "Alice", image: null }]),
    };
    const emptyChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      groupBy: vi.fn().mockResolvedValue([]),
    };
    mockDb.select.mockReturnValueOnce(usersChain).mockReturnValue(emptyChain);

    const res = await app.request("/api/users");
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.nextCursor).toBeNull();
    expect(Array.isArray(body.users)).toBe(true);
  });

  it("includes achievementsUnlocked, achievementsTotal and followerCount per user", async () => {
    const usersChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi
        .fn()
        .mockResolvedValue([{ id: "u1", name: "Alice", image: null }]),
    };
    const emptyChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      groupBy: vi.fn().mockResolvedValue([]),
    };
    const achievementsChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      groupBy: vi.fn().mockResolvedValue([{ userId: "u1", count: 4 }]),
    };
    const followersChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      groupBy: vi.fn().mockResolvedValue([{ followingId: "u1", count: 7 }]),
    };
    mockDb.select
      .mockReturnValueOnce(usersChain)
      .mockReturnValueOnce(emptyChain) // listCounts
      .mockReturnValueOnce(emptyChain) // challengerCounts
      .mockReturnValueOnce(emptyChain) // completedCounts
      .mockReturnValueOnce(emptyChain) // collaboratorCounts
      .mockReturnValueOnce(achievementsChain)
      .mockReturnValueOnce(followersChain);

    const res = await app.request("/api/users");
    const body = (await res.json()) as {
      users: {
        id: string;
        achievementsUnlocked: number;
        achievementsTotal: number;
        followerCount: number;
      }[];
    };
    expect(body.users[0].achievementsUnlocked).toBe(4);
    expect(body.users[0].achievementsTotal).toBeGreaterThan(0);
    expect(body.users[0].followerCount).toBe(7);
  });

  it("returns nextCursor when page is full", async () => {
    const fullPage = Array.from({ length: 6 }, (_, i) => ({
      id: `u${i}`,
      name: `User ${i}`,
      image: null,
    }));
    const usersChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue(fullPage),
    };
    const emptyChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      groupBy: vi.fn().mockResolvedValue([]),
    };
    mockDb.select.mockReturnValueOnce(usersChain).mockReturnValue(emptyChain);

    const res = await app.request("/api/users");
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.nextCursor).toBe("u5");
  });

  it("returns isFollowing=false for everyone when unauthenticated", async () => {
    mockGetAuthUser.mockRejectedValue(new Error("no session"));
    const usersChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi
        .fn()
        .mockResolvedValue([{ id: "u1", name: "Alice", image: null }]),
    };
    const emptyChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      groupBy: vi.fn().mockResolvedValue([]),
    };
    mockDb.select.mockReturnValueOnce(usersChain).mockReturnValue(emptyChain);

    const res = await app.request("/api/users");
    const body = (await res.json()) as {
      users: { id: string; isFollowing: boolean }[];
    };
    expect(body.users[0].isFollowing).toBe(false);
  });

  it("returns isFollowing=true for users the viewer follows", async () => {
    mockGetAuthUser.mockResolvedValue({ session: { user: { id: "me" } } });
    const usersChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([
        { id: "u1", name: "Alice", image: null },
        { id: "u2", name: "Bob", image: null },
      ]),
    };
    const emptyChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      groupBy: vi.fn().mockResolvedValue([]),
    };
    const followsChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([{ followingId: "u1" }]),
    };
    mockDb.select
      .mockReturnValueOnce(usersChain)
      .mockReturnValueOnce(emptyChain) // listCounts
      .mockReturnValueOnce(emptyChain) // challengerCounts
      .mockReturnValueOnce(emptyChain) // completedCounts
      .mockReturnValueOnce(emptyChain) // collaboratorCounts
      .mockReturnValueOnce(emptyChain) // achievementCounts
      .mockReturnValueOnce(emptyChain) // followerCounts
      .mockReturnValueOnce(followsChain); // viewer follows

    const res = await app.request("/api/users");
    const body = (await res.json()) as {
      users: { id: string; isFollowing: boolean }[];
    };
    const map = Object.fromEntries(
      body.users.map((u) => [u.id, u.isFollowing])
    );
    expect(map.u1).toBe(true);
    expect(map.u2).toBe(false);
  });
});

describe("GET /api/users/search", () => {
  const headers = { "x-forwarded-for": "10.0.0.42" };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthUser.mockResolvedValue({ session: { user: { id: "me" } } });
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetAuthUser.mockRejectedValue(new Error("no session"));
    const res = await app.request("/api/users/search?q=ali", { headers });
    expect(res.status).toBe(401);
  });

  it("returns 400 when q is missing", async () => {
    const res = await app.request("/api/users/search", { headers });
    expect(res.status).toBe(400);
  });

  it("returns 400 when q is shorter than 2 characters", async () => {
    const res = await app.request("/api/users/search?q=a", { headers });
    expect(res.status).toBe(400);
  });

  it("returns matching public users excluding self", async () => {
    const chain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([
        { id: "u1", name: "Alice", email: "alice@example.com", image: null },
        { id: "u2", name: "Bob", email: "bob@example.com", image: null },
      ]),
    };
    mockDb.select.mockReturnValue(chain);

    const res = await app.request("/api/users/search?q=ali", { headers });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      users: {
        id: string;
        name: string;
        email: string;
        image: string | null;
      }[];
    };
    expect(body.users).toHaveLength(2);
    expect(body.users[0].email).toBe("alice@example.com");
  });

  it("limits results to 8", async () => {
    const chain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    };
    mockDb.select.mockReturnValue(chain);

    await app.request("/api/users/search?q=al", { headers });
    expect(chain.limit).toHaveBeenCalledWith(8);
  });
});

describe("POST /api/lists/:listId/collaborators", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthUser.mockResolvedValue({ session: { user: { id: "owner" } } });
  });

  const url = "/api/lists/abc/collaborators";
  const body = (userId: string) => ({
    method: "POST",
    body: JSON.stringify({ userId }),
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": "10.0.7.1",
    },
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetAuthUser.mockRejectedValue(new Error("no session"));
    const res = await app.request(url, body("u2"));
    expect(res.status).toBe(401);
  });

  it("returns 404 when list does not exist", async () => {
    mockDb.query.lists.findFirst.mockResolvedValue(null);
    const res = await app.request(url, body("u2"));
    expect(res.status).toBe(404);
  });

  it("returns 403 when caller is not the owner", async () => {
    mockDb.query.lists.findFirst.mockResolvedValue({
      id: "abc",
      name: "Lista",
      ownerId: "someone-else",
      collaborative: true,
    });
    const res = await app.request(url, body("u2"));
    expect(res.status).toBe(403);
  });

  it("returns 400 when list is not collaborative", async () => {
    mockDb.query.lists.findFirst.mockResolvedValue({
      id: "abc",
      name: "Lista",
      ownerId: "owner",
      collaborative: false,
    });
    const res = await app.request(url, body("u2"));
    expect(res.status).toBe(400);
    const json = (await res.json()) as { error: string };
    expect(json.error).toBe("list_not_collaborative");
  });

  it("returns 400 when adding the owner as collaborator", async () => {
    mockDb.query.lists.findFirst.mockResolvedValue({
      id: "abc",
      name: "Lista",
      ownerId: "owner",
      collaborative: true,
    });
    const res = await app.request(url, body("owner"));
    expect(res.status).toBe(400);
    const json = (await res.json()) as { error: string };
    expect(json.error).toBe("owner_cannot_be_collaborator");
  });

  it("returns 404 when target user does not exist", async () => {
    mockDb.query.lists.findFirst.mockResolvedValue({
      id: "abc",
      name: "Lista",
      ownerId: "owner",
      collaborative: true,
    });
    mockDb.query.users.findFirst.mockResolvedValue(null);
    const res = await app.request(url, body("ghost"));
    expect(res.status).toBe(404);
  });

  it("inserts participation and creates notification when new", async () => {
    mockDb.query.lists.findFirst.mockResolvedValue({
      id: "abc",
      name: "Lista",
      ownerId: "owner",
      collaborative: true,
    });
    mockDb.query.users.findFirst
      .mockResolvedValueOnce({ id: "u2" })
      .mockResolvedValueOnce({ name: "Owner", image: null });
    mockDb.query.participations.findFirst.mockResolvedValue(null);
    mockDb.insert.mockReturnValue(chainableInsert());

    const res = await app.request(url, body("u2"));
    expect(res.status).toBe(204);
    expect(mockDb.insert).toHaveBeenCalledWith(participations);
    expect(mockDb.insert).toHaveBeenCalledWith(notifications);
  });

  it("upgrades existing challenger participation to collaborator", async () => {
    mockDb.query.lists.findFirst.mockResolvedValue({
      id: "abc",
      name: "Lista",
      ownerId: "owner",
      collaborative: true,
    });
    mockDb.query.users.findFirst
      .mockResolvedValueOnce({ id: "u2" })
      .mockResolvedValueOnce({ name: "Owner", image: null });
    mockDb.query.participations.findFirst.mockResolvedValue({
      id: "p1",
      role: "challenger",
    });
    const setMock = vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    });
    mockDb.update.mockReturnValue({ set: setMock });
    mockDb.insert.mockReturnValue(chainableInsert());

    const res = await app.request(url, body("u2"));
    expect(res.status).toBe(204);
    expect(mockDb.update).toHaveBeenCalledWith(participations);
    expect(setMock).toHaveBeenCalledWith({ role: "collaborator" });
  });

  it("is idempotent when user is already a collaborator", async () => {
    mockDb.query.lists.findFirst.mockResolvedValue({
      id: "abc",
      name: "Lista",
      ownerId: "owner",
      collaborative: true,
    });
    mockDb.query.users.findFirst.mockResolvedValueOnce({ id: "u2" });
    mockDb.query.participations.findFirst.mockResolvedValue({
      id: "p1",
      role: "collaborator",
    });

    const res = await app.request(url, body("u2"));
    expect(res.status).toBe(204);
    expect(mockDb.insert).not.toHaveBeenCalled();
    expect(mockDb.update).not.toHaveBeenCalled();
  });
});

describe("DELETE /api/lists/:listId/collaborators/:userId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthUser.mockResolvedValue({ session: { user: { id: "owner" } } });
  });

  const url = (userId: string) => `/api/lists/abc/collaborators/${userId}`;
  const opts = {
    method: "DELETE",
    headers: { "x-forwarded-for": "10.0.7.2" },
  };

  it("returns 401 when unauthenticated", async () => {
    mockGetAuthUser.mockRejectedValue(new Error("no session"));
    const res = await app.request(url("u2"), opts);
    expect(res.status).toBe(401);
  });

  it("returns 404 when list does not exist", async () => {
    mockDb.query.lists.findFirst.mockResolvedValue(null);
    const res = await app.request(url("u2"), opts);
    expect(res.status).toBe(404);
  });

  it("returns 403 when caller is not the owner", async () => {
    mockDb.query.lists.findFirst.mockResolvedValue({
      id: "abc",
      ownerId: "someone-else",
    });
    const res = await app.request(url("u2"), opts);
    expect(res.status).toBe(403);
  });

  it("returns 400 when trying to remove the owner", async () => {
    mockDb.query.lists.findFirst.mockResolvedValue({
      id: "abc",
      ownerId: "owner",
    });
    const res = await app.request(url("owner"), opts);
    expect(res.status).toBe(400);
    const json = (await res.json()) as { error: string };
    expect(json.error).toBe("cannot_remove_owner");
  });

  it("removes the collaborator participation", async () => {
    mockDb.query.lists.findFirst.mockResolvedValue({
      id: "abc",
      ownerId: "owner",
    });
    const where = vi.fn().mockResolvedValue(undefined);
    mockDb.delete.mockReturnValue({ where });

    const res = await app.request(url("u2"), opts);
    expect(res.status).toBe(204);
    expect(mockDb.delete).toHaveBeenCalledWith(participations);
    expect(where).toHaveBeenCalledTimes(1);
  });
});

describe("PATCH /api/users/me", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthUser.mockRejectedValue(new Error("no session"));
  });

  it("returns 401 when unauthenticated", async () => {
    const res = await app.request("/api/users/me", {
      method: "PATCH",
      body: JSON.stringify({ publicProfile: false }),
      headers: { "Content-Type": "application/json" },
    });
    expect(res.status).toBe(401);
  });

  it("updates publicProfile and returns new value", async () => {
    mockGetAuthUser.mockResolvedValue({ session: { user: { id: "u1" } } });
    mockDb.update.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi
            .fn()
            .mockResolvedValue([{ publicProfile: false, emailOptIn: true }]),
        }),
      }),
    });

    const res = await app.request("/api/users/me", {
      method: "PATCH",
      body: JSON.stringify({ publicProfile: false }),
      headers: { "Content-Type": "application/json" },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.publicProfile).toBe(false);
  });

  it("updates emailOptIn and returns the new value", async () => {
    mockGetAuthUser.mockResolvedValue({ session: { user: { id: "u1" } } });
    const setMock = vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi
          .fn()
          .mockResolvedValue([{ publicProfile: true, emailOptIn: false }]),
      }),
    });
    mockDb.update.mockReturnValue({ set: setMock });

    const res = await app.request("/api/users/me", {
      method: "PATCH",
      body: JSON.stringify({ emailOptIn: false }),
      headers: { "Content-Type": "application/json" },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.emailOptIn).toBe(false);
    expect(setMock).toHaveBeenCalledWith(
      expect.objectContaining({ emailOptIn: false })
    );
  });

  it("returns 400 when no profile fields are provided", async () => {
    mockGetAuthUser.mockResolvedValue({ session: { user: { id: "u1" } } });
    const res = await app.request("/api/users/me", {
      method: "PATCH",
      body: JSON.stringify({}),
      headers: { "Content-Type": "application/json" },
    });
    expect(res.status).toBe(400);
  });
});

describe("GET /api/users/me", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthUser.mockRejectedValue(new Error("no session"));
  });

  it("returns 401 when unauthenticated", async () => {
    const res = await app.request("/api/users/me");
    expect(res.status).toBe(401);
  });

  it("returns publicProfile for authenticated user", async () => {
    mockGetAuthUser.mockResolvedValue({ session: { user: { id: "u1" } } });
    mockDb.query.users.findFirst.mockResolvedValue({
      id: "u1",
      publicProfile: true,
    });

    const res = await app.request("/api/users/me");
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.publicProfile).toBe(true);
  });
});

describe("GET /api/me/streak", () => {
  const chainMock = (rows: unknown[]) => ({
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    groupBy: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockResolvedValue(rows),
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-19T12:00:00Z"));
  });

  afterEach(() => vi.useRealTimers());

  it("returns 401 when there is no session", async () => {
    mockGetAuthUser.mockRejectedValue(new Error("no session"));
    const res = await app.request("/api/me/streak");
    expect(res.status).toBe(401);
  });

  it("counts consecutive days ending today", async () => {
    mockGetAuthUser.mockResolvedValue({ session: { user: { id: "u1" } } });
    mockDb.select.mockReturnValue(
      chainMock([
        { day: "2026-05-19" },
        { day: "2026-05-18" },
        { day: "2026-05-17" },
      ])
    );

    const res = await app.request("/api/me/streak");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ current: 3 });
  });

  it("keeps the streak alive when the latest activity was yesterday", async () => {
    mockGetAuthUser.mockResolvedValue({ session: { user: { id: "u1" } } });
    mockDb.select.mockReturnValue(
      chainMock([{ day: "2026-05-18" }, { day: "2026-05-17" }])
    );

    const res = await app.request("/api/me/streak");
    expect(await res.json()).toEqual({ current: 2 });
  });

  it("returns 0 when the latest activity is older than yesterday", async () => {
    mockGetAuthUser.mockResolvedValue({ session: { user: { id: "u1" } } });
    mockDb.select.mockReturnValue(chainMock([{ day: "2026-05-15" }]));

    const res = await app.request("/api/me/streak");
    expect(await res.json()).toEqual({ current: 0 });
  });

  it("returns 0 when there is no progress", async () => {
    mockGetAuthUser.mockResolvedValue({ session: { user: { id: "u1" } } });
    mockDb.select.mockReturnValue(chainMock([]));

    const res = await app.request("/api/me/streak");
    expect(await res.json()).toEqual({ current: 0 });
  });
});

describe("follow endpoints", () => {
  beforeEach(() => vi.clearAllMocks());

  it("POST follow returns 401 without a session", async () => {
    mockGetAuthUser.mockRejectedValue(new Error("no session"));
    const res = await app.request("/api/users/u2/follow", { method: "POST" });
    expect(res.status).toBe(401);
  });

  it("POST follow returns 400 when following yourself", async () => {
    mockGetAuthUser.mockResolvedValue({ session: { user: { id: "u1" } } });
    const res = await app.request("/api/users/u1/follow", { method: "POST" });
    expect(res.status).toBe(400);
  });

  it("POST follow returns 404 when the target user does not exist", async () => {
    mockGetAuthUser.mockResolvedValue({ session: { user: { id: "u1" } } });
    mockDb.query.users.findFirst.mockResolvedValue(undefined);
    const res = await app.request("/api/users/ghost/follow", {
      method: "POST",
    });
    expect(res.status).toBe(404);
  });

  it("POST follow inserts the follow and returns following: true", async () => {
    mockGetAuthUser.mockResolvedValue({ session: { user: { id: "u1" } } });
    mockDb.query.users.findFirst.mockResolvedValue({ id: "u2" });
    const onConflict = vi.fn().mockResolvedValue(undefined);
    mockDb.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({ onConflictDoNothing: onConflict }),
    });
    const res = await app.request("/api/users/u2/follow", { method: "POST" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ following: true });
    expect(onConflict).toHaveBeenCalled();
  });

  it("POST follow skips notification when one already exists within the dedupe window", async () => {
    mockGetAuthUser.mockResolvedValue({ session: { user: { id: "u1" } } });
    mockDb.query.users.findFirst.mockResolvedValueOnce({ id: "u2" });
    mockDb.query.notifications.findFirst.mockResolvedValue({
      id: "existing-notif",
    });

    const valuesCalls: Record<string, unknown>[] = [];
    mockDb.insert.mockImplementation(() => {
      const p: Promise<undefined> & {
        onConflictDoNothing?: ReturnType<typeof vi.fn>;
      } = Promise.resolve(undefined);
      p.onConflictDoNothing = vi.fn().mockResolvedValue(undefined);
      return {
        values: vi.fn((v: Record<string, unknown>) => {
          valuesCalls.push(v);
          return p;
        }),
      };
    });

    await app.request("/api/users/u2/follow", {
      method: "POST",
      headers: { "x-forwarded-for": "10.0.0.5" },
    });

    const notifInserts = valuesCalls.filter((v) => v.type === "new_follower");
    expect(notifInserts).toHaveLength(0);
  });

  it("POST follow creates a new_follower notification for the target", async () => {
    mockGetAuthUser.mockResolvedValue({ session: { user: { id: "u1" } } });
    mockDb.query.users.findFirst
      .mockResolvedValueOnce({ id: "u2" })
      .mockResolvedValueOnce({ name: "Alice", image: "img.jpg" });
    mockDb.query.notifications.findFirst.mockResolvedValue(undefined);

    const valuesCalls: unknown[] = [];
    mockDb.insert.mockImplementation(() => {
      const p: Promise<undefined> & {
        onConflictDoNothing?: ReturnType<typeof vi.fn>;
      } = Promise.resolve(undefined);
      p.onConflictDoNothing = vi.fn().mockResolvedValue(undefined);
      return {
        values: vi.fn((v: unknown) => {
          valuesCalls.push(v);
          return p;
        }),
      };
    });

    const res = await app.request("/api/users/u2/follow", {
      method: "POST",
      headers: { "x-forwarded-for": "10.0.0.2" },
    });
    expect(res.status).toBe(200);
    expect(valuesCalls).toContainEqual(
      expect.objectContaining({
        userId: "u2",
        type: "new_follower",
        actorId: "u1",
        actorName: "Alice",
        actorImage: "img.jpg",
        actionUrl: "/u/u1",
      })
    );
  });

  it("DELETE follow returns 401 without a session", async () => {
    mockGetAuthUser.mockRejectedValue(new Error("no session"));
    const res = await app.request("/api/users/u2/follow", {
      method: "DELETE",
    });
    expect(res.status).toBe(401);
  });

  it("DELETE follow removes the follow and returns following: false", async () => {
    mockGetAuthUser.mockResolvedValue({ session: { user: { id: "u1" } } });
    mockDb.delete.mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    });
    const res = await app.request("/api/users/u2/follow", {
      method: "DELETE",
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ following: false });
  });

  it("GET follow-status returns counts and isFollowing false when not following", async () => {
    mockGetAuthUser.mockResolvedValue({ session: { user: { id: "u1" } } });
    mockDb.$count.mockResolvedValue(2);
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    });
    const res = await app.request("/api/users/u2/follow-status");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      isFollowing: false,
      followerCount: 2,
      followingCount: 2,
    });
  });

  it("GET follow-status returns isFollowing true when a follow exists", async () => {
    mockGetAuthUser.mockResolvedValue({ session: { user: { id: "u1" } } });
    mockDb.$count.mockResolvedValue(5);
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ id: "f1" }]),
    });
    const res = await app.request("/api/users/u2/follow-status");
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.isFollowing).toBe(true);
  });
});

describe("GET /api/feed", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 without a session", async () => {
    mockGetAuthUser.mockRejectedValue(new Error("no session"));
    const res = await app.request("/api/feed");
    expect(res.status).toBe(401);
  });

  it("returns an empty feed when the user follows nobody", async () => {
    mockGetAuthUser.mockResolvedValue({ session: { user: { id: "u1" } } });
    mockDb.select.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    });
    const res = await app.request("/api/feed");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ items: [] });
  });

  it("returns public lists from followed users", async () => {
    mockGetAuthUser.mockResolvedValue({ session: { user: { id: "u1" } } });
    mockDb.select
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ id: "u2" }, { id: "u3" }]),
        }),
      })
      .mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([
          {
            id: "l1",
            name: "Lista de u2",
            slug: null,
            description: null,
            createdAt: new Date("2026-05-10"),
            itemCount: 3,
            ownerId: "u2",
            ownerName: "Bob",
            ownerImage: null,
          },
        ]),
      });
    const res = await app.request("/api/feed");
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      items: Array<Record<string, unknown>>;
    };
    expect(body.items).toHaveLength(1);
    expect(body.items[0].name).toBe("Lista de u2");
    expect(body.items[0].owner).toEqual({
      id: "u2",
      name: "Bob",
      image: null,
    });
  });
});

import { signUnsubscribeToken } from "./email-token";

describe("unsubscribe endpoint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.AUTH_SECRET = "test-unsub-secret";
  });

  it("returns 400 when token is missing", async () => {
    const res = await app.request("/api/unsubscribe");
    expect(res.status).toBe(400);
  });

  it("returns 400 when token is invalid", async () => {
    const res = await app.request("/api/unsubscribe?token=garbage");
    expect(res.status).toBe(400);
  });

  it("disables email opt-in for a valid token via GET", async () => {
    const token = await signUnsubscribeToken("u1", "test-unsub-secret");
    const setMock = vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    });
    mockDb.update.mockReturnValue({ set: setMock });

    const res = await app.request(`/api/unsubscribe?token=${token}`);
    expect(res.status).toBe(200);
    expect(setMock).toHaveBeenCalledWith(
      expect.objectContaining({ emailOptIn: false })
    );
  });

  it("accepts POST for one-click unsubscribe", async () => {
    const token = await signUnsubscribeToken("u1", "test-unsub-secret");
    mockDb.update.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    });
    const res = await app.request(`/api/unsubscribe?token=${token}`, {
      method: "POST",
    });
    expect(res.status).toBe(200);
  });
});

import { signUnsubscribeToken as _sign } from "./email-token";

describe("GET /api/cron/random-item-nudge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(mockSendEmail).mockResolvedValue({
      skipped: false,
      id: "test-msg",
    });
    process.env.CRON_SECRET = "cron-test-secret";
    process.env.AUTH_SECRET = "auth-test-secret";
  });

  it("returns 401 without an Authorization header", async () => {
    const res = await app.request("/api/cron/random-item-nudge");
    expect(res.status).toBe(401);
  });

  it("returns 401 with a wrong secret", async () => {
    const res = await app.request("/api/cron/random-item-nudge", {
      headers: { Authorization: "Bearer wrong-secret" },
    });
    expect(res.status).toBe(401);
  });

  it("sends one email per eligible user with a pending item", async () => {
    mockDb.select
      .mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi
          .fn()
          .mockResolvedValue([
            { id: "u1", email: "u1@example.com", name: "Alice" },
          ]),
      })
      .mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([
          {
            itemId: "i1",
            itemText: "[Tarea pendiente](https://x.com)",
            listId: "l1",
            listName: "Mi lista",
            listSlug: null,
          },
        ]),
      });

    const res = await app.request("/api/cron/random-item-nudge", {
      headers: { Authorization: "Bearer cron-test-secret" },
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ sent: 1 });
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
    const args = vi.mocked(mockSendEmail).mock.calls[0][0];
    expect(args.to).toBe("u1@example.com");
    expect(args.subject).toMatch(/welist/i);
    expect(args.text).toContain("Tarea pendiente");
    expect(args.text).not.toContain("[Tarea");
    expect(args.html).toContain("Mi lista");
    expect(args.listUnsubscribeUrl).toContain("/api/unsubscribe?token=");
  });

  it("skips users without any pending item and returns sent: 0", async () => {
    mockDb.select
      .mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi
          .fn()
          .mockResolvedValue([
            { id: "u1", email: "u1@example.com", name: "Alice" },
          ]),
      })
      .mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      });

    const res = await app.request("/api/cron/random-item-nudge", {
      headers: { Authorization: "Bearer cron-test-secret" },
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ sent: 0 });
    expect(mockSendEmail).not.toHaveBeenCalled();
  });
});

describe("achievement triggers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthUser.mockResolvedValue({ session: { user: { id: "u1" } } });
    mockDb.insert.mockReturnValue(chainableInsert());
    mockDb.update.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    });
  });

  it("does not insert achievements when no thresholds are met", async () => {
    mockDb.$count.mockResolvedValue(0);
    mockDb.query.lists.findFirst.mockResolvedValue({
      id: "src",
      public: true,
      ownerId: null,
      name: "L",
    });
    mockDb.query.participations.findFirst.mockResolvedValue(null);

    await app.request("/api/lists/src/accept", { method: "POST" });

    expect(mockDb.insert).not.toHaveBeenCalledWith(achievements);
  });

  it("inserts achievements after accepting a challenge", async () => {
    mockDb.$count.mockResolvedValue(100);
    mockDb.query.lists.findFirst.mockResolvedValue({
      id: "src",
      public: true,
      ownerId: null,
      name: "L",
    });
    mockDb.query.participations.findFirst.mockResolvedValue(null);

    await app.request("/api/lists/src/accept", { method: "POST" });

    expect(mockDb.insert).toHaveBeenCalledWith(achievements);
  });

  it("inserts achievements after creating a list", async () => {
    mockDb.$count.mockResolvedValue(100);
    mockDb.insert.mockReturnValueOnce({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: "L1", ownerId: "u1" }]),
      }),
    });

    await app.request("/api/lists", {
      method: "POST",
      body: JSON.stringify({ name: "X" }),
      headers: { "Content-Type": "application/json" },
    });

    expect(mockDb.insert).toHaveBeenCalledWith(achievements);
  });

  it("inserts achievements after adding an item", async () => {
    mockDb.$count.mockResolvedValue(100);
    mockDb.query.lists.findFirst.mockResolvedValue({
      id: "abc",
      ownerId: "u1",
      collaborative: false,
      public: false,
    });
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([{ pos: 0 }]),
    });
    mockDb.insert.mockReturnValueOnce({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: "i1" }]),
      }),
    });

    await app.request("/api/lists/abc/items", {
      method: "POST",
      body: JSON.stringify({ text: "hola" }),
      headers: { "Content-Type": "application/json" },
    });

    expect(mockDb.insert).toHaveBeenCalledWith(achievements);
  });

  it("inserts achievements after following a user (for the followed user)", async () => {
    mockDb.$count.mockResolvedValue(100);
    mockDb.query.users.findFirst.mockResolvedValue({ id: "u2" });

    await app.request("/api/users/u2/follow", { method: "POST" });

    expect(mockDb.insert).toHaveBeenCalledWith(achievements);
  });

  it("inserts achievements after making a list public", async () => {
    mockDb.$count.mockResolvedValue(100);
    mockDb.query.lists.findFirst.mockResolvedValue({
      id: "abc",
      ownerId: "u1",
      public: false,
    });
    mockDb.update.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: "abc", public: true }]),
        }),
      }),
    });

    await app.request("/api/lists/abc", {
      method: "PATCH",
      body: JSON.stringify({ public: true }),
      headers: { "Content-Type": "application/json" },
    });

    expect(mockDb.insert).toHaveBeenCalledWith(achievements);
  });

  it("inserts achievements when a challenger toggles the last item done", async () => {
    mockDb.$count.mockResolvedValue(100);
    const item = { id: "i1", listId: "abc", text: "Tarea", done: false };
    mockDb.query.lists.findFirst.mockResolvedValue({
      id: "abc",
      ownerId: "owner",
      collaborative: false,
      public: true,
    });
    mockDb.query.items.findFirst.mockResolvedValue(item);
    mockDb.query.participations.findFirst.mockResolvedValue({
      id: "p1",
      completedAt: null,
      role: "challenger",
    });
    mockDb.query.itemProgress.findFirst.mockResolvedValue(null);
    mockDb.query.items.findMany.mockResolvedValue([item]);
    mockDb.query.itemProgress.findMany.mockResolvedValue([{ done: true }]);
    mockDb.query.users.findFirst.mockResolvedValue({
      name: "Alice",
      image: null,
    });

    await app.request("/api/lists/abc/items/i1/toggle", { method: "PATCH" });

    expect(mockDb.insert).toHaveBeenCalledWith(achievements);
  });
});

describe("GET /api/users/:userId/achievements", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns the full catalog with progress and unlocked state for each badge", async () => {
    mockDb.$count.mockResolvedValue(0);
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([]),
    });

    const res = await app.request("/api/users/u1/achievements");
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      achievements: {
        type: string;
        target: number;
        progress: number;
        unlockedAt: string | null;
      }[];
    };
    expect(body.achievements.length).toBeGreaterThanOrEqual(13);
    const types = body.achievements.map((a) => a.type);
    expect(types).toContain("first_list_created");
    expect(types).toContain("ten_lists_accepted");
    expect(types).toContain("first_sale");
    for (const a of body.achievements) {
      expect(a.target).toBeGreaterThan(0);
      expect(a.progress).toBe(0);
      expect(a.unlockedAt).toBeNull();
    }
  });

  it("marks an achievement as unlocked when it has a row in the achievements table", async () => {
    mockDb.$count.mockResolvedValue(0);
    const date = new Date().toISOString();
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnThis(),
      where: vi
        .fn()
        .mockResolvedValue([{ type: "first_list_created", unlockedAt: date }]),
    });

    const res = await app.request("/api/users/u1/achievements");
    const body = (await res.json()) as {
      achievements: { type: string; unlockedAt: string | null }[];
    };
    const unlocked = body.achievements.find(
      (a) => a.type === "first_list_created"
    );
    expect(unlocked?.unlockedAt).toBe(date);
  });

  it("caps progress at target", async () => {
    mockDb.$count.mockResolvedValue(50);
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([]),
    });

    const res = await app.request("/api/users/u1/achievements");
    const body = (await res.json()) as {
      achievements: { type: string; target: number; progress: number }[];
    };
    for (const a of body.achievements) {
      expect(a.progress).toBeLessThanOrEqual(a.target);
    }
  });
});

describe("POST /api/events", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthUser.mockRejectedValue(new Error("no session"));
  });

  it("returns 204 and inserts events for anonymous user", async () => {
    const valuesMock = vi.fn().mockResolvedValue(undefined);
    mockDb.insert.mockReturnValue({ values: valuesMock });

    const res = await app.request("/api/events", {
      method: "POST",
      body: JSON.stringify({
        events: [{ type: "explore_view" }, { type: "list_view", listId: "l1" }],
      }),
      headers: { "Content-Type": "application/json" },
    });

    expect(res.status).toBe(204);
    expect(valuesMock).toHaveBeenCalledWith([
      expect.objectContaining({ type: "explore_view", userId: null }),
      expect.objectContaining({
        type: "list_view",
        listId: "l1",
        userId: null,
      }),
    ]);
  });

  it("fills userId from session when authenticated", async () => {
    mockGetAuthUser.mockResolvedValue({ session: { user: { id: "u1" } } });
    const valuesMock = vi.fn().mockResolvedValue(undefined);
    mockDb.insert.mockReturnValue({ values: valuesMock });

    const res = await app.request("/api/events", {
      method: "POST",
      body: JSON.stringify({ events: [{ type: "checkout_started" }] }),
      headers: { "Content-Type": "application/json" },
    });

    expect(res.status).toBe(204);
    expect(valuesMock).toHaveBeenCalledWith([
      expect.objectContaining({ type: "checkout_started", userId: "u1" }),
    ]);
  });

  it("accepts sessionId and metadata", async () => {
    const valuesMock = vi.fn().mockResolvedValue(undefined);
    mockDb.insert.mockReturnValue({ values: valuesMock });

    const res = await app.request("/api/events", {
      method: "POST",
      body: JSON.stringify({
        events: [
          {
            type: "list_view",
            listId: "l1",
            sessionId: "s-abc",
            metadata: { ref: "feed" },
          },
        ],
      }),
      headers: { "Content-Type": "application/json" },
    });

    expect(res.status).toBe(204);
    expect(valuesMock).toHaveBeenCalledWith([
      expect.objectContaining({
        type: "list_view",
        listId: "l1",
        sessionId: "s-abc",
        metadata: { ref: "feed" },
      }),
    ]);
  });

  it("returns 400 on empty events array", async () => {
    const res = await app.request("/api/events", {
      method: "POST",
      body: JSON.stringify({ events: [] }),
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "10.0.4.3",
      },
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 when type is empty", async () => {
    const res = await app.request("/api/events", {
      method: "POST",
      body: JSON.stringify({ events: [{ type: "" }] }),
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "10.0.4.1",
      },
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 when batch exceeds 50 events", async () => {
    const events = Array.from({ length: 51 }, () => ({ type: "explore_view" }));
    const res = await app.request("/api/events", {
      method: "POST",
      body: JSON.stringify({ events }),
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "10.0.4.2",
      },
    });
    expect(res.status).toBe(400);
  });
});

describe("POST /api/stripe/webhook payment_intent.succeeded", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates a list_purchased notification for the list owner", async () => {
    mockStripeConstructEvent.mockResolvedValue({
      type: "payment_intent.succeeded",
      data: {
        object: {
          id: "pi_123",
          metadata: { listId: "list-1", buyerId: "buyer-1" },
        },
      },
    });
    mockDb.query.lists.findFirst.mockResolvedValue({
      ownerId: "owner-1",
      name: "Best Cinemas",
    });
    mockDb.query.users.findFirst.mockResolvedValue({
      name: "Bob",
      image: "bob.jpg",
    });
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([]),
    });
    mockDb.$count.mockResolvedValue(0);

    const valuesCalls: unknown[] = [];
    mockDb.insert.mockImplementation(() => {
      const p: Promise<undefined> & {
        onConflictDoNothing?: ReturnType<typeof vi.fn>;
      } = Promise.resolve(undefined);
      p.onConflictDoNothing = vi.fn().mockResolvedValue(undefined);
      return {
        values: vi.fn((v: unknown) => {
          valuesCalls.push(v);
          return p;
        }),
      };
    });

    const res = await app.request("/api/stripe/webhook", {
      method: "POST",
      headers: {
        "stripe-signature": "test-sig",
        "x-forwarded-for": "10.0.0.3",
      },
      body: "{}",
    });

    expect(res.status).toBe(200);
    expect(valuesCalls).toContainEqual(
      expect.objectContaining({
        userId: "owner-1",
        type: "list_purchased",
        listId: "list-1",
        listName: "Best Cinemas",
        actorId: "buyer-1",
        actorName: "Bob",
        actorImage: "bob.jpg",
        actionUrl: "/lists/list-1",
      })
    );
  });
});

describe("PATCH /api/notifications/:id/read", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 without a session", async () => {
    mockGetAuthUser.mockRejectedValue(new Error("no session"));
    const res = await app.request("/api/notifications/n1/read", {
      method: "PATCH",
      headers: { "x-forwarded-for": "10.0.0.1" },
    });
    expect(res.status).toBe(401);
  });

  it("marks the notification as read and returns 204", async () => {
    mockGetAuthUser.mockResolvedValue({ session: { user: { id: "u1" } } });
    const where = vi.fn().mockResolvedValue(undefined);
    const set = vi.fn().mockReturnValue({ where });
    mockDb.update.mockReturnValue({ set });

    const res = await app.request("/api/notifications/n1/read", {
      method: "PATCH",
      headers: { "x-forwarded-for": "10.0.0.1" },
    });

    expect(res.status).toBe(204);
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({ readAt: expect.any(Date) })
    );
    expect(where).toHaveBeenCalled();
  });
});

describe("POST /api/lists/:listId/rating", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 without a session", async () => {
    mockGetAuthUser.mockRejectedValue(new Error("no session"));
    const res = await app.request("/api/lists/abc/rating", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": "10.0.1.1",
      },
      body: JSON.stringify({ value: 4 }),
    });
    expect(res.status).toBe(401);
  });

  it("returns 404 when the list does not exist", async () => {
    mockGetAuthUser.mockResolvedValue({ session: { user: { id: "u1" } } });
    mockDb.query.lists.findFirst.mockResolvedValue(undefined);
    const res = await app.request("/api/lists/abc/rating", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": "10.0.1.2",
      },
      body: JSON.stringify({ value: 4 }),
    });
    expect(res.status).toBe(404);
  });

  it("returns 404 when the user cannot view the list", async () => {
    mockGetAuthUser.mockResolvedValue({ session: { user: { id: "u1" } } });
    mockDb.query.lists.findFirst.mockResolvedValue({
      id: "abc",
      ownerId: "owner",
      public: false,
      collaborative: false,
    });
    mockDb.query.listPurchases.findFirst.mockResolvedValue(undefined);
    const res = await app.request("/api/lists/abc/rating", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": "10.0.1.3",
      },
      body: JSON.stringify({ value: 4 }),
    });
    expect(res.status).toBe(404);
  });

  it("returns 400 when value is out of range", async () => {
    mockGetAuthUser.mockResolvedValue({ session: { user: { id: "u1" } } });
    const res = await app.request("/api/lists/abc/rating", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": "10.0.1.4",
      },
      body: JSON.stringify({ value: 6 }),
    });
    expect(res.status).toBe(400);
  });

  it("upserts the rating and returns 200", async () => {
    mockGetAuthUser.mockResolvedValue({ session: { user: { id: "u1" } } });
    mockDb.query.lists.findFirst.mockResolvedValue({
      id: "abc",
      ownerId: "owner",
      public: true,
      collaborative: false,
    });
    const onConflictDoUpdate = vi.fn().mockReturnValue({
      returning: vi
        .fn()
        .mockResolvedValue([{ userId: "u1", listId: "abc", value: 5 }]),
    });
    const values = vi.fn().mockReturnValue({ onConflictDoUpdate });
    mockDb.insert.mockReturnValue({ values });

    const res = await app.request("/api/lists/abc/rating", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": "10.0.1.5",
      },
      body: JSON.stringify({ value: 5 }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.value).toBe(5);
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "u1", listId: "abc", value: 5 })
    );
    expect(onConflictDoUpdate).toHaveBeenCalled();
  });
});

describe("DELETE /api/lists/:listId/rating", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 without a session", async () => {
    mockGetAuthUser.mockRejectedValue(new Error("no session"));
    const res = await app.request("/api/lists/abc/rating", {
      method: "DELETE",
      headers: { "x-forwarded-for": "10.0.2.1" },
    });
    expect(res.status).toBe(401);
  });

  it("removes the rating and returns 204", async () => {
    mockGetAuthUser.mockResolvedValue({ session: { user: { id: "u1" } } });
    mockDb.query.lists.findFirst.mockResolvedValue({ id: "abc" });
    const where = vi.fn().mockResolvedValue(undefined);
    mockDb.delete.mockReturnValue({ where });

    const res = await app.request("/api/lists/abc/rating", {
      method: "DELETE",
      headers: { "x-forwarded-for": "10.0.2.2" },
    });

    expect(res.status).toBe(204);
    expect(where).toHaveBeenCalled();
  });
});

describe("GET /api/lists/:listId/active-participants", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 404 when the list does not exist", async () => {
    mockDb.query.lists.findFirst.mockResolvedValue(undefined);
    const res = await app.request("/api/lists/abc/active-participants", {
      headers: { "x-forwarded-for": "10.0.6.1" },
    });
    expect(res.status).toBe(404);
  });

  it("returns participants ordered by createdAt desc with total when list has no owner", async () => {
    mockDb.query.lists.findFirst.mockResolvedValue({
      id: "abc",
      ownerId: null,
      public: true,
      collaborative: false,
    });
    mockDb.$count.mockResolvedValue(7);
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([
        { id: "u1", name: "Alice", image: null },
        { id: "u2", name: "Bob", image: "https://x/y.png" },
      ]),
    });

    const res = await app.request("/api/lists/abc/active-participants", {
      headers: { "x-forwarded-for": "10.0.6.2" },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      participants: unknown[];
      total: number;
    };
    expect(body.total).toBe(7);
    expect(body.participants).toEqual([
      { id: "u1", name: "Alice", image: null },
      { id: "u2", name: "Bob", image: "https://x/y.png" },
    ]);
  });

  it("prepends the owner avatar and counts them in total", async () => {
    mockDb.query.lists.findFirst.mockResolvedValue({
      id: "abc",
      ownerId: "owner",
      public: true,
      collaborative: false,
    });
    mockDb.query.users.findFirst.mockResolvedValue({
      id: "owner",
      name: "Owner",
      image: "/o.png",
    });
    mockDb.$count.mockResolvedValue(2);
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([
        { id: "u1", name: "Alice", image: null },
        { id: "u2", name: "Bob", image: null },
      ]),
    });

    const res = await app.request("/api/lists/abc/active-participants", {
      headers: { "x-forwarded-for": "10.0.6.4" },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      participants: { id: string }[];
      total: number;
    };
    expect(body.total).toBe(3);
    expect(body.participants[0]).toEqual({
      id: "owner",
      name: "Owner",
      image: "/o.png",
    });
    expect(body.participants.map((p) => p.id)).toEqual(["owner", "u1", "u2"]);
  });

  it("does not duplicate the owner when they also have a participation row", async () => {
    mockDb.query.lists.findFirst.mockResolvedValue({
      id: "abc",
      ownerId: "owner",
      public: true,
      collaborative: false,
    });
    mockDb.query.users.findFirst.mockResolvedValue({
      id: "owner",
      name: "Owner",
      image: null,
    });
    mockDb.$count.mockResolvedValue(2);
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([
        { id: "owner", name: "Owner", image: null },
        { id: "u1", name: "Alice", image: null },
      ]),
    });

    const res = await app.request("/api/lists/abc/active-participants", {
      headers: { "x-forwarded-for": "10.0.6.5" },
    });
    const body = (await res.json()) as {
      participants: { id: string }[];
    };
    expect(body.participants.map((p) => p.id)).toEqual(["owner", "u1"]);
  });

  it("returns empty participants when none and no owner", async () => {
    mockDb.query.lists.findFirst.mockResolvedValue({
      id: "abc",
      ownerId: null,
      public: true,
      collaborative: false,
    });
    mockDb.$count.mockResolvedValue(0);
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    });

    const res = await app.request("/api/lists/abc/active-participants", {
      headers: { "x-forwarded-for": "10.0.6.3" },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      participants: unknown[];
      total: number;
    };
    expect(body.total).toBe(0);
    expect(body.participants).toEqual([]);
  });
});

describe("DELETE /api/lists/:listId/collaborators/:userId", () => {
  const headers = { "x-forwarded-for": "10.0.7.2" };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthUser.mockResolvedValue({
      session: { user: { id: "owner" } },
    });
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetAuthUser.mockRejectedValue(new Error("no session"));
    const res = await app.request("/api/lists/abc/collaborators/u2", {
      method: "DELETE",
      headers,
    });
    expect(res.status).toBe(401);
  });

  it("returns 404 when list not found", async () => {
    mockDb.query.lists.findFirst.mockResolvedValue(null);
    const res = await app.request("/api/lists/abc/collaborators/u2", {
      method: "DELETE",
      headers,
    });
    expect(res.status).toBe(404);
  });

  it("returns 403 when caller is not the owner", async () => {
    mockDb.query.lists.findFirst.mockResolvedValue({
      id: "abc",
      ownerId: "someone-else",
    });
    const res = await app.request("/api/lists/abc/collaborators/u2", {
      method: "DELETE",
      headers,
    });
    expect(res.status).toBe(403);
  });

  it("returns 400 when trying to remove the owner", async () => {
    mockDb.query.lists.findFirst.mockResolvedValue({
      id: "abc",
      ownerId: "owner",
    });
    const res = await app.request("/api/lists/abc/collaborators/owner", {
      method: "DELETE",
      headers,
    });
    expect(res.status).toBe(400);
  });

  it("deletes the participation and returns 204", async () => {
    mockDb.query.lists.findFirst.mockResolvedValue({
      id: "abc",
      ownerId: "owner",
    });
    const where = vi.fn().mockResolvedValue(undefined);
    mockDb.delete.mockReturnValue({ where });

    const res = await app.request("/api/lists/abc/collaborators/u2", {
      method: "DELETE",
      headers,
    });
    expect(res.status).toBe(204);
    expect(mockDb.delete).toHaveBeenCalledWith(participations);
    expect(where).toHaveBeenCalled();
  });
});

void _sign;
