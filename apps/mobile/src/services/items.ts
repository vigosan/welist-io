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

  update: (listId: string, itemId: string, text: string) =>
    apiFetch<Item>(`/lists/${listId}/items/${itemId}`, {
      method: "PATCH",
      body: JSON.stringify({ text }),
    }),

  setLocation: (
    listId: string,
    itemId: string,
    coords:
      | { latitude: string; longitude: string; placeName: string }
      | null
  ) =>
    apiFetch<Item>(`/lists/${listId}/items/${itemId}`, {
      method: "PATCH",
      body: JSON.stringify(
        coords ?? { latitude: null, longitude: null, placeName: null }
      ),
    }),

  delete: (listId: string, itemId: string) =>
    apiFetch<void>(`/lists/${listId}/items/${itemId}`, { method: "DELETE" }),

  bulkAdd: (listId: string, texts: string[]) =>
    apiFetch<Item[]>(`/lists/${listId}/items/bulk`, {
      method: "POST",
      body: JSON.stringify({ texts }),
    }),

  reorder: (listId: string, ids: string[]) =>
    apiFetch<void>(`/lists/${listId}/items/reorder`, {
      method: "PATCH",
      body: JSON.stringify({ ids }),
    }),
};
