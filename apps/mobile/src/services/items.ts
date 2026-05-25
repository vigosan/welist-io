import { apiFetch } from "@/lib/api";
import type { Item } from "@/types";

export const itemsService = {
  list: (listId: string) => apiFetch<Item[]>(`/lists/${listId}/items`),

  add: (listId: string, text: string) =>
    apiFetch<Item>(`/lists/${listId}/items`, {
      method: "POST",
      body: JSON.stringify({ text }),
    }),

  toggle: (listId: string, itemId: string) =>
    apiFetch<Item>(`/lists/${listId}/items/${itemId}/toggle`, {
      method: "PATCH",
    }),

  delete: (listId: string, itemId: string) =>
    apiFetch<void>(`/lists/${listId}/items/${itemId}`, { method: "DELETE" }),
};
