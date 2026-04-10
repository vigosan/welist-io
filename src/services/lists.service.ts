import { apiClient } from "@/lib/api-client";
import type { List } from "@/db/schema";

export const listsService = {
  get: (listId: string) =>
    apiClient<List>(`/api/lists/${listId}`),

  create: (name: string) =>
    apiClient<List>("/api/lists", { method: "POST", body: JSON.stringify({ name }) }),

  update: (listId: string, patch: { name?: string; slug?: string | null }) =>
    apiClient<List>(`/api/lists/${listId}`, { method: "PATCH", body: JSON.stringify(patch) }),
};
