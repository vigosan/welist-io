import type { FeedItem } from "@/types";

export type FeedVerbKey =
  | "feed.itemAdded"
  | "feed.itemEdited"
  | "feed.itemDeleted"
  | "feed.challengeAccepted"
  | "feed.challengeCompleted";

export function feedVerbKey(action: FeedItem["action"]): FeedVerbKey {
  switch (action) {
    case "item_added":
      return "feed.itemAdded";
    case "item_edited":
      return "feed.itemEdited";
    case "item_deleted":
      return "feed.itemDeleted";
    case "challenge_accepted":
      return "feed.challengeAccepted";
    default:
      return "feed.challengeCompleted";
  }
}
