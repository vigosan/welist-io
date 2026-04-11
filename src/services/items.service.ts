import { apiClient } from "@/lib/api-client";
import type { Item } from "@/db/schema";

export const itemsService = {
  list: (listId: string) =>
    apiClient<Item[]>(`/api/lists/${listId}/items`),

  add: (listId: string, text: string) =>
    apiClient<Item>(`/api/lists/${listId}/items`, { method: "POST", body: JSON.stringify({ text }) }),

  toggle: (listId: string, itemId: string) =>
    apiClient<Item>(`/api/lists/${listId}/items/${itemId}/toggle`, { method: "PATCH" }),

  update: (listId: string, itemId: string, text: string) =>
    apiClient<Item>(`/api/lists/${listId}/items/${itemId}`, { method: "PATCH", body: JSON.stringify({ text }) }),

  delete: (listId: string, itemId: string) =>
    apiClient<void>(`/api/lists/${listId}/items/${itemId}`, { method: "DELETE" }),

  bulkAdd: (listId: string, texts: string[]) =>
    apiClient<Item[]>(`/api/lists/${listId}/items/bulk`, { method: "POST", body: JSON.stringify({ texts }) }),

  bulkDelete: (listId: string, ids: string[]) =>
    apiClient<void>(`/api/lists/${listId}/items`, { method: "DELETE", body: JSON.stringify({ ids }) }),
};
