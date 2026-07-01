import { useMemo, useState } from "react";
import type { ItemView } from "@/hooks/useItems";
import { parseItemText } from "@/lib/item-text";
import { parsePlaces } from "@/lib/places";
import { parseTags } from "@/lib/tags";

interface Options {
  items: ItemView[];
  itemsLoading: boolean;
  statusFilter: "all" | "pending" | "done" | undefined;
  activeTag: string | undefined;
  activePlace?: string;
  searchQuery: string;
}

export function useItemsFilter({
  items,
  itemsLoading,
  statusFilter,
  activeTag,
  activePlace,
  searchQuery,
}: Options) {
  const [sortedIds, setSortedIds] = useState<string[] | null>(null);

  if (sortedIds === null && !itemsLoading && items.length > 0) {
    setSortedIds(items.map((i) => i.id));
  }

  const stableItems = useMemo(() => {
    if (itemsLoading || sortedIds === null) return items;
    const liveById = new Map(items.map((i) => [i.id, i]));
    const sortedSet = new Set(sortedIds);
    const inOrder = sortedIds.flatMap((id) => {
      const item = liveById.get(id);
      return item ? [item] : [];
    });
    const newItems = items.filter((i) => !sortedSet.has(i.id));
    return [...inOrder, ...newItems];
  }, [items, itemsLoading, sortedIds]);

  const allTags = useMemo(() => {
    const seen = new Set<string>();
    stableItems.forEach((i) => {
      parseTags(i.text).tags.forEach((t) => {
        seen.add(t);
      });
    });
    return [...seen].sort();
  }, [stableItems]);

  const allPlaces = useMemo(() => {
    const seen = new Set<string>();
    stableItems.forEach((i) => {
      parsePlaces(i.text).places.forEach((p) => {
        seen.add(p);
      });
    });
    return [...seen].sort();
  }, [stableItems]);

  const normalizedSearch = searchQuery.trim().toLowerCase();

  const filteredItems = useMemo(
    () =>
      stableItems
        .filter(
          (i) =>
            !statusFilter ||
            statusFilter === "all" ||
            (statusFilter === "pending" ? !i.done : i.done)
        )
        .filter((i) => !activeTag || parseTags(i.text).tags.includes(activeTag))
        .filter(
          (i) =>
            !activePlace || parseItemText(i.text).places.includes(activePlace)
        )
        .filter(
          (i) =>
            !normalizedSearch || i.text.toLowerCase().includes(normalizedSearch)
        ),
    [stableItems, statusFilter, activeTag, activePlace, normalizedSearch]
  );

  function resetOrder() {
    setSortedIds(null);
  }

  function setOrder(ids: string[]) {
    setSortedIds(ids);
  }

  return {
    stableItems,
    allTags,
    allPlaces,
    filteredItems,
    resetOrder,
    setOrder,
  };
}
