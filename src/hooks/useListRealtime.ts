import { useSession } from "@hono/auth-js/react";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { queryKeys } from "@/lib/query-keys";
import type { ItemWithLikes } from "@/services/items.service";

type ListChangePayload = {
  listId: string;
  itemId: string;
  done: boolean;
  userId: string | null;
};

export function useListRealtime(listId: string, enabled: boolean) {
  const qc = useQueryClient();
  const { data: session } = useSession();
  const userId = session?.user?.id ?? null;

  useEffect(() => {
    if (!enabled || !listId) return;
    const es = new EventSource(`/api/lists/${listId}/stream`);
    const onToggled = (e: MessageEvent) => {
      let payload: ListChangePayload;
      try {
        payload = JSON.parse(e.data) as ListChangePayload;
      } catch {
        return;
      }
      if (userId && payload.userId === userId) return;
      qc.setQueryData<ItemWithLikes[]>(queryKeys.items(listId), (old) =>
        old?.map((i) =>
          i.id === payload.itemId ? { ...i, done: payload.done } : i
        )
      );
    };
    es.addEventListener("item-toggled", onToggled);
    return () => {
      es.removeEventListener("item-toggled", onToggled);
      es.close();
    };
  }, [listId, enabled, userId, qc]);
}
