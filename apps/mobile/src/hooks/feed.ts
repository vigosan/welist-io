import { useQuery } from "@tanstack/react-query";
import { feedService } from "@/services/feed";

export function useFeed(enabled: boolean) {
  return useQuery({
    queryKey: ["feed"],
    queryFn: () => feedService.list(),
    enabled,
  });
}
