import { apiFetch } from "@/lib/api";
import type { List, ListWithParticipation, MyListItem, Page } from "@/types";

export const listsService = {
  myLists: (cursor?: string, q?: string) => {
    const params = new URLSearchParams();
    if (cursor) params.set("cursor", cursor);
    if (q) params.set("q", q);
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
};
