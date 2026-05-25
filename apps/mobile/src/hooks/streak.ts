import { useQuery } from "@tanstack/react-query";
import { streakService } from "@/services/streak";

export function useStreak(enabled: boolean) {
  return useQuery({
    queryKey: ["streak"],
    queryFn: () => streakService.get(),
    enabled,
    staleTime: 60_000,
  });
}
