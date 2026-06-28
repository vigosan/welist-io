import { useInfiniteQuery } from "@tanstack/react-query";
import { feedService } from "@/services/feed";

export function useFeed(enabled: boolean) {
  return useInfiniteQuery({
    queryKey: ["feed"],
    queryFn: ({ pageParam }) => feedService.list(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled,
  });
}
