import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { Item } from "@/db/schema";

export type { Item };

export function useItems(listId: string) {
  return useQuery({
    queryKey: queryKeys.items(listId),
    queryFn: () => apiClient<Item[]>(`/api/lists/${listId}/items`),
  });
}

export function useAddItem(listId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { text: string }) =>
      apiClient<Item>(`/api/lists/${listId}/items`, { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.items(listId) }),
  });
}

export function useToggleItem(listId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) =>
      apiClient<Item>(`/api/lists/${listId}/items/${itemId}/toggle`, { method: "PATCH" }),
    onMutate: async (itemId) => {
      await qc.cancelQueries({ queryKey: queryKeys.items(listId) });
      const previous = qc.getQueryData<Item[]>(queryKeys.items(listId));
      qc.setQueryData<Item[]>(queryKeys.items(listId), (old) =>
        old?.map((i) => i.id === itemId ? { ...i, done: !i.done } : i),
      );
      return { previous };
    },
    onError: (_err, _id, ctx) => {
      qc.setQueryData(queryKeys.items(listId), ctx?.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: queryKeys.items(listId) }),
  });
}

export function useUpdateItem(listId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, text }: { id: string; text: string }) =>
      apiClient<Item>(`/api/lists/${listId}/items/${id}`, { method: "PATCH", body: JSON.stringify({ text }) }),
    onMutate: async ({ id, text }) => {
      await qc.cancelQueries({ queryKey: queryKeys.items(listId) });
      const previous = qc.getQueryData<Item[]>(queryKeys.items(listId));
      qc.setQueryData<Item[]>(queryKeys.items(listId), (old) =>
        old?.map((i) => i.id === id ? { ...i, text } : i),
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      qc.setQueryData(queryKeys.items(listId), ctx?.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: queryKeys.items(listId) }),
  });
}

export function useDeleteItem(listId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) =>
      apiClient<void>(`/api/lists/${listId}/items/${itemId}`, { method: "DELETE" }),
    onMutate: async (itemId) => {
      await qc.cancelQueries({ queryKey: queryKeys.items(listId) });
      const previous = qc.getQueryData<Item[]>(queryKeys.items(listId));
      qc.setQueryData<Item[]>(queryKeys.items(listId), (old) =>
        old?.filter((i) => i.id !== itemId),
      );
      return { previous };
    },
    onError: (_err, _id, ctx) => {
      qc.setQueryData(queryKeys.items(listId), ctx?.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: queryKeys.items(listId) }),
  });
}
