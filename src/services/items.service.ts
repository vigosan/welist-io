import type { Item } from "@/db/schema";
import { apiClient } from "@/lib/api-client";

export interface Coords {
  latitude: string;
  longitude: string;
  placeName: string;
}

export const itemsService = {
  list: (listId: string) => apiClient<Item[]>(`/api/lists/${listId}/items`),

  add: (listId: string, text: string, coords?: Coords) =>
    apiClient<Item>(`/api/lists/${listId}/items`, {
      method: "POST",
      body: JSON.stringify({ text, ...coords }),
    }),

  toggle: (listId: string, itemId: string) =>
    apiClient<Item>(`/api/lists/${listId}/items/${itemId}/toggle`, {
      method: "PATCH",
    }),

  update: (
    listId: string,
    itemId: string,
    text: string,
    coords?: Coords | null
  ) =>
    apiClient<Item>(`/api/lists/${listId}/items/${itemId}`, {
      method: "PATCH",
      body: JSON.stringify({
        text,
        ...(coords !== undefined
          ? coords === null
            ? { latitude: null, longitude: null, placeName: null }
            : coords
          : {}),
      }),
    }),

  delete: (listId: string, itemId: string) =>
    apiClient<void>(`/api/lists/${listId}/items/${itemId}`, {
      method: "DELETE",
    }),

  bulkAdd: (listId: string, texts: string[]) =>
    apiClient<Item[]>(`/api/lists/${listId}/items/bulk`, {
      method: "POST",
      body: JSON.stringify({ texts }),
    }),

  bulkDelete: (listId: string, ids: string[]) =>
    apiClient<void>(`/api/lists/${listId}/items`, {
      method: "DELETE",
      body: JSON.stringify({ ids }),
    }),

  reorder: (listId: string, ids: string[]) =>
    apiClient<void>(`/api/lists/${listId}/items/reorder`, {
      method: "PATCH",
      body: JSON.stringify({ ids }),
    }),
};
