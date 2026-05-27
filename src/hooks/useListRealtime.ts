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
      qc.setQueryData<ItemWithLikes[]>(queryKeys.items(listId), (old) => {
        if (!old) return old;
        const target = old.find((i) => i.id === payload.itemId);
        if (!target || target.done === payload.done) return old;
        return old.map((i) =>
          i.id === payload.itemId ? { ...i, done: payload.done } : i
        );
      });
    };
    es.addEventListener("item-toggled", onToggled);
    return () => {
      es.removeEventListener("item-toggled", onToggled);
      es.close();
    };
  }, [listId, enabled, qc]);
}
