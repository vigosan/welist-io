import { useQuery } from "@tanstack/react-query";
import { searchPlaces } from "@/services/geocoding";

export function useGeocodingSearch(q: string) {
  return useQuery({
    queryKey: ["geocoding", q],
    queryFn: () => searchPlaces(q),
    enabled: q.trim().length >= 2,
    staleTime: 60_000,
  });
}
