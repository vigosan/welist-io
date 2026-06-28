import { apiFetch } from "@/lib/api";
import type { Item, ItemCommentView } from "@/types";

export type Coords = {
  latitude: string;
  longitude: string;
  placeName: string;
};

export const itemsService = {
  list: (listId: string) => apiFetch<Item[]>(`/lists/${listId}/items`),

  add: (listId: string, text: string, coords?: Coords) =>
    apiFetch<Item>(`/lists/${listId}/items`, {
      method: "POST",
      body: JSON.stringify({ text, ...coords }),
    }),

  toggle: (listId: string, itemId: string) =>
    apiFetch<Item>(`/lists/${listId}/items/${itemId}/toggle`, {
      method: "PATCH",
    }),

  update: (
    listId: string,
    itemId: string,
    text: string,
    coords?: Coords | null
  ) =>
    apiFetch<Item>(`/lists/${listId}/items/${itemId}`, {
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

  setLocation: (listId: string, itemId: string, coords: Coords | null) =>
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

  listComments: (listId: string, itemId: string) =>
    apiFetch<ItemCommentView[]>(
      `/lists/${listId}/items/${itemId}/comments`
    ),

  addComment: (listId: string, itemId: string, body: string) =>
    apiFetch<ItemCommentView>(`/lists/${listId}/items/${itemId}/comments`, {
      method: "POST",
      body: JSON.stringify({ body }),
    }),

  deleteComment: (listId: string, itemId: string, commentId: string) =>
    apiFetch<void>(
      `/lists/${listId}/items/${itemId}/comments/${commentId}`,
      { method: "DELETE" }
    ),
};
