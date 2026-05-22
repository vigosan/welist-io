import type { Item } from "@/db/schema";
import { apiClient } from "@/lib/api-client";
import type { ReactionEmoji } from "@/lib/reactions";

export interface Coords {
  latitude: string;
  longitude: string;
  placeName: string;
}

export interface ReactionAggregate {
  emoji: string;
  count: number;
  mine: boolean;
}

export type ItemWithReactions = Item & { reactions: ReactionAggregate[] };

export const itemsService = {
  list: (listId: string) =>
    apiClient<ItemWithReactions[]>(`/api/lists/${listId}/items`),

  toggleReaction: (listId: string, itemId: string, emoji: ReactionEmoji) =>
    apiClient<{ added: boolean; emoji: ReactionEmoji }>(
      `/api/lists/${listId}/items/${itemId}/reactions`,
      {
        method: "POST",
        body: JSON.stringify({ emoji }),
      }
    ),

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
