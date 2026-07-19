import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockDb = {
  query: {
    lists: { findFirst: vi.fn() },
    items: { findMany: vi.fn(), findFirst: vi.fn() },
    participations: { findFirst: vi.fn(), findMany: vi.fn() },
    itemProgress: { findFirst: vi.fn(), findMany: vi.fn() },
    users: { findFirst: vi.fn() },
    stripeAccounts: { findFirst: vi.fn() },
    listPurchases: { findFirst: vi.fn() },
    notifications: { findFirst: vi.fn(), findMany: vi.fn() },
    deviceTokens: { findMany: vi.fn().mockResolvedValue([]) },
    webPushSubscriptions: { findMany: vi.fn().mockResolvedValue([]) },
    userSettings: { findFirst: vi.fn() },
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

vi.mock("./realtime", () => ({
  notifyListChange: vi.fn().mockResolvedValue(undefined),
  listChangesStream: vi.fn(),
}));

vi.mock("./push", () => ({
  sendExpoPush: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./og", () => ({
  renderOgImage: vi.fn(
    () => new Response("png", { headers: { "Content-Type": "image/png" } })
  ),
}));

vi.mock("./web-push", () => ({
  sendWebPush: vi
    .fn()
    .mockResolvedValue({ skipped: false, staleEndpoints: [] }),
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

const { app } = await import("./app.js");
const { sendEmail: mockSendEmail } = await import("./email.js");
const { sendExpoPush: mockSendExpoPush } = await import("./push.js");
const {
  deviceTokens,
  items,
  lists,
  notifications,
  participations,
  webPushSubscriptions,
} = await import("../src/db/schema/lists.schema.js");

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

  it("hides a private collaborative list from a logged-in non-collaborator", async () => {
    mockGetAuthUser.mockResolvedValue({
      session: { user: { id: "stranger" } },
    });
    mockDb.query.lists.findFirst.mockResolvedValue({
      id: "11111111-1111-1111-1111-111111111111",
      ownerId: "owner-1",
      collaborative: true,
      public: false,
      name: "secret",
      slug: "secret",
    });
    mockDb.query.participations.findFirst.mockResolvedValue(undefined);
    mockDb.query.listPurchases.findFirst.mockResolvedValue(undefined);
    const res = await app.request(
      "/api/lists/11111111-1111-1111-1111-111111111111"
    );
    expect(res.status).toBe(404);
  });

  it("returns 404 to anonymous on a private collaborative list", async () => {
    mockGetAuthUser.mockRejectedValue(new Error("no session"));
    mockDb.query.lists.findFirst.mockResolvedValue({
      id: "11111111-1111-1111-1111-111111111111",
      ownerId: "owner-1",
      collaborative: true,
      public: false,
      name: "secret",
      slug: "secret",
    });
    const res = await app.request(
      "/api/lists/11111111-1111-1111-1111-111111111111"
    );
    expect(res.status).toBe(404);
  });

  it("does not auto-join a visitor as collaborator", async () => {
    mockGetAuthUser.mockResolvedValue({
      session: { user: { id: "collab-1" } },
    });
    mockDb.query.lists.findFirst.mockResolvedValue({
      id: "11111111-1111-1111-1111-111111111111",
      ownerId: "owner-1",
      collaborative: true,
      public: false,
      name: "secret",
      slug: "secret",
    });
    mockDb.query.participations.findFirst.mockResolvedValue({
      id: "p1",
      completedAt: null,
      role: "collaborator",
    });
    mockDb.insert.mockReturnValue(chainableInsert());
    const res = await app.request(
      "/api/lists/11111111-1111-1111-1111-111111111111"
    );
    expect(res.status).toBe(200);
    expect(mockDb.insert).not.toHaveBeenCalledWith(participations);
    mockGetAuthUser.mockRejectedValue(new Error("no session"));
  });
});

describe("GET /api/lists/:listId/items", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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

  it("blocks anonymous edits on a private collaborative list", async () => {
    mockGetAuthUser.mockRejectedValue(new Error("no session"));
    mockDb.query.lists.findFirst.mockResolvedValue({
      id: "11111111-1111-1111-1111-111111111111",
      ownerId: "owner-1",
      collaborative: true,
      public: false,
    });
    mockDb.query.items.findFirst.mockResolvedValue({
      id: "22222222-2222-2222-2222-222222222222",
      done: false,
    });
    mockDb.query.participations.findFirst.mockResolvedValue(undefined);
    const res = await app.request(
      "/api/lists/11111111-1111-1111-1111-111111111111/items/22222222-2222-2222-2222-222222222222/toggle",
      { method: "PATCH" }
    );
    expect(res.status).toBe(403);
  });

  it("allows an explicit collaborator to edit a private collaborative list", async () => {
    mockGetAuthUser.mockResolvedValue({
      session: { user: { id: "collab-1" } },
    });
    mockDb.query.lists.findFirst.mockResolvedValue({
      id: "11111111-1111-1111-1111-111111111111",
      ownerId: "owner-1",
      collaborative: true,
      public: false,
    });
    mockDb.query.items.findFirst.mockResolvedValue({
      id: "22222222-2222-2222-2222-222222222222",
      done: false,
    });
    mockDb.query.participations.findFirst.mockResolvedValue({
      id: "p1",
      completedAt: null,
      role: "collaborator",
    });
    mockDb.update.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi
            .fn()
            .mockResolvedValue([
              { id: "22222222-2222-2222-2222-222222222222", done: false },
            ]),
        }),
      }),
    });
    const res = await app.request(
      "/api/lists/11111111-1111-1111-1111-111111111111/items/22222222-2222-2222-2222-222222222222/toggle",
      { method: "PATCH" }
    );
    expect(res.status).toBe(200);
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
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthUser.mockRejectedValue(new Error("no session"));
  });
  afterEach(() => {
    mockGetAuthUser.mockRejectedValue(new Error("no session"));
  });

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

  it("fans out item_added to other participants on collaborative lists", async () => {
    mockGetAuthUser.mockResolvedValue({
      session: { user: { id: "collab-1" } },
    });
    mockDb.query.lists.findFirst.mockResolvedValue({
      id: "abc",
      name: "Lista",
      ownerId: "owner-1",
      collaborative: true,
    });
    mockDb.query.participations.findFirst.mockResolvedValue({
      role: "collaborator",
    });
    mockDb.query.participations.findMany.mockResolvedValue([
      { userId: "collab-1" },
      { userId: "collab-2" },
    ]);
    mockDb.query.users.findFirst.mockResolvedValue({
      name: "Ana",
      image: null,
    });
    mockDb.query.notifications.findFirst.mockResolvedValue(null);
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ pos: null }]),
      }),
    });
    const itemInsertChain = {
      values: vi.fn().mockReturnValue({
        returning: vi
          .fn()
          .mockResolvedValue([{ id: "new-item-1", listId: "abc" }]),
      }),
    };
    const notifInsertChain = chainableInsert();
    mockDb.insert.mockImplementation((tbl: unknown) =>
      tbl === notifications ? notifInsertChain : itemInsertChain
    );

    const res = await app.request("/api/lists/abc/items/bulk", {
      method: "POST",
      body: JSON.stringify({ texts: ["Leche"] }),
      headers: { "Content-Type": "application/json" },
    });

    expect(res.status).toBe(201);
    expect(mockDb.insert).toHaveBeenCalledWith(notifications);
    expect(notifInsertChain.values).toHaveBeenCalledTimes(2);
    const recipients = notifInsertChain.values.mock.calls.map(
      (call: unknown[]) => (call[0] as { userId: string }).userId
    );
    expect(recipients).toEqual(expect.arrayContaining(["owner-1", "collab-2"]));
    expect(recipients).not.toContain("collab-1");
  });

  it("does not fan out item_added on non-collaborative lists", async () => {
    mockGetAuthUser.mockResolvedValue({
      session: { user: { id: "owner-1" } },
    });
    mockDb.query.lists.findFirst.mockResolvedValue({
      id: "abc",
      name: "Lista",
      ownerId: "owner-1",
      collaborative: false,
    });
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ pos: null }]),
      }),
    });
    mockDb.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: "i1", listId: "abc" }]),
      }),
    });

    const res = await app.request("/api/lists/abc/items/bulk", {
      method: "POST",
      body: JSON.stringify({ texts: ["Leche"] }),
      headers: { "Content-Type": "application/json" },
    });

    expect(res.status).toBe(201);
    expect(mockDb.insert).not.toHaveBeenCalledWith(notifications);
  });

  it("coalesces item_added into existing unread notification within window", async () => {
    mockGetAuthUser.mockResolvedValue({
      session: { user: { id: "collab-1" } },
    });
    mockDb.query.lists.findFirst.mockResolvedValue({
      id: "abc",
      name: "Lista",
      ownerId: "owner-1",
      collaborative: true,
    });
    mockDb.query.participations.findFirst.mockResolvedValue({
      role: "collaborator",
    });
    mockDb.query.participations.findMany.mockResolvedValue([
      { userId: "collab-1" },
    ]);
    mockDb.query.users.findFirst.mockResolvedValue({
      name: "Ana",
      image: null,
    });
    mockDb.query.notifications.findFirst.mockResolvedValue({
      id: "notif-1",
      metadata: { count: 2, itemIds: ["old-1", "old-2"] },
    });
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ pos: null }]),
      }),
    });
    mockDb.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi
          .fn()
          .mockResolvedValue([{ id: "new-1" }, { id: "new-2" }]),
      }),
    });
    const updateSet = vi
      .fn()
      .mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) });
    mockDb.update.mockReturnValue({ set: updateSet });

    const res = await app.request("/api/lists/abc/items/bulk", {
      method: "POST",
      body: JSON.stringify({ texts: ["Pan", "Café"] }),
      headers: { "Content-Type": "application/json" },
    });

    expect(res.status).toBe(201);
    expect(mockDb.update).toHaveBeenCalledWith(notifications);
    expect(updateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          count: 4,
          itemIds: ["old-1", "old-2", "new-1", "new-2"],
        }),
      })
    );
    expect(mockDb.insert).not.toHaveBeenCalledWith(notifications);
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
    const rows = Array.from({ length: 20 }, (_, i) => ({
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

  it("does not consult user_settings for anonymous viewers requesting adult", async () => {
    mockDb.select.mockReturnValue(chainMock([]));
    const res = await app.request("/api/explore?category=adult");
    expect(res.status).toBe(200);
    expect(mockDb.query.userSettings.findFirst).not.toHaveBeenCalled();
  });

  it("consults user_settings when logged-in viewer requests adult category", async () => {
    mockGetAuthUser.mockResolvedValueOnce({ session: { user: { id: "u1" } } });
    mockDb.query.userSettings.findFirst.mockResolvedValue({
      userId: "u1",
      showAdult: false,
    });
    mockDb.select.mockReturnValue(chainMock([]));

    const res = await app.request("/api/explore?category=adult");
    expect(res.status).toBe(200);
    expect(mockDb.query.userSettings.findFirst).toHaveBeenCalledTimes(1);
  });

  it("allows adult category to pass through when viewer has showAdult=true", async () => {
    mockGetAuthUser.mockResolvedValueOnce({ session: { user: { id: "u1" } } });
    mockDb.query.userSettings.findFirst.mockResolvedValue({
      userId: "u1",
      showAdult: true,
    });
    const rows = [
      {
        id: "l1",
        name: "Adult List",
        slug: null,
        createdAt: new Date("2024-01-01"),
        itemCount: 0,
      },
    ];
    mockDb.select.mockReturnValue(chainMock(rows));

    const res = await app.request("/api/explore?category=adult");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { items: unknown[] };
    expect(body.items).toHaveLength(1);
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

describe("POST /api/lists/:listId/fork", () => {
  const publicSource = {
    id: "abc",
    name: "Original",
    ownerId: "owner",
    public: true,
    collaborative: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.$count.mockResolvedValue(0);
    // computeAchievementMetrics does db.select(...).from(...).where(...)
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([]),
    });
    mockDb.query.users.findFirst.mockResolvedValue({ name: "F", image: null });
  });
  afterEach(() => {
    mockDb.$count.mockReset();
    mockDb.query.users.findFirst.mockReset();
  });

  it("forks a list to the current user with provenance and items", async () => {
    mockGetAuthUser.mockResolvedValueOnce({ session: { user: { id: "u2" } } });
    mockDb.query.lists.findFirst.mockResolvedValue(publicSource);
    mockDb.query.items.findMany.mockResolvedValue([
      { id: "i1", listId: "abc", text: "Tarea 1", done: true, position: 0 },
    ]);
    const listValues = vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue([{ id: "xyz", name: "Original" }]),
    });
    mockDb.insert.mockImplementation((table) =>
      table === lists
        ? { values: listValues }
        : { values: vi.fn().mockResolvedValue(undefined) }
    );

    const res = await app.request("/api/lists/abc/fork", { method: "POST" });
    expect(res.status).toBe(201);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.id).toBe("xyz");
    expect(listValues).toHaveBeenCalledWith(
      expect.objectContaining({ ownerId: "u2", forkedFromId: "abc" })
    );
  });

  it("requires authentication", async () => {
    mockGetAuthUser.mockRejectedValueOnce(new Error("no session"));
    mockDb.query.lists.findFirst.mockResolvedValue(publicSource);
    const res = await app.request("/api/lists/abc/fork", { method: "POST" });
    expect(res.status).toBe(401);
  });

  it("resets done to false on all forked items and copies geo", async () => {
    mockGetAuthUser.mockResolvedValueOnce({ session: { user: { id: "u2" } } });
    mockDb.query.lists.findFirst.mockResolvedValue(publicSource);
    mockDb.query.items.findMany.mockResolvedValue([
      {
        id: "i1",
        listId: "abc",
        text: "Hecha",
        done: true,
        position: 0,
        latitude: "1.0",
        longitude: "2.0",
        placeName: "Roma",
      },
    ]);
    const itemsValues = vi.fn().mockResolvedValue(undefined);
    mockDb.insert.mockImplementation((table) =>
      table === lists
        ? {
            values: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([{ id: "xyz", name: "X" }]),
            }),
          }
        : table === items
          ? { values: itemsValues }
          : { values: vi.fn().mockResolvedValue(undefined) }
    );

    await app.request("/api/lists/abc/fork", { method: "POST" });
    expect(itemsValues).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ done: false, placeName: "Roma" }),
      ])
    );
  });

  it("notifies the source owner that their list was forked", async () => {
    mockGetAuthUser.mockResolvedValueOnce({ session: { user: { id: "u2" } } });
    mockDb.query.lists.findFirst.mockResolvedValue(publicSource);
    mockDb.query.items.findMany.mockResolvedValue([]);
    mockDb.insert.mockImplementation((table) =>
      table === lists
        ? {
            values: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([{ id: "xyz", name: "X" }]),
            }),
          }
        : { values: vi.fn().mockResolvedValue(undefined) }
    );

    await app.request("/api/lists/abc/fork", { method: "POST" });
    expect(mockDb.insert).toHaveBeenCalledWith(notifications);
  });

  it("returns 404 when source list not found", async () => {
    mockGetAuthUser.mockResolvedValueOnce({ session: { user: { id: "u2" } } });
    mockDb.query.lists.findFirst.mockResolvedValue(null);
    const res = await app.request("/api/lists/nonexistent/fork", {
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

describe("PATCH toggle item_done fan-out", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthUser.mockResolvedValue({
      session: { user: { id: "collab-1" } },
    });
  });
  afterEach(() => {
    mockGetAuthUser.mockRejectedValue(new Error("no session"));
  });

  function setupSharedToggle(opts: {
    collaborative: boolean;
    newDone: boolean;
    isOwner?: boolean;
  }) {
    const ownerId = opts.isOwner ? "collab-1" : "owner-1";
    mockDb.query.lists.findFirst.mockResolvedValue({
      id: "abc",
      name: "Lista",
      ownerId,
      collaborative: opts.collaborative,
      public: true,
    });
    mockDb.query.items.findFirst.mockResolvedValue({
      id: "i1",
      done: !opts.newDone,
    });
    mockDb.query.participations.findFirst.mockResolvedValue({
      role: "collaborator",
    });
    mockDb.query.participations.findMany.mockResolvedValue([
      { userId: "collab-1" },
      { userId: "collab-2" },
    ]);
    mockDb.query.users.findFirst.mockResolvedValue({
      name: "Ana",
      image: null,
    });
    mockDb.query.notifications.findFirst.mockResolvedValue(null);
    mockDb.update.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi
            .fn()
            .mockResolvedValue([
              { id: "i1", listId: "abc", done: opts.newDone },
            ]),
        }),
      }),
    });
  }

  it("fans out item_done to other participants when toggled to done", async () => {
    setupSharedToggle({ collaborative: true, newDone: true });
    const notifChain = chainableInsert();
    mockDb.insert.mockReturnValue(notifChain);

    const res = await app.request("/api/lists/abc/items/i1/toggle", {
      method: "PATCH",
    });

    expect(res.status).toBe(200);
    expect(mockDb.insert).toHaveBeenCalledWith(notifications);
    expect(notifChain.values).toHaveBeenCalledTimes(2);
    const recipients = notifChain.values.mock.calls.map(
      (call: unknown[]) => (call[0] as { userId: string }).userId
    );
    expect(recipients).toEqual(expect.arrayContaining(["owner-1", "collab-2"]));
    expect(recipients).not.toContain("collab-1");
  });

  it("does not fan out when toggling from done to undone", async () => {
    setupSharedToggle({ collaborative: true, newDone: false });
    mockDb.insert.mockReturnValue(chainableInsert());

    const res = await app.request("/api/lists/abc/items/i1/toggle", {
      method: "PATCH",
    });

    expect(res.status).toBe(200);
    expect(mockDb.insert).not.toHaveBeenCalledWith(notifications);
  });

  it("does not fan out item_done on non-collaborative lists", async () => {
    mockGetAuthUser.mockResolvedValue({
      session: { user: { id: "owner-1" } },
    });
    setupSharedToggle({ collaborative: false, newDone: true, isOwner: true });
    mockDb.insert.mockReturnValue(chainableInsert());

    const res = await app.request("/api/lists/abc/items/i1/toggle", {
      method: "PATCH",
    });

    expect(res.status).toBe(200);
    expect(mockDb.insert).not.toHaveBeenCalledWith(notifications);
  });
});

describe("PATCH toggle list_completed fan-out", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthUser.mockResolvedValue({
      session: { user: { id: "collab-1" } },
    });
    mockDb.query.lists.findFirst.mockResolvedValue({
      id: "abc",
      name: "Lista",
      ownerId: "owner-1",
      collaborative: true,
      public: true,
    });
    mockDb.query.items.findFirst.mockResolvedValue({ id: "i1", done: false });
    mockDb.query.participations.findFirst.mockResolvedValue({
      role: "collaborator",
    });
    mockDb.query.participations.findMany.mockResolvedValue([
      { userId: "collab-1" },
    ]);
    mockDb.query.users.findFirst.mockResolvedValue({
      name: "Ana",
      image: null,
    });
    mockDb.query.notifications.findFirst.mockResolvedValue(null);
  });
  afterEach(() => {
    mockGetAuthUser.mockRejectedValue(new Error("no session"));
  });

  function mockUpdate(opts: { listClosedRows: number }) {
    mockDb.update.mockImplementation((tbl: unknown) => {
      const isLists = tbl === lists;
      return {
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue(
              isLists
                ? Array.from({ length: opts.listClosedRows }, () => ({
                    id: "abc",
                  }))
                : [{ id: "i1", listId: "abc", done: true }]
            ),
          }),
        }),
      };
    });
  }

  it("fires list_completed once when the last pending item is closed", async () => {
    mockDb.$count.mockResolvedValue(0);
    mockUpdate({ listClosedRows: 1 });
    const notifChain = chainableInsert();
    mockDb.insert.mockReturnValue(notifChain);

    const res = await app.request("/api/lists/abc/items/i1/toggle", {
      method: "PATCH",
    });

    expect(res.status).toBe(200);
    const types = notifChain.values.mock.calls.map(
      (call: unknown[]) => (call[0] as { type: string }).type
    );
    expect(types).toContain("list_completed");
    expect(types.filter((t: string) => t === "list_completed")).toHaveLength(1);
  });

  it("does not fire list_completed when items are still pending", async () => {
    mockDb.$count.mockResolvedValue(2);
    mockUpdate({ listClosedRows: 0 });
    const notifChain = chainableInsert();
    mockDb.insert.mockReturnValue(notifChain);

    const res = await app.request("/api/lists/abc/items/i1/toggle", {
      method: "PATCH",
    });

    expect(res.status).toBe(200);
    const types = notifChain.values.mock.calls.map(
      (call: unknown[]) => (call[0] as { type: string }).type
    );
    expect(types).not.toContain("list_completed");
  });

  it("does not fire list_completed when the list was already completed", async () => {
    mockDb.$count.mockResolvedValue(0);
    mockUpdate({ listClosedRows: 0 });
    const notifChain = chainableInsert();
    mockDb.insert.mockReturnValue(notifChain);

    const res = await app.request("/api/lists/abc/items/i1/toggle", {
      method: "PATCH",
    });

    expect(res.status).toBe(200);
    const types = notifChain.values.mock.calls.map(
      (call: unknown[]) => (call[0] as { type: string }).type
    );
    expect(types).not.toContain("list_completed");
  });
});

describe("GET /api/lists/:listId/items (participant item_progress)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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

  it("includes followerCount per user", async () => {
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
      .mockReturnValueOnce(followersChain);

    const res = await app.request("/api/users");
    const body = (await res.json()) as {
      users: {
        id: string;
        followerCount: number;
      }[];
    };
    expect(body.users[0].followerCount).toBe(7);
  });

  it("returns nextCursor when page is full", async () => {
    const fullPage = Array.from({ length: 20 }, (_, i) => ({
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
    expect(body.nextCursor).toBe("u19");
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

describe("device-tokens endpoints", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthUser.mockRejectedValue(new Error("no session"));
  });

  it("POST returns 401 when unauthenticated", async () => {
    const res = await app.request("/api/me/device-tokens", {
      method: "POST",
      body: JSON.stringify({ token: "ExponentPushToken[x]", platform: "ios" }),
      headers: { "Content-Type": "application/json" },
    });
    expect(res.status).toBe(401);
  });

  it("POST returns 400 on invalid platform", async () => {
    mockGetAuthUser.mockResolvedValue({ session: { user: { id: "u1" } } });
    const res = await app.request("/api/me/device-tokens", {
      method: "POST",
      body: JSON.stringify({ token: "ExponentPushToken[x]", platform: "web" }),
      headers: { "Content-Type": "application/json" },
    });
    expect(res.status).toBe(400);
  });

  it("POST upserts the device token for the current user", async () => {
    mockGetAuthUser.mockResolvedValue({ session: { user: { id: "u1" } } });
    const insertChain = chainableInsert();
    mockDb.insert.mockReturnValue(insertChain);

    const res = await app.request("/api/me/device-tokens", {
      method: "POST",
      body: JSON.stringify({
        token: "ExponentPushToken[abc]",
        platform: "android",
      }),
      headers: { "Content-Type": "application/json" },
    });

    expect(res.status).toBe(204);
    expect(mockDb.insert).toHaveBeenCalledWith(deviceTokens);
    expect(insertChain.values).toHaveBeenCalledWith({
      userId: "u1",
      token: "ExponentPushToken[abc]",
      platform: "android",
    });
  });

  it("DELETE returns 401 when unauthenticated", async () => {
    const res = await app.request("/api/me/device-tokens/x", {
      method: "DELETE",
    });
    expect(res.status).toBe(401);
  });

  it("DELETE removes only the caller's token", async () => {
    mockGetAuthUser.mockResolvedValue({ session: { user: { id: "u1" } } });
    const whereMock = vi.fn().mockResolvedValue(undefined);
    mockDb.delete.mockReturnValue({ where: whereMock });

    const res = await app.request("/api/me/device-tokens/abc", {
      method: "DELETE",
    });

    expect(res.status).toBe(204);
    expect(mockDb.delete).toHaveBeenCalledWith(deviceTokens);
    expect(whereMock).toHaveBeenCalled();
  });
});

describe("Expo push dispatch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthUser.mockResolvedValue({
      session: { user: { id: "collab-1" } },
    });
    mockDb.query.lists.findFirst.mockResolvedValue({
      id: "abc",
      name: "Lista",
      ownerId: "owner-1",
      collaborative: true,
      public: true,
    });
    mockDb.query.items.findFirst.mockResolvedValue({ id: "i1", done: false });
    mockDb.query.participations.findFirst.mockResolvedValue({
      role: "collaborator",
    });
    mockDb.query.participations.findMany.mockResolvedValue([
      { userId: "collab-1" },
    ]);
    mockDb.query.users.findFirst.mockResolvedValue({
      name: "Ana",
      image: null,
    });
    mockDb.query.notifications.findFirst.mockResolvedValue(null);
    mockDb.$count.mockResolvedValue(1);
    mockDb.update.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi
            .fn()
            .mockResolvedValue([{ id: "i1", listId: "abc", done: true }]),
        }),
      }),
    });
    mockDb.insert.mockReturnValue(chainableInsert());
  });
  afterEach(() => {
    mockGetAuthUser.mockRejectedValue(new Error("no session"));
  });

  it("sends a push to every device token of the recipient on item_done", async () => {
    mockDb.query.deviceTokens.findMany.mockResolvedValue([
      { token: "ExponentPushToken[A]" },
      { token: "ExponentPushToken[B]" },
    ]);

    const res = await app.request("/api/lists/abc/items/i1/toggle", {
      method: "PATCH",
    });

    expect(res.status).toBe(200);
    expect(mockSendExpoPush).toHaveBeenCalledTimes(1);
    const messages = (
      mockSendExpoPush as unknown as { mock: { calls: unknown[][] } }
    ).mock.calls[0]?.[0] as Array<{ to: string; body: string }>;
    expect(messages.map((m) => m.to)).toEqual([
      "ExponentPushToken[A]",
      "ExponentPushToken[B]",
    ]);
    expect(messages[0]?.body).toContain("Ana");
    expect(messages[0]?.body).toContain("«Lista»");
  });

  it("does not send a push when the recipient has no device tokens", async () => {
    mockDb.query.deviceTokens.findMany.mockResolvedValue([]);

    const res = await app.request("/api/lists/abc/items/i1/toggle", {
      method: "PATCH",
    });

    expect(res.status).toBe(200);
    expect(mockSendExpoPush).not.toHaveBeenCalled();
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

describe("GET /api/users/me/settings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthUser.mockRejectedValue(new Error("no session"));
  });

  it("returns 401 when unauthenticated", async () => {
    const res = await app.request("/api/users/me/settings");
    expect(res.status).toBe(401);
  });

  it("returns showAdult=false by default when no row exists", async () => {
    mockGetAuthUser.mockResolvedValue({ session: { user: { id: "u1" } } });
    mockDb.query.userSettings.findFirst.mockResolvedValue(undefined);

    const res = await app.request("/api/users/me/settings");
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.showAdult).toBe(false);
  });

  it("returns persisted showAdult value", async () => {
    mockGetAuthUser.mockResolvedValue({ session: { user: { id: "u1" } } });
    mockDb.query.userSettings.findFirst.mockResolvedValue({
      userId: "u1",
      showAdult: true,
    });

    const res = await app.request("/api/users/me/settings");
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.showAdult).toBe(true);
  });
});

describe("PATCH /api/users/me/settings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthUser.mockRejectedValue(new Error("no session"));
  });

  it("returns 401 when unauthenticated", async () => {
    const res = await app.request("/api/users/me/settings", {
      method: "PATCH",
      body: JSON.stringify({ showAdult: true }),
      headers: { "Content-Type": "application/json" },
    });
    expect(res.status).toBe(401);
  });

  it("returns 400 when no fields are provided", async () => {
    mockGetAuthUser.mockResolvedValue({ session: { user: { id: "u1" } } });
    const res = await app.request("/api/users/me/settings", {
      method: "PATCH",
      body: JSON.stringify({}),
      headers: { "Content-Type": "application/json" },
    });
    expect(res.status).toBe(400);
  });

  it("upserts showAdult and returns the new value", async () => {
    mockGetAuthUser.mockResolvedValue({ session: { user: { id: "u1" } } });
    const returningMock = vi.fn().mockResolvedValue([{ showAdult: true }]);
    const onConflictMock = vi
      .fn()
      .mockReturnValue({ returning: returningMock });
    const valuesMock = vi
      .fn()
      .mockReturnValue({ onConflictDoUpdate: onConflictMock });
    mockDb.insert.mockReturnValue({ values: valuesMock });

    const res = await app.request("/api/users/me/settings", {
      method: "PATCH",
      body: JSON.stringify({ showAdult: true }),
      headers: { "Content-Type": "application/json" },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.showAdult).toBe(true);
    expect(valuesMock).toHaveBeenCalledWith({
      userId: "u1",
      showAdult: true,
    });
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

import { signUnsubscribeToken } from "./email-token.js";

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

import { signUnsubscribeToken as _sign } from "./email-token.js";

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

describe("DELETE /api/me", () => {
  const headers = { "x-forwarded-for": "10.9.0.1" };
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthUser.mockRejectedValue(new Error("no session"));
  });

  it("returns 401 when unauthenticated", async () => {
    const res = await app.request("/api/me", { method: "DELETE", headers });
    expect(res.status).toBe(401);
  });

  it("anonymizes PII, despublishes owned lists and revokes sessions", async () => {
    mockGetAuthUser.mockResolvedValue({ session: { user: { id: "u1" } } });
    const userSet = vi
      .fn()
      .mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) });
    const listsSet = vi
      .fn()
      .mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) });
    mockDb.update
      .mockReturnValueOnce({ set: userSet })
      .mockReturnValueOnce({ set: listsSet });
    mockDb.delete.mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    });

    const res = await app.request("/api/me", { method: "DELETE", headers });
    expect(res.status).toBe(200);

    expect(userSet).toHaveBeenCalledTimes(1);
    const userPatch = userSet.mock.calls[0][0] as Record<string, unknown>;
    expect(userPatch.name).toBeNull();
    expect(userPatch.image).toBeNull();
    expect(userPatch.passwordHash).toBeNull();
    expect(userPatch.emailVerified).toBeNull();
    expect(userPatch.publicProfile).toBe(false);
    expect(userPatch.email).toBe("deleted-u1@deleted.wilist.invalid");
    expect(userPatch.deletedAt).toBeInstanceOf(Date);

    expect(listsSet).toHaveBeenCalledTimes(1);
    expect(listsSet.mock.calls[0][0]).toEqual({
      public: false,
      collaborative: false,
    });

    expect(mockDb.delete.mock.calls.length).toBeGreaterThanOrEqual(6);
  });
});

describe("GET /api/lists/:listId on anonymized owner's list", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthUser.mockRejectedValue(new Error("no session"));
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue(
          Object.assign(Promise.resolve([{ avg: null, count: 0 }]), {
            limit: vi.fn().mockResolvedValue([]),
          })
        ),
      }),
    });
  });

  it("returns 404 to a stranger when the list is despublished", async () => {
    mockGetAuthUser.mockResolvedValue({
      session: { user: { id: "stranger" } },
    });
    mockDb.query.lists.findFirst.mockResolvedValue({
      id: "abc",
      ownerId: "anon-owner",
      public: false,
      collaborative: false,
    });
    mockDb.query.participations.findFirst.mockResolvedValue(null);
    mockDb.query.listPurchases.findFirst.mockResolvedValue(null);

    const res = await app.request("/api/lists/abc", {
      headers: { "x-forwarded-for": "10.9.1.1" },
    });
    expect(res.status).toBe(404);
  });

  it("lets an existing challenger keep viewing the list", async () => {
    mockGetAuthUser.mockResolvedValue({
      session: { user: { id: "challenger" } },
    });
    mockDb.query.lists.findFirst.mockResolvedValue({
      id: "abc",
      ownerId: "anon-owner",
      public: false,
      collaborative: false,
    });
    mockDb.query.participations.findFirst.mockResolvedValue({
      id: "p1",
      role: "challenger",
      completedAt: null,
    });

    const res = await app.request("/api/lists/abc", {
      headers: { "x-forwarded-for": "10.9.1.2" },
    });
    expect(res.status).toBe(200);
  });

  it("lets a prior buyer keep viewing the list", async () => {
    mockGetAuthUser.mockResolvedValue({ session: { user: { id: "buyer" } } });
    mockDb.query.lists.findFirst.mockResolvedValue({
      id: "abc",
      ownerId: "anon-owner",
      public: false,
      collaborative: false,
    });
    mockDb.query.participations.findFirst.mockResolvedValue(null);
    mockDb.query.listPurchases.findFirst.mockResolvedValue({ id: "lp1" });

    const res = await app.request("/api/lists/abc", {
      headers: { "x-forwarded-for": "10.9.1.3" },
    });
    expect(res.status).toBe(200);
  });
});

describe("POST /api/lists/:listId/checkout on anonymized owner's list", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthUser.mockRejectedValue(new Error("no session"));
  });

  it("returns 410 when the list is no longer public", async () => {
    mockGetAuthUser.mockResolvedValue({ session: { user: { id: "buyer" } } });
    mockDb.query.lists.findFirst.mockResolvedValue({
      id: "abc",
      ownerId: "anon-owner",
      name: "Old list",
      public: false,
    });

    const res = await app.request("/api/lists/abc/checkout", {
      method: "POST",
      headers: { "x-forwarded-for": "10.9.2.1" },
    });
    expect(res.status).toBe(410);
  });
});

describe("POST /api/auth-web/signup", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates a user with a hashed password and returns ok", async () => {
    mockDb.query.users.findFirst.mockResolvedValue(undefined);
    const valuesMock = vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue([{ id: "new-user" }]),
    });
    mockDb.insert.mockReturnValue({ values: valuesMock });

    const res = await app.request("/api/auth-web/signup", {
      method: "POST",
      body: JSON.stringify({
        email: "new@example.com",
        password: "supersecret",
        name: "New User",
      }),
      headers: { "Content-Type": "application/json" },
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    const inserted = valuesMock.mock.calls[0][0];
    expect(inserted.email).toBe("new@example.com");
    expect(inserted.name).toBe("New User");
    expect(inserted.passwordHash).toMatch(/^pbkdf2_sha256\$/);
    expect(inserted.passwordHash).not.toContain("supersecret");
  });

  it("returns 409 when the email is already in use", async () => {
    mockDb.query.users.findFirst.mockResolvedValue({ id: "existing" });

    const res = await app.request("/api/auth-web/signup", {
      method: "POST",
      body: JSON.stringify({
        email: "taken@example.com",
        password: "supersecret",
      }),
      headers: { "Content-Type": "application/json" },
    });

    expect(res.status).toBe(409);
    expect(mockDb.insert).not.toHaveBeenCalled();
  });

  it("returns 400 when the password is shorter than 8 characters", async () => {
    const res = await app.request("/api/auth-web/signup", {
      method: "POST",
      body: JSON.stringify({ email: "short@example.com", password: "short" }),
      headers: { "Content-Type": "application/json" },
    });

    expect(res.status).toBe(400);
  });
});

describe("GET /api/feed", () => {
  const headers = { "x-forwarded-for": "10.0.0.77" };
  const feedChain = (rows: unknown[]) => ({
    from: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(rows),
  });

  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    mockGetAuthUser.mockRejectedValueOnce(new Error("no session"));
    const res = await app.request("/api/feed", { headers });
    expect(res.status).toBe(401);
  });

  it("returns { items, nextCursor: null } when results fit within the page", async () => {
    mockGetAuthUser.mockResolvedValueOnce({ session: { user: { id: "u1" } } });
    const rows = [
      {
        id: "a1",
        action: "challenge_completed",
        createdAt: new Date("2024-01-01"),
        listId: "l1",
        listName: "Cine",
        listSlug: "cine",
        newValue: null,
        actorId: "u2",
        actorName: "Ana",
        actorImage: null,
      },
    ];
    mockDb.select.mockReturnValue(feedChain(rows));

    const res = await app.request("/api/feed", { headers });
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect((body.items as unknown[]).length).toBe(1);
    expect(body.nextCursor).toBeNull();
  });

  it("returns nextCursor when results fill the page", async () => {
    mockGetAuthUser.mockResolvedValueOnce({ session: { user: { id: "u1" } } });
    const rows = Array.from({ length: 30 }, (_, i) => ({
      id: `a${i}`,
      action: "item_added",
      createdAt: new Date(`2024-01-${String(i + 1).padStart(2, "0")}`),
      listId: "l1",
      listName: "Cine",
      listSlug: "cine",
      newValue: { text: "x" },
      actorId: "u2",
      actorName: "Ana",
      actorImage: null,
    }));
    mockDb.select.mockReturnValue(feedChain(rows));

    const res = await app.request("/api/feed", { headers });
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.nextCursor).not.toBeNull();
  });

  it("accepts a cursor param to paginate", async () => {
    mockGetAuthUser.mockResolvedValueOnce({ session: { user: { id: "u1" } } });
    mockDb.select.mockReturnValue(feedChain([]));

    const res = await app.request("/api/feed?cursor=2024-06-01T00:00:00.000Z", {
      headers,
    });
    expect(res.status).toBe(200);
    const chain = mockDb.select.mock.results[0].value;
    expect(chain.where).toHaveBeenCalled();
  });
});

describe("OG share routes", () => {
  const ogChain = (rows: unknown[]) => ({
    from: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue(rows),
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.$count.mockResolvedValue(0);
  });

  it("GET /api/share/:listId injects per-list meta tags for crawlers", async () => {
    mockDb.query.lists.findFirst.mockResolvedValue({
      id: "l1",
      name: "Pueblos de España",
      slug: "pueblos",
      description: "Los más bonitos",
    });
    mockDb.select.mockReturnValue(ogChain([{ ownerName: "Ana" }]));

    const res = await app.request("/api/share/pueblos");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('property="og:image"');
    expect(html).toContain("https://www.welist.io/api/og/pueblos");
    expect(html).toContain("https://www.welist.io/explore/pueblos");
    expect(html).toContain("Pueblos de España");
    expect(html).toContain('name="twitter:card" content="summary_large_image"');
  });

  it("GET /api/share/:listId redirects to /explore when the list is missing", async () => {
    mockDb.query.lists.findFirst.mockResolvedValue(undefined);

    const res = await app.request("/api/share/nope");
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toContain("/explore");
  });

  it("GET /api/og/:listId returns 404 when the list is missing", async () => {
    mockDb.query.lists.findFirst.mockResolvedValue(undefined);

    const res = await app.request("/api/og/nope");
    expect(res.status).toBe(404);
  });

  it("GET /api/og/:listId renders an image for an existing list", async () => {
    mockDb.query.lists.findFirst.mockResolvedValue({
      id: "l1",
      name: "Cine",
      slug: "cine",
      description: null,
    });
    mockDb.select.mockReturnValue(ogChain([{ ownerName: "Ana" }]));

    const res = await app.request("/api/og/cine");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("image/png");
  });
});

describe("GET /api/cron/weekly-recap", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "cron-test-secret";
  });

  it("returns 401 without the cron secret", async () => {
    const res = await app.request("/api/cron/weekly-recap");
    expect(res.status).toBe(401);
  });

  it("creates one recap notification per user with weekly activity", async () => {
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      groupBy: vi.fn().mockResolvedValue([
        { userId: "u1", type: "challenge_accepted", count: 3 },
        { userId: "u1", type: "new_follower", count: 1 },
        { userId: "u2", type: "challenge_completed", count: 2 },
      ]),
    });
    mockDb.insert.mockReturnValue(chainableInsert());
    mockDb.query.deviceTokens.findMany.mockResolvedValue([]);

    const res = await app.request("/api/cron/weekly-recap", {
      headers: { Authorization: "Bearer cron-test-secret" },
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ sent: 2 });
    expect(mockDb.insert).toHaveBeenCalledWith(notifications);
  });

  it("sends nothing when there was no activity", async () => {
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      groupBy: vi.fn().mockResolvedValue([]),
    });

    const res = await app.request("/api/cron/weekly-recap", {
      headers: { Authorization: "Bearer cron-test-secret" },
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ sent: 0 });
  });
});

describe("GET /api/lists/:listId/duel/:opponentId", () => {
  const headers = { "x-forwarded-for": "10.0.0.55" };
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.$count.mockResolvedValue(0);
  });
  afterEach(() => {
    mockDb.query.users.findFirst.mockReset();
    mockDb.$count.mockReset();
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetAuthUser.mockRejectedValueOnce(new Error("no session"));
    mockDb.query.lists.findFirst.mockResolvedValue({
      id: "abc",
      ownerId: "owner",
      collaborative: false,
      public: true,
    });
    const res = await app.request("/api/lists/abc/duel/u2", { headers });
    expect(res.status).toBe(401);
  });

  it("returns 400 when dueling yourself", async () => {
    mockGetAuthUser.mockResolvedValueOnce({ session: { user: { id: "u1" } } });
    mockDb.query.lists.findFirst.mockResolvedValue({
      id: "abc",
      ownerId: "owner",
      collaborative: false,
      public: true,
    });
    const res = await app.request("/api/lists/abc/duel/u1", { headers });
    expect(res.status).toBe(400);
  });

  it("returns head-to-head progress for two challengers", async () => {
    mockGetAuthUser.mockResolvedValueOnce({ session: { user: { id: "u1" } } });
    mockDb.query.lists.findFirst.mockResolvedValue({
      id: "abc",
      ownerId: "owner",
      collaborative: false,
      public: true,
    });
    mockDb.query.users.findFirst
      .mockResolvedValueOnce({ id: "u1", name: "Me", image: null })
      .mockResolvedValueOnce({ id: "u2", name: "Rival", image: null });
    // neither is owner/collaborator -> challenger path
    mockDb.query.participations.findFirst.mockResolvedValue(null);
    mockDb.$count.mockResolvedValue(10); // totalItems
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([{ count: 4 }]),
    });

    const res = await app.request("/api/lists/abc/duel/u2", { headers });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      totalItems: number;
      me: { id: string; done: number };
      opponent: { id: string; done: number };
    };
    expect(body.totalItems).toBe(10);
    expect(body.me.id).toBe("u1");
    expect(body.opponent.id).toBe("u2");
    expect(body.me.done).toBe(4);
    expect(body.opponent.done).toBe(4);
  });

  it("returns 404 when the opponent does not exist", async () => {
    mockGetAuthUser.mockResolvedValueOnce({ session: { user: { id: "u1" } } });
    mockDb.query.lists.findFirst.mockResolvedValue({
      id: "abc",
      ownerId: "owner",
      collaborative: false,
      public: true,
    });
    mockDb.query.users.findFirst
      .mockResolvedValueOnce({ id: "u1", name: "Me", image: null })
      .mockResolvedValueOnce(undefined);
    const res = await app.request("/api/lists/abc/duel/ghost", { headers });
    expect(res.status).toBe(404);
  });
});

describe("web push subscription endpoints", () => {
  const headers = { "Content-Type": "application/json" };
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => {
    delete process.env.VAPID_PUBLIC_KEY;
  });

  it("exposes the VAPID public key", async () => {
    process.env.VAPID_PUBLIC_KEY = "test-public-key";
    const res = await app.request("/api/web-push/public-key");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ publicKey: "test-public-key" });
  });

  it("returns 401 subscribing while unauthenticated", async () => {
    mockGetAuthUser.mockRejectedValueOnce(new Error("no session"));
    const res = await app.request("/api/me/web-push", {
      method: "POST",
      headers,
      body: JSON.stringify({
        endpoint: "https://push.example.com/abc",
        keys: { p256dh: "key", auth: "auth" },
      }),
    });
    expect(res.status).toBe(401);
  });

  it("saves a subscription for the authenticated user", async () => {
    mockGetAuthUser.mockResolvedValueOnce({ session: { user: { id: "u1" } } });
    const valuesMock = vi.fn().mockReturnValue({
      onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
    });
    mockDb.insert.mockReturnValue({ values: valuesMock });

    const res = await app.request("/api/me/web-push", {
      method: "POST",
      headers,
      body: JSON.stringify({
        endpoint: "https://push.example.com/abc",
        keys: { p256dh: "key", auth: "auth" },
      }),
    });
    expect(res.status).toBe(204);
    expect(mockDb.insert).toHaveBeenCalledWith(webPushSubscriptions);
  });

  it("rejects an invalid endpoint", async () => {
    mockGetAuthUser.mockResolvedValueOnce({ session: { user: { id: "u1" } } });
    const res = await app.request("/api/me/web-push", {
      method: "POST",
      headers,
      body: JSON.stringify({
        endpoint: "not-a-url",
        keys: { p256dh: "key", auth: "auth" },
      }),
    });
    expect(res.status).toBe(400);
  });

  it("deletes a subscription by endpoint", async () => {
    mockGetAuthUser.mockResolvedValueOnce({ session: { user: { id: "u1" } } });
    mockDb.delete.mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    });
    const res = await app.request("/api/me/web-push", {
      method: "DELETE",
      headers,
      body: JSON.stringify({ endpoint: "https://push.example.com/abc" }),
    });
    expect(res.status).toBe(204);
    expect(mockDb.delete).toHaveBeenCalledWith(webPushSubscriptions);
  });
});

void _sign;
