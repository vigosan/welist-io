import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notFound } from "@tanstack/react-router";
import { listsService } from "@/services/lists.service";
import { queryKeys } from "@/lib/query-keys";
import { POLLING_INTERVAL_MS } from "@/lib/constants";
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
    refetchInterval: POLLING_INTERVAL_MS,
    refetchIntervalInBackground: false,
  });
}

export function useCreateList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => listsService.create(name),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.myLists() }),
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

export function useUpdateDescription(listId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (description: string | null) => listsService.update(listId, { description }),
    onMutate: async (description) => {
      await qc.cancelQueries({ queryKey: queryKeys.list(listId) });
      const previous = qc.getQueryData<List>(queryKeys.list(listId));
      qc.setQueryData<List>(queryKeys.list(listId), (old) => old ? { ...old, description } : old);
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

export function useToggleCollaborative(listId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (collaborative: boolean) => listsService.update(listId, { collaborative }),
    onMutate: async (collaborative) => {
      await qc.cancelQueries({ queryKey: queryKeys.list(listId) });
      const previous = qc.getQueryData<List>(queryKeys.list(listId));
      qc.setQueryData<List>(queryKeys.list(listId), (old) => old ? { ...old, collaborative } : old);
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
  return useInfiniteQuery({
    queryKey: queryKeys.explore(q),
    queryFn: ({ pageParam }) => listsService.explore(q, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}

export function useCloneList() {
  return useMutation({
    mutationFn: (listId: string) => listsService.clone(listId),
  });
}

export function useExploreItems(listId: string, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.exploreItems(listId),
    queryFn: () => listsService.exploreItems(listId),
    enabled,
  });
}

export function useMyLists() {
  return useQuery({
    queryKey: queryKeys.myLists(),
    queryFn: () => listsService.myLists(),
  });
}

export function useAcceptChallenge() {
  return useMutation({
    mutationFn: (listId: string) => listsService.accept(listId),
  });
}
