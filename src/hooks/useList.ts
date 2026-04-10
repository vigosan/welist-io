import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { List } from "@/db/schema";

export function useUpdateSlug(listId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (slug: string | null) =>
      apiClient<List>(`/api/lists/${listId}`, { method: "PATCH", body: JSON.stringify({ slug }) }),
    onSuccess: (updated) => qc.setQueryData(queryKeys.list(listId), updated),
  });
}

export function useUpdateName(listId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) =>
      apiClient<List>(`/api/lists/${listId}`, { method: "PATCH", body: JSON.stringify({ name }) }),
    onMutate: async (name) => {
      await qc.cancelQueries({ queryKey: queryKeys.list(listId) });
      const previous = qc.getQueryData<List>(queryKeys.list(listId));
      qc.setQueryData<List>(queryKeys.list(listId), (old) => old ? { ...old, name } : old);
      return { previous };
    },
    onError: (_err, _name, ctx) => {
      qc.setQueryData(queryKeys.list(listId), ctx?.previous);
    },
    onSettled: (updated) => {
      if (updated) qc.setQueryData(queryKeys.list(listId), updated);
    },
  });
}
