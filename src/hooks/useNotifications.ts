import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { notificationsService } from "@/services/lists.service";

const POLL_INTERVAL_MS = 30_000;

export function useNotifications(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.notifications(),
    queryFn: notificationsService.getAll,
    enabled,
    staleTime: POLL_INTERVAL_MS,
    refetchInterval: POLL_INTERVAL_MS,
    refetchIntervalInBackground: false,
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: notificationsService.readAll,
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.notifications() }),
  });
}
