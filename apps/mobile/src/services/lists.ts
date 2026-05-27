import { apiFetch } from "@/lib/api";
import type { List, ListWithParticipation, MyListItem, Page } from "@/types";

export type MyListsSort = "recent" | "newest" | "oldest" | "likes";
export type MyListsVisibility = "all" | "public" | "private";

export const listsService = {
  myLists: (
    cursor?: string,
    q?: string,
    sort?: MyListsSort,
    visibility?: MyListsVisibility
  ) => {
    const params = new URLSearchParams();
    if (cursor) params.set("cursor", cursor);
    if (q) params.set("q", q);
    if (sort && sort !== "recent") params.set("sort", sort);
    if (visibility && visibility !== "all")
      params.set("visibility", visibility);
    const qs = params.toString();
    return apiFetch<Page<MyListItem>>(`/my-lists${qs ? `?${qs}` : ""}`);
  },

  get: (listId: string) => apiFetch<ListWithParticipation>(`/lists/${listId}`),

  create: (name: string) =>
    apiFetch<List>("/lists", {
      method: "POST",
      body: JSON.stringify({ name }),
    }),

  update: (
    listId: string,
    patch: {
      name?: string;
      slug?: string | null;
      description?: string | null;
      category?: string | null;
      public?: boolean;
      collaborative?: boolean;
    }
  ) =>
    apiFetch<List>(`/lists/${listId}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),

  clone: (listId: string) =>
    apiFetch<List>(`/lists/${listId}/clone`, { method: "POST" }),

  delete: (listId: string) =>
    apiFetch<void>(`/lists/${listId}`, { method: "DELETE" }),

  activeParticipants: (listId: string) =>
    apiFetch<{
      participants: { id: string; name: string | null; image: string | null }[];
      total: number;
    }>(`/lists/${listId}/active-participants`),

  activity: (listId: string) =>
    apiFetch<
      {
        id: string;
        action:
          | "item_added"
          | "item_edited"
          | "item_deleted"
          | "challenge_accepted"
          | "challenge_completed";
        itemId: string | null;
        previousValue: unknown;
        newValue: unknown;
        createdAt: string;
        userName: string | null;
        userImage: string | null;
      }[]
    >(`/lists/${listId}/activity`),
};
