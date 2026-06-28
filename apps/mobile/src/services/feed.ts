import { apiFetch } from "@/lib/api";
import type { FeedItem, Page } from "@/types";

export const feedService = {
  list: (cursor?: string) => {
    const qs = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
    return apiFetch<Page<FeedItem>>(`/feed${qs}`);
  },
};
