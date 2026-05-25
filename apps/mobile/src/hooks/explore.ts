import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { type ExploreSort, exploreService } from "@/services/explore";

export function useExplore(q?: string, sort?: ExploreSort, category?: string) {
  return useInfiniteQuery({
    queryKey: ["explore", q ?? "", sort ?? "trending", category ?? ""],
    queryFn: ({ pageParam }) =>
      exploreService.list(pageParam as string | undefined, q, sort, category),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}

export function useExploreDetail(listId: string) {
  return useQuery({
    queryKey: ["explore-detail", listId],
    queryFn: () => exploreService.detail(listId),
    enabled: !!listId,
  });
}

export function useExploreItems(listId: string) {
  return useQuery({
    queryKey: ["explore-items", listId],
    queryFn: () => exploreService.items(listId),
    enabled: !!listId,
  });
}

export function useAcceptChallenge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (listId: string) => exploreService.accept(listId),
    onSuccess: (_data, listId) => {
      qc.invalidateQueries({ queryKey: ["explore"] });
      qc.invalidateQueries({ queryKey: ["my-lists"] });
      qc.invalidateQueries({ queryKey: ["explore-detail", listId] });
    },
  });
}
