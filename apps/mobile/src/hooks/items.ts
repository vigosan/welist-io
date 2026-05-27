import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type Coords, itemsService } from "@/services/items";
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
    mutationFn: ({ text, coords }: { text: string; coords?: Coords }) =>
      itemsService.add(listId, text, coords),
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
        old?.map((it) => (it.id === itemId ? { ...it, done: !it.done } : it))
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
    mutationFn: ({
      itemId,
      text,
      coords,
    }: {
      itemId: string;
      text: string;
      coords?: Coords | null;
    }) => itemsService.update(listId, itemId, text, coords),
    onMutate: async ({ itemId, text, coords }) => {
      await qc.cancelQueries({ queryKey: ["items", listId] });
      const previous = qc.getQueryData<Item[]>(["items", listId]);
      qc.setQueryData<Item[]>(["items", listId], (old) =>
        old?.map((it) =>
          it.id === itemId
            ? {
                ...it,
                text,
                ...(coords !== undefined
                  ? coords === null
                    ? { latitude: null, longitude: null, placeName: null }
                    : {
                        latitude: coords.latitude,
                        longitude: coords.longitude,
                        placeName: coords.placeName,
                      }
                  : {}),
              }
            : it
        )
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(["items", listId], ctx.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["items", listId] }),
  });
}

export function useSetItemLocation(listId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      itemId,
      coords,
    }: {
      itemId: string;
      coords: { latitude: string; longitude: string; placeName: string } | null;
    }) => itemsService.setLocation(listId, itemId, coords),
    onMutate: async ({ itemId, coords }) => {
      await qc.cancelQueries({ queryKey: ["items", listId] });
      const previous = qc.getQueryData<Item[]>(["items", listId]);
      qc.setQueryData<Item[]>(["items", listId], (old) =>
        old?.map((it) =>
          it.id === itemId
            ? {
                ...it,
                latitude: coords?.latitude ?? null,
                longitude: coords?.longitude ?? null,
                placeName: coords?.placeName ?? null,
              }
            : it
        )
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

export function useReorderItems(listId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ordered: Item[]) =>
      itemsService.reorder(
        listId,
        ordered.map((i) => i.id)
      ),
    onMutate: async (ordered) => {
      await qc.cancelQueries({ queryKey: ["items", listId] });
      const previous = qc.getQueryData<Item[]>(["items", listId]);
      qc.setQueryData<Item[]>(["items", listId], ordered);
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(["items", listId], ctx.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["items", listId] }),
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
