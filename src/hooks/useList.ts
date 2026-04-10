import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notFound } from "@tanstack/react-router";
import { listsService } from "@/services/lists.service";
import { queryKeys } from "@/lib/query-keys";
import type { List } from "@/db/schema";

export function useList(listId: string) {
  return useQuery({
    queryKey: queryKeys.list(listId),
    queryFn: async () => {
      try {
        return await listsService.get(listId);
      } catch {
        throw notFound();
      }
    },
    refetchInterval: 3000,
  });
}

export function useCreateList() {
  return useMutation({
    mutationFn: (name: string) => listsService.create(name),
  });
}

export function useUpdateName(listId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => listsService.update(listId, { name }),
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

export function useUpdateSlug(listId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (slug: string | null) => listsService.update(listId, { slug }),
    onSuccess: (updated) => qc.setQueryData(queryKeys.list(listId), updated),
  });
}

export function useTogglePublic(listId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (isPublic: boolean) => listsService.update(listId, { public: isPublic }),
    onMutate: async (isPublic) => {
      await qc.cancelQueries({ queryKey: queryKeys.list(listId) });
      const previous = qc.getQueryData<List>(queryKeys.list(listId));
      qc.setQueryData<List>(queryKeys.list(listId), (old) => old ? { ...old, public: isPublic } : old);
      return { previous };
    },
    onError: (_err, _val, ctx) => {
      qc.setQueryData(queryKeys.list(listId), ctx?.previous);
    },
    onSettled: (updated) => {
      if (updated) qc.setQueryData(queryKeys.list(listId), updated);
    },
  });
}

export function useExplore(q?: string) {
  return useQuery({
    queryKey: queryKeys.explore(q),
    queryFn: () => listsService.explore(q),
  });
}

export function useCloneList() {
  return useMutation({
    mutationFn: (listId: string) => listsService.clone(listId),
  });
}
