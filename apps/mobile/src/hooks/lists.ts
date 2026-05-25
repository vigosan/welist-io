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

export function useDeleteList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (listId: string) => listsService.delete(listId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-lists"] }),
  });
}
