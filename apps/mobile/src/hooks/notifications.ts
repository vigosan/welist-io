import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notificationsService } from "@/services/notifications";
import type { AppNotification } from "@/types";

export function useNotifications(enabled: boolean) {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: () => notificationsService.list(),
    enabled,
    refetchInterval: enabled ? 30_000 : false,
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationsService.markRead(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ["notifications"] });
      const previous = qc.getQueryData<AppNotification[]>(["notifications"]);
      const now = new Date().toISOString();
      qc.setQueryData<AppNotification[]>(["notifications"], (old) =>
        old?.map((n) => (n.id === id ? { ...n, readAt: n.readAt ?? now } : n))
      );
      return { previous };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.previous) qc.setQueryData(["notifications"], ctx.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => notificationsService.markAllRead(),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ["notifications"] });
      const previous = qc.getQueryData<AppNotification[]>(["notifications"]);
      const now = new Date().toISOString();
      qc.setQueryData<AppNotification[]>(["notifications"], (old) =>
        old?.map((n) => (n.readAt ? n : { ...n, readAt: now }))
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(["notifications"], ctx.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
}
