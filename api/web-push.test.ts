import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const setVapidDetails = vi.fn();
const sendNotification = vi.fn().mockResolvedValue(undefined);

vi.mock("web-push", () => ({
  default: { setVapidDetails, sendNotification },
}));

describe("sendWebPush", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    delete process.env.VAPID_PUBLIC_KEY;
    delete process.env.VAPID_PRIVATE_KEY;
  });
  afterEach(() => {
    delete process.env.VAPID_PUBLIC_KEY;
    delete process.env.VAPID_PRIVATE_KEY;
  });

  it("skips silently when VAPID keys are not configured", async () => {
    const { sendWebPush } = await import("./web-push");
    const result = await sendWebPush(
      [{ endpoint: "https://e", p256dh: "p", auth: "a" }],
      { title: "T", body: "B" }
    );
    expect(result.skipped).toBe(true);
    expect(sendNotification).not.toHaveBeenCalled();
  });

  it("does nothing for an empty target list", async () => {
    const { sendWebPush } = await import("./web-push");
    const result = await sendWebPush([], { title: "T", body: "B" });
    expect(result.skipped).toBe(false);
    expect(result.staleEndpoints).toEqual([]);
  });

  it("sends to each target when configured", async () => {
    process.env.VAPID_PUBLIC_KEY = "pub";
    process.env.VAPID_PRIVATE_KEY = "priv";
    const { sendWebPush } = await import("./web-push");
    await sendWebPush(
      [
        { endpoint: "https://a", p256dh: "p", auth: "a" },
        { endpoint: "https://b", p256dh: "p", auth: "a" },
      ],
      { title: "T", body: "B" }
    );
    expect(sendNotification).toHaveBeenCalledTimes(2);
  });

  it("reports stale endpoints on 410 so the caller can prune them", async () => {
    process.env.VAPID_PUBLIC_KEY = "pub";
    process.env.VAPID_PRIVATE_KEY = "priv";
    sendNotification.mockRejectedValueOnce({ statusCode: 410 });
    const { sendWebPush } = await import("./web-push");
    const result = await sendWebPush(
      [{ endpoint: "https://gone", p256dh: "p", auth: "a" }],
      { title: "T", body: "B" }
    );
    expect(result.staleEndpoints).toEqual(["https://gone"]);
  });
});
