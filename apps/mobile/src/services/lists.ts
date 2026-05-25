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

  delete: (listId: string) =>
    apiFetch<void>(`/lists/${listId}`, { method: "DELETE" }),
};
