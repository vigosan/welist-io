import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { listsService } from "@/services/lists";

export function useMyLists(q?: string) {
  return useInfiniteQuery({
    queryKey: ["my-lists", q ?? ""],
    queryFn: ({ pageParam }) =>
      listsService.myLists(pageParam as string | undefined, q),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}

export function useList(listId: string) {
  return useQuery({
    queryKey: ["list", listId],
    queryFn: () => listsService.get(listId),
    enabled: !!listId,
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
    mutationFn: (
      patch: Parameters<typeof listsService.update>[1]
    ) => listsService.update(listId, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["list", listId] });
      qc.invalidateQueries({ queryKey: ["my-lists"] });
    },
  });
}

export function useCloneList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (listId: string) => listsService.clone(listId),
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-lists"] }),
  });
}
