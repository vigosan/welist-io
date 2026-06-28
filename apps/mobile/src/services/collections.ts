import { apiFetch } from "@/lib/api";
import type {
  CollectionDetail,
  CollectionSummary,
  MyCollection,
  Page,
} from "@/types";

export const collectionsService = {
  explore: (cursor?: string) => {
    const qs = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
    return apiFetch<Page<CollectionSummary>>(`/collections${qs}`);
  },
  mine: () => apiFetch<MyCollection[]>("/me/collections"),
  detail: (id: string) => apiFetch<CollectionDetail>(`/collections/${id}`),
  create: (input: { name: string; description?: string; public?: boolean }) =>
    apiFetch<{ id: string; slug: string | null }>("/collections", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  delete: (id: string) =>
    apiFetch<void>(`/collections/${id}`, { method: "DELETE" }),
  addList: (collectionId: string, listId: string) =>
    apiFetch<void>(`/collections/${collectionId}/lists`, {
      method: "POST",
      body: JSON.stringify({ listId }),
    }),
  removeList: (collectionId: string, listId: string) =>
    apiFetch<void>(`/collections/${collectionId}/lists/${listId}`, {
      method: "DELETE",
    }),
};
