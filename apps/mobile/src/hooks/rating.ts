import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ratingService } from "@/services/rating";

export function useRateList(listId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (value: number) =>
      value === 0 ? ratingService.unrate(listId) : ratingService.rate(listId, value),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["list", listId] });
      qc.invalidateQueries({ queryKey: ["explore-detail", listId] });
      qc.invalidateQueries({ queryKey: ["explore"] });
    },
  });
}
