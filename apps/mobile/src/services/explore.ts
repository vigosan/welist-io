import { apiFetch } from "@/lib/api";
import type { ExploreDetail, ExploreItem, Item, Page } from "@/types";

export type ExploreSort = "trending" | "created_desc";

export const exploreService = {
  list: (
    cursor?: string,
    q?: string,
    sort?: ExploreSort,
    category?: string
  ) => {
    const params = new URLSearchParams();
    if (cursor) params.set("cursor", cursor);
    if (q) params.set("q", q);
    if (sort) params.set("sort", sort);
    if (category) params.set("category", category);
    const qs = params.toString();
    return apiFetch<Page<ExploreItem>>(`/explore${qs ? `?${qs}` : ""}`);
  },

  detail: (listId: string) => apiFetch<ExploreDetail>(`/explore/${listId}`),

  items: (listId: string) => apiFetch<Item[]>(`/explore/${listId}/items`),

  accept: (listId: string) =>
    apiFetch<{ ok: true }>(`/lists/${listId}/accept`, { method: "POST" }),
};
