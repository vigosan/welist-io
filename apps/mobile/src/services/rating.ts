import { apiFetch } from "@/lib/api";

export const ratingService = {
  rate: (listId: string, value: number) =>
    apiFetch<void>(`/lists/${listId}/rating`, {
      method: "POST",
      body: JSON.stringify({ value }),
    }),

  unrate: (listId: string) =>
    apiFetch<void>(`/lists/${listId}/rating`, { method: "DELETE" }),
};
