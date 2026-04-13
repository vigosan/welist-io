import { apiClient } from "@/lib/api-client";
import type { List, Item } from "@/db/schema";

export type ExploreItem = Pick<List, "id" | "name" | "slug" | "description" | "coverUrl" | "createdAt"> & {
  itemCount: number;
  participantCount: number;
  completedCount: number;
  ownerImage: string | null;
};

export const listsService = {
  get: (listId: string) =>
    apiClient<List>(`/api/lists/${listId}`),

  create: (name: string) =>
    apiClient<List>("/api/lists", { method: "POST", body: JSON.stringify({ name }) }),

  update: (listId: string, patch: { name?: string; slug?: string | null; description?: string | null; coverUrl?: string | null; public?: boolean; collaborative?: boolean }) =>
    apiClient<List>(`/api/lists/${listId}`, { method: "PATCH", body: JSON.stringify(patch) }),

  explore: (q?: string, cursor?: string, sort?: string) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (cursor) params.set("cursor", cursor);
    if (sort) params.set("sort", sort);
    const qs = params.toString();
    return apiClient<{ items: ExploreItem[]; nextCursor: string | null }>(`/api/explore${qs ? `?${qs}` : ""}`);
  },

  clone: (listId: string) =>
    apiClient<List>(`/api/lists/${listId}/clone`, { method: "POST" }),

  exploreItems: (listId: string) =>
    apiClient<Item[]>(`/api/explore/${listId}/items`),

  accept: (listId: string) =>
    apiClient<List>(`/api/lists/${listId}/accept`, { method: "POST" }),

  remove: (listId: string) =>
    apiClient<void>(`/api/lists/${listId}`, { method: "DELETE" }),

  myLists: (cursor?: string, q?: string, sort?: string) => {
    const params = new URLSearchParams();
    if (cursor) params.set("cursor", cursor);
    if (q) params.set("q", q);
    if (sort) params.set("sort", sort);
    const qs = params.toString();
    return apiClient<{ items: List[]; nextCursor: string | null }>(`/api/my-lists${qs ? `?${qs}` : ""}`);
  },
};
