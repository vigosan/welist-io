import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { itemsService } from "@/services/items";
import type { Item } from "@/types";

export function useItems(listId: string) {
  return useQuery({
    queryKey: ["items", listId],
    queryFn: () => itemsService.list(listId),
    enabled: !!listId,
  });
}

export function useAddItem(listId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (text: string) => itemsService.add(listId, text),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["items", listId] }),
  });
}

export function useToggleItem(listId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) => itemsService.toggle(listId, itemId),
    onMutate: async (itemId) => {
      await qc.cancelQueries({ queryKey: ["items", listId] });
      const previous = qc.getQueryData<Item[]>(["items", listId]);
      qc.setQueryData<Item[]>(["items", listId], (old) =>
        old?.map((it) =>
          it.id === itemId ? { ...it, done: !it.done } : it
        )
      );
      return { previous };
    },
    onError: (_err, _itemId, ctx) => {
      if (ctx?.previous) qc.setQueryData(["items", listId], ctx.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["items", listId] }),
  });
}

export function useUpdateItem(listId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, text }: { itemId: string; text: string }) =>
      itemsService.update(listId, itemId, text),
    onMutate: async ({ itemId, text }) => {
      await qc.cancelQueries({ queryKey: ["items", listId] });
      const previous = qc.getQueryData<Item[]>(["items", listId]);
      qc.setQueryData<Item[]>(["items", listId], (old) =>
        old?.map((it) => (it.id === itemId ? { ...it, text } : it))
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(["items", listId], ctx.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["items", listId] }),
  });
}

export function useBulkAddItems(listId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (texts: string[]) => itemsService.bulkAdd(listId, texts),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["items", listId] }),
  });
}

export function useDeleteItem(listId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) => itemsService.delete(listId, itemId),
    onMutate: async (itemId) => {
      await qc.cancelQueries({ queryKey: ["items", listId] });
      const previous = qc.getQueryData<Item[]>(["items", listId]);
      qc.setQueryData<Item[]>(["items", listId], (old) =>
        old?.filter((it) => it.id !== itemId)
      );
      return { previous };
    },
    onError: (_err, _itemId, ctx) => {
      if (ctx?.previous) qc.setQueryData(["items", listId], ctx.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["items", listId] }),
  });
}
