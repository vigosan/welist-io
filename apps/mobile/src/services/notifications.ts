import { apiFetch } from "@/lib/api";
import type { AppNotification } from "@/types";

export const notificationsService = {
  list: () => apiFetch<AppNotification[]>("/notifications"),

  markRead: (id: string) =>
    apiFetch<void>(`/notifications/${id}/read`, { method: "PATCH" }),

  markAllRead: () =>
    apiFetch<void>("/notifications/read-all", { method: "PATCH" }),
};
