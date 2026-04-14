import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { itemsService } from "@/services/items.service";
import { queryKeys } from "@/lib/query-keys";
import { POLLING_INTERVAL_MS } from "@/lib/constants";
import type { Item } from "@/db/schema";

export type { Item };

interface MutationContext {
  previous: Item[] | undefined;
}

export function useItems(listId: string) {
  return useQuery({
    queryKey: queryKeys.items(listId),
    queryFn: () => itemsService.list(listId),
    staleTime: POLLING_INTERVAL_MS,
    refetchInterval: POLLING_INTERVAL_MS,
    refetchIntervalInBackground: false,
  });
}

export function useAddItem(listId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ text }: { text: string }) => itemsService.add(listId, text),
    onSettled: () => qc.invalidateQueries({ queryKey: queryKeys.items(listId) }),
  });
}

export function useToggleItem(listId: string) {
  const qc = useQueryClient();
  return useMutation<Item, Error, string, MutationContext>({
    mutationFn: (itemId: string) => itemsService.toggle(listId, itemId),
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
  return useMutation<Item, Error, { id: string; text: string }, MutationContext>({
    mutationFn: ({ id, text }: { id: string; text: string }) => itemsService.update(listId, id, text),
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

export function useBulkAddItems(listId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (texts: string[]) => itemsService.bulkAdd(listId, texts),
    onSettled: () => qc.invalidateQueries({ queryKey: queryKeys.items(listId) }),
  });
}

export function useBulkDeleteItems(listId: string) {
  const qc = useQueryClient();
  return useMutation<void, Error, string[], MutationContext>({
    mutationFn: (ids: string[]) => itemsService.bulkDelete(listId, ids),
    onMutate: async (ids) => {
      await qc.cancelQueries({ queryKey: queryKeys.items(listId) });
      const previous = qc.getQueryData<Item[]>(queryKeys.items(listId));
      qc.setQueryData<Item[]>(queryKeys.items(listId), (old) =>
        old?.filter((i) => !ids.includes(i.id)),
      );
      return { previous };
    },
    onError: (_err, _ids, ctx) => {
      qc.setQueryData(queryKeys.items(listId), ctx?.previous);
    },
  });
}

export function useDeleteItem(listId: string) {
  const qc = useQueryClient();
  return useMutation<void, Error, string, MutationContext>({
    mutationFn: (itemId: string) => itemsService.delete(listId, itemId),
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
  });
}
