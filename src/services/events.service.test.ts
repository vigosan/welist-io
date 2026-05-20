import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { eventsService } from "./events.service";

describe("eventsService.track", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("posts a single event wrapped in the events array", async () => {
    await eventsService.track({ type: "explore_view" });

    expect(fetch).toHaveBeenCalledWith(
      "/api/events",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ events: [{ type: "explore_view" }] }),
      })
    );
  });

  it("passes listId, itemId and metadata through", async () => {
    await eventsService.track({
      type: "list_view",
      listId: "l1",
      metadata: { ref: "feed" },
    });

    expect(fetch).toHaveBeenCalledWith(
      "/api/events",
      expect.objectContaining({
        body: JSON.stringify({
          events: [
            { type: "list_view", listId: "l1", metadata: { ref: "feed" } },
          ],
        }),
      })
    );
  });

  it("does not throw when the network fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    await expect(
      eventsService.track({ type: "explore_view" })
    ).resolves.toBeUndefined();
  });
});
