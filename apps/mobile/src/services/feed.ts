import { apiFetch } from "@/lib/api";
import type { FeedItem } from "@/types";

export const feedService = {
  list: () => apiFetch<FeedItem[]>("/feed"),
};
