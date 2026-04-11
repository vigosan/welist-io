import { apiClient } from "@/lib/api-client";
import type { List, Item } from "@/db/schema";

export type ExploreItem = Pick<List, "id" | "name" | "slug" | "description" | "createdAt"> & {
  itemCount: number;
  participantCount: number;
  completedCount: number;
};

export const listsService = {
  get: (listId: string) =>
    apiClient<List>(`/api/lists/${listId}`),

  create: (name: string) =>
    apiClient<List>("/api/lists", { method: "POST", body: JSON.stringify({ name }) }),

  update: (listId: string, patch: { name?: string; slug?: string | null; description?: string | null; public?: boolean }) =>
    apiClient<List>(`/api/lists/${listId}`, { method: "PATCH", body: JSON.stringify(patch) }),

  explore: (q?: string, cursor?: string) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (cursor) params.set("cursor", cursor);
    const qs = params.toString();
    return apiClient<{ items: ExploreItem[]; nextCursor: string | null }>(`/api/explore${qs ? `?${qs}` : ""}`);
  },

  clone: (listId: string) =>
    apiClient<List>(`/api/lists/${listId}/clone`, { method: "POST" }),

  exploreItems: (listId: string) =>
    apiClient<Item[]>(`/api/explore/${listId}/items`),

  accept: (listId: string) =>
    apiClient<List>(`/api/lists/${listId}/accept`, { method: "POST" }),
};
