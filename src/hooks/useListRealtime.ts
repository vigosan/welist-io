import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { queryKeys } from "@/lib/query-keys";

export function useListRealtime(listId: string, enabled: boolean) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!enabled || !listId) return;
    const es = new EventSource(`/api/lists/${listId}/stream`);
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onChange = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        qc.invalidateQueries({ queryKey: queryKeys.items(listId) });
        qc.invalidateQueries({ queryKey: queryKeys.list(listId) });
      }, 250);
    };
    es.addEventListener("list-changed", onChange);
    return () => {
      clearTimeout(timer);
      es.removeEventListener("list-changed", onChange);
      es.close();
    };
  }, [listId, enabled, qc]);
}
