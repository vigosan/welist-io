import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ratingService } from "@/services/rating";

type RatingShape = {
  rating: { avg: number | null; count: number; mine: number | null };
};

export function useRateList(listId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (value: number) =>
      value === 0
        ? ratingService.unrate(listId)
        : ratingService.rate(listId, value),
    onMutate: async (value) => {
      await qc.cancelQueries({ queryKey: ["list", listId] });
      await qc.cancelQueries({ queryKey: ["explore-detail", listId] });
      const previousList = qc.getQueryData<RatingShape>(["list", listId]);
      const previousExplore = qc.getQueryData<RatingShape>([
        "explore-detail",
        listId,
      ]);
      const next = (prev: RatingShape | undefined): RatingShape | undefined => {
        if (!prev?.rating) return prev;
        const mineWas = prev.rating.mine;
        const had = mineWas !== null && mineWas !== undefined;
        const adding = value !== 0 && !had;
        const removing = value === 0 && had;
        return {
          ...prev,
          rating: {
            ...prev.rating,
            mine: value === 0 ? null : value,
            count: prev.rating.count + (adding ? 1 : removing ? -1 : 0),
          },
        };
      };
      if (previousList) qc.setQueryData(["list", listId], next(previousList));
      if (previousExplore)
        qc.setQueryData(["explore-detail", listId], next(previousExplore));
      return { previousList, previousExplore };
    },
    onError: (_err, _value, ctx) => {
      if (ctx?.previousList)
        qc.setQueryData(["list", listId], ctx.previousList);
      if (ctx?.previousExplore)
        qc.setQueryData(["explore-detail", listId], ctx.previousExplore);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["list", listId] });
      qc.invalidateQueries({ queryKey: ["explore-detail", listId] });
      qc.invalidateQueries({ queryKey: ["explore"] });
    },
  });
}
