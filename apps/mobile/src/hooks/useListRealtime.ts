import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import EventSource from "react-native-sse";
import { API_BASE, getToken } from "@/lib/api";

type ListChangedEvent = "list-changed";

export function useListRealtime(listId: string, enabled: boolean) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!enabled || !listId) return;
    let es: EventSource<ListChangedEvent> | null = null;
    let cancelled = false;

    (async () => {
      const token = await getToken();
      if (cancelled) return;
      es = new EventSource<ListChangedEvent>(
        `${API_BASE}/api/lists/${listId}/stream`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        }
      );
      es.addEventListener("list-changed", () => {
        qc.invalidateQueries({ queryKey: ["items", listId] });
        qc.invalidateQueries({ queryKey: ["list", listId] });
      });
    })();

    return () => {
      cancelled = true;
      es?.close();
    };
  }, [listId, enabled, qc]);
}
