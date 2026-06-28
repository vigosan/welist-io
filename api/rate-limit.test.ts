import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { rateLimit } from "./rate-limit.js";

function makeApp(limit: number, windowMs: number) {
  const app = new Hono();
  app.use(rateLimit({ limit, windowMs }));
  app.get("/test", (c) => c.text("ok"));
  return app;
}

describe("rateLimit middleware", () => {
  beforeEach(() => vi.useFakeTimers());

  it("allows requests under the limit", async () => {
    const app = makeApp(3, 60_000);
    for (let i = 0; i < 3; i++) {
      const res = await app.request("/test", {
        headers: { "x-forwarded-for": "1.2.3.4" },
      });
      expect(res.status).toBe(200);
    }
  });

  it("blocks the request that exceeds the limit", async () => {
    const app = makeApp(2, 60_000);
    await app.request("/test", {
      headers: { "x-forwarded-for": "1.2.3.4" },
    });
    await app.request("/test", {
      headers: { "x-forwarded-for": "1.2.3.4" },
    });
    const res = await app.request("/test", {
      headers: { "x-forwarded-for": "1.2.3.4" },
    });
    expect(res.status).toBe(429);
  });

  it("resets the counter after the window expires", async () => {
    const app = makeApp(1, 1_000);
    await app.request("/test", {
      headers: { "x-forwarded-for": "1.2.3.4" },
    });
    const blocked = await app.request("/test", {
      headers: { "x-forwarded-for": "1.2.3.4" },
    });
    expect(blocked.status).toBe(429);

    vi.advanceTimersByTime(1_001);
    const allowed = await app.request("/test", {
      headers: { "x-forwarded-for": "1.2.3.4" },
    });
    expect(allowed.status).toBe(200);
  });

  it("tracks IPs independently", async () => {
    const app = makeApp(1, 60_000);
    await app.request("/test", {
      headers: { "x-forwarded-for": "1.1.1.1" },
    });
    const res = await app.request("/test", {
      headers: { "x-forwarded-for": "2.2.2.2" },
    });
    expect(res.status).toBe(200);
  });
});
