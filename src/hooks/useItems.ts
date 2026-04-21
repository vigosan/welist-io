import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { Item } from "@/db/schema";
import { t } from "@/i18n/service";
import { queryKeys } from "@/lib/query-keys";
import { type Coords, itemsService } from "@/services/items.service";

export type { Item };

interface MutationContext {
  previous: Item[] | undefined;
}

export function useItems(listId: string) {
  return useQuery({
    queryKey: queryKeys.items(listId),
    queryFn: () => itemsService.list(listId),
  });
}

export function useAddItem(listId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ text, coords }: { text: string; coords?: Coords }) =>
      itemsService.add(listId, text, coords),
    onError: () => toast.error(t("items.errorAdd")),
    onSettled: () =>
      qc.invalidateQueries({
        queryKey: queryKeys.items(listId),
      }),
  });
}

export function useToggleItem(listId: string) {
  const qc = useQueryClient();
  return useMutation<Item, Error, string, MutationContext>({
    mutationFn: (itemId: string) => itemsService.toggle(listId, itemId),
    onMutate: async (itemId) => {
      await qc.cancelQueries({
        queryKey: queryKeys.items(listId),
      });
      const previous = qc.getQueryData<Item[]>(queryKeys.items(listId));
      qc.setQueryData<Item[]>(queryKeys.items(listId), (old) =>
        old?.map((i) => (i.id === itemId ? { ...i, done: !i.done } : i))
      );
      return { previous };
    },
    onError: (_err, _id, ctx) => {
      qc.setQueryData(queryKeys.items(listId), ctx?.previous);
      toast.error(t("items.errorToggle"));
    },
    onSettled: () =>
      qc.invalidateQueries({
        queryKey: queryKeys.items(listId),
      }),
  });
}

export function useUpdateItem(listId: string) {
  const qc = useQueryClient();
  return useMutation<
    Item,
    Error,
    { id: string; text: string; coords?: Coords | null },
    MutationContext
  >({
    mutationFn: ({
      id,
      text,
      coords,
    }: {
      id: string;
      text: string;
      coords?: Coords | null;
    }) => itemsService.update(listId, id, text, coords),
    onMutate: async ({ id, text }) => {
      await qc.cancelQueries({
        queryKey: queryKeys.items(listId),
      });
      const previous = qc.getQueryData<Item[]>(queryKeys.items(listId));
      qc.setQueryData<Item[]>(queryKeys.items(listId), (old) =>
        old?.map((i) => (i.id === id ? { ...i, text } : i))
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      qc.setQueryData(queryKeys.items(listId), ctx?.previous);
      toast.error(t("items.errorUpdate"));
    },
    onSettled: () =>
      qc.invalidateQueries({
        queryKey: queryKeys.items(listId),
      }),
  });
}

export function useBulkAddItems(listId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (texts: string[]) => itemsService.bulkAdd(listId, texts),
    onSettled: () =>
      qc.invalidateQueries({
        queryKey: queryKeys.items(listId),
      }),
  });
}

export function useBulkDeleteItems(listId: string) {
  const qc = useQueryClient();
  return useMutation<void, Error, string[], MutationContext>({
    mutationFn: (ids: string[]) => itemsService.bulkDelete(listId, ids),
    onMutate: async (ids) => {
      await qc.cancelQueries({
        queryKey: queryKeys.items(listId),
      });
      const previous = qc.getQueryData<Item[]>(queryKeys.items(listId));
      qc.setQueryData<Item[]>(queryKeys.items(listId), (old) =>
        old?.filter((i) => !ids.includes(i.id))
      );
      return { previous };
    },
    onError: (_err, _ids, ctx) => {
      qc.setQueryData(queryKeys.items(listId), ctx?.previous);
    },
  });
}

export function useReorderItems(listId: string) {
  const qc = useQueryClient();
  return useMutation<void, Error, string[], { previous: Item[] | undefined }>({
    mutationFn: (ids) => itemsService.reorder(listId, ids),
    onMutate: async (ids) => {
      await qc.cancelQueries({
        queryKey: queryKeys.items(listId),
      });
      const previous = qc.getQueryData<Item[]>(queryKeys.items(listId));
      qc.setQueryData<Item[]>(queryKeys.items(listId), (old) => {
        if (!old) return old;
        const map = new Map(old.map((i) => [i.id, i]));
        return ids.map((id, pos) => ({
          // biome-ignore lint/style/noNonNullAssertion: id presence verified by has() check above
          ...map.get(id)!,
          position: pos,
        }));
      });
      return { previous };
    },
    onError: (_err, _ids, ctx) => {
      qc.setQueryData(queryKeys.items(listId), ctx?.previous);
    },
    onSettled: () =>
      qc.invalidateQueries({
        queryKey: queryKeys.items(listId),
      }),
  });
}

export function useDeleteItem(listId: string) {
  const qc = useQueryClient();
  return useMutation<void, Error, string, MutationContext>({
    mutationFn: (itemId: string) => itemsService.delete(listId, itemId),
    onMutate: async (itemId) => {
      await qc.cancelQueries({
        queryKey: queryKeys.items(listId),
      });
      const previous = qc.getQueryData<Item[]>(queryKeys.items(listId));
      qc.setQueryData<Item[]>(queryKeys.items(listId), (old) =>
        old?.filter((i) => i.id !== itemId)
      );
      return { previous };
    },
    onError: (_err, _id, ctx) => {
      qc.setQueryData(queryKeys.items(listId), ctx?.previous);
      toast.error(t("items.errorDelete"));
    },
  });
}
