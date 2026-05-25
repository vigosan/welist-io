import type { Href } from "expo-router";
import type { AppNotification } from "../types";

export function notificationHref(n: AppNotification): Href | null {
  if (n.type === "new_follower" && n.actorId)
    return { pathname: "/u/[userId]", params: { userId: n.actorId } };
  if (n.listId)
    return { pathname: "/lists/[listId]", params: { listId: n.listId } };
  return null;
}
