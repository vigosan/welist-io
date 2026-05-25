import { beforeEach, describe, expect, it, vi } from "vitest";

const mockDb = {
  query: {
    users: { findFirst: vi.fn() },
  },
  insert: vi.fn(),
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

const mockVerifyGoogle = vi.fn();
const mockVerifyApple = vi.fn();
const mockIssueToken = vi.fn();
const mockVerifyToken = vi.fn();

vi.mock("./auth-mobile", async (importOriginal) => {
  const original = await importOriginal<typeof import("./auth-mobile")>();
  return {
    ...original,
    verifyGoogleIdToken: (...args: unknown[]) => mockVerifyGoogle(...args),
    verifyAppleIdToken: (...args: unknown[]) => mockVerifyApple(...args),
    issueMobileToken: (...args: unknown[]) => mockIssueToken(...args),
    verifyMobileToken: (...args: unknown[]) => mockVerifyToken(...args),
    getGoogleMobileAudiences: () => ["google-client-id"],
    getAppleAudiences: () => ["io.wilist.app"],
  };
});

process.env.AUTH_SECRET = "test-secret";

const { app } = await import("./app");

describe("POST /api/auth-mobile/exchange", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthUser.mockRejectedValue(new Error("no session"));
  });

  it("returns 400 when body is invalid", async () => {
    const res = await app.request("/api/auth-mobile/exchange", {
      method: "POST",
      body: JSON.stringify({ provider: "google" }),
      headers: { "Content-Type": "application/json" },
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 when provider is unknown", async () => {
    const res = await app.request("/api/auth-mobile/exchange", {
      method: "POST",
      body: JSON.stringify({ provider: "facebook", idToken: "x" }),
      headers: { "Content-Type": "application/json" },
    });
    expect(res.status).toBe(400);
  });

  it("returns 401 when the id token does not verify", async () => {
    mockVerifyGoogle.mockRejectedValue(new Error("bad signature"));
    const res = await app.request("/api/auth-mobile/exchange", {
      method: "POST",
      body: JSON.stringify({ provider: "google", idToken: "tampered" }),
      headers: { "Content-Type": "application/json" },
    });
    expect(res.status).toBe(401);
  });

  it("returns 401 when the provider returns no email", async () => {
    mockVerifyGoogle.mockResolvedValue({
      sub: "g-1",
      email: null,
      name: "x",
      image: null,
    });
    const res = await app.request("/api/auth-mobile/exchange", {
      method: "POST",
      body: JSON.stringify({ provider: "google", idToken: "ok" }),
      headers: { "Content-Type": "application/json" },
    });
    expect(res.status).toBe(401);
  });

  it("creates a user on first sign-in and returns a token", async () => {
    mockVerifyGoogle.mockResolvedValue({
      sub: "g-new",
      email: "new@example.com",
      name: "New User",
      image: "https://img/u.png",
    });
    mockDb.query.users.findFirst.mockResolvedValue(undefined);
    mockDb.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([
          {
            id: "g-new",
            name: "New User",
            email: "new@example.com",
            image: "https://img/u.png",
          },
        ]),
      }),
    });
    mockIssueToken.mockResolvedValue("issued-token");

    const res = await app.request("/api/auth-mobile/exchange", {
      method: "POST",
      body: JSON.stringify({ provider: "google", idToken: "ok" }),
      headers: { "Content-Type": "application/json" },
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      token: string;
      user: { id: string; email: string };
    };
    expect(body.token).toBe("issued-token");
    expect(body.user.id).toBe("g-new");
    expect(body.user.email).toBe("new@example.com");
    expect(mockDb.insert).toHaveBeenCalled();
  });

  it("reuses an existing user matched by email instead of creating a duplicate", async () => {
    mockVerifyApple.mockResolvedValue({
      sub: "apple-sub",
      email: "existing@example.com",
      name: null,
      image: null,
    });
    mockDb.query.users.findFirst.mockResolvedValue({
      id: "previously-google-id",
      name: "Existing",
      email: "existing@example.com",
      image: null,
    });
    mockIssueToken.mockResolvedValue("issued-token-2");

    const res = await app.request("/api/auth-mobile/exchange", {
      method: "POST",
      body: JSON.stringify({ provider: "apple", idToken: "ok" }),
      headers: { "Content-Type": "application/json" },
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { user: { id: string } };
    expect(body.user.id).toBe("previously-google-id");
    expect(mockDb.insert).not.toHaveBeenCalled();
  });
});

describe("Bearer token middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthUser.mockRejectedValue(new Error("no session"));
  });

  it("authenticates requests with a valid Bearer mobile token", async () => {
    mockVerifyToken.mockResolvedValue({
      id: "u-1",
      name: "Alice",
      email: "alice@example.com",
      image: null,
    });

    const res = await app.request("/api/me", {
      headers: { Authorization: "Bearer good-token" },
    });

    expect(res.status).toBe(200);
    const user = (await res.json()) as { id: string; email: string };
    expect(user.id).toBe("u-1");
    expect(user.email).toBe("alice@example.com");
  });

  it("falls back to cookie auth when Bearer token is invalid", async () => {
    mockVerifyToken.mockResolvedValue(null);

    const res = await app.request("/api/me", {
      headers: { Authorization: "Bearer junk" },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toBeNull();
  });
});
