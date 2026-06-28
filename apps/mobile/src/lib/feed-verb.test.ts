import { describe, expect, it } from "vitest";
import { feedVerbKey } from "./feed-verb";

describe("feedVerbKey", () => {
  it("maps each known action to its i18n key", () => {
    expect(feedVerbKey("item_added")).toBe("feed.itemAdded");
    expect(feedVerbKey("item_edited")).toBe("feed.itemEdited");
    expect(feedVerbKey("item_deleted")).toBe("feed.itemDeleted");
    expect(feedVerbKey("challenge_accepted")).toBe("feed.challengeAccepted");
    expect(feedVerbKey("challenge_completed")).toBe("feed.challengeCompleted");
  });
});
