import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  listsService,
  type MyListsSort,
  type MyListsVisibility,
} from "@/services/lists";

export function useMyLists(
  q?: string,
  sort: MyListsSort = "recent",
  visibility: MyListsVisibility = "all"
) {
  return useInfiniteQuery({
    queryKey: ["my-lists", q ?? "", sort, visibility],
    queryFn: ({ pageParam }) =>
      listsService.myLists(
        pageParam as string | undefined,
        q,
        sort,
        visibility
      ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}

export function useList(listId: string) {
  const qc = useQueryClient();
  return useQuery({
    queryKey: ["list", listId],
    queryFn: () => listsService.get(listId),
    enabled: !!listId,
    placeholderData: () => {
      const queries = qc.getQueriesData<{
        pages: { items: { id: string; name: string }[] }[];
      }>({ queryKey: ["my-lists"] });
      for (const [, data] of queries) {
        if (!data) continue;
        for (const page of data.pages) {
          const found = page.items?.find((x) => x.id === listId);
          if (found)
            return found as unknown as ReturnType<
              typeof listsService.get
            > extends Promise<infer T>
              ? T
              : never;
        }
      }
      return undefined;
    },
  });
}

export function useCreateList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => listsService.create(name),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-lists"] }),
  });
}

export function useUpdateList(listId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: Parameters<typeof listsService.update>[1]) =>
      listsService.update(listId, patch),
    onMutate: async (patch) => {
      await qc.cancelQueries({ queryKey: ["list", listId] });
      const previousList = qc.getQueryData<Record<string, unknown>>([
        "list",
        listId,
      ]);
      if (previousList) {
        qc.setQueryData(["list", listId], { ...previousList, ...patch });
      }
      const previousMyLists = qc.getQueriesData<{
        pages: { items: Record<string, unknown>[] }[];
      }>({ queryKey: ["my-lists"] });
      for (const [key, data] of previousMyLists) {
        if (!data) continue;
        qc.setQueryData(key, {
          ...data,
          pages: data.pages.map((page) => ({
            ...page,
            items: page.items.map((it) =>
              it.id === listId ? { ...it, ...patch } : it
            ),
          })),
        });
      }
      return { previousList, previousMyLists };
    },
    onError: (_err, _patch, ctx) => {
      if (ctx?.previousList)
        qc.setQueryData(["list", listId], ctx.previousList);
      if (ctx?.previousMyLists) {
        for (const [key, data] of ctx.previousMyLists) {
          qc.setQueryData(key, data);
        }
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["list", listId] });
      qc.invalidateQueries({ queryKey: ["my-lists"] });
    },
  });
}

export function useForkList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (listId: string) => listsService.fork(listId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-lists"] }),
  });
}

export function useActiveParticipants(listId: string) {
  return useQuery({
    queryKey: ["active-participants", listId],
    queryFn: () => listsService.activeParticipants(listId),
    enabled: !!listId,
  });
}

export function useListActivity(listId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["list-activity", listId],
    queryFn: () => listsService.activity(listId),
    enabled: enabled && !!listId,
  });
}

export function useDeleteList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (listId: string) => listsService.delete(listId),
    onMutate: async (listId) => {
      await qc.cancelQueries({ queryKey: ["my-lists"] });
      const previousMyLists = qc.getQueriesData<{
        pages: { items: { id: string }[] }[];
      }>({ queryKey: ["my-lists"] });
      for (const [key, data] of previousMyLists) {
        if (!data) continue;
        qc.setQueryData(key, {
          ...data,
          pages: data.pages.map((page) => ({
            ...page,
            items: page.items.filter((it) => it.id !== listId),
          })),
        });
      }
      return { previousMyLists };
    },
    onError: (_err, _listId, ctx) => {
      if (ctx?.previousMyLists) {
        for (const [key, data] of ctx.previousMyLists) {
          qc.setQueryData(key, data);
        }
      }
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["my-lists"] }),
  });
}
