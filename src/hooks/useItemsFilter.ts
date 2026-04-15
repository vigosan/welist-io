import { useMemo, useRef, useState } from "react";
import { parseTags, getPartialTag } from "@/lib/tags";
import type { Item } from "@/db/schema";

interface Options {
  items: Item[];
  itemsLoading: boolean;
  statusFilter: "all" | "pending" | "done" | undefined;
  activeTag: string | undefined;
  searchQuery: string;
  newItemText: string;
}

export function useItemsFilter({ items, itemsLoading, statusFilter, activeTag, searchQuery, newItemText }: Options) {
  const [sortedIds, setSortedIds] = useState<string[] | null>(null);
  const initializedRef = useRef(false);

  const stableItems = useMemo(() => {
    if (itemsLoading) return items;
    let ids = sortedIds;
    if (ids === null && items.length > 0 && !initializedRef.current) {
      ids = [...items].sort((a, b) => Number(a.done) - Number(b.done)).map((i) => i.id);
      initializedRef.current = true;
      setSortedIds(ids);
    }
    if (!ids) return items;
    const byId = new Map(items.map((i) => [i.id, i]));
    const sortedSet = new Set(ids);
    const inOrder = ids.flatMap((id) => (byId.has(id) ? [byId.get(id)!] : []));
    const newItems = items.filter((i) => !sortedSet.has(i.id));
    return [...inOrder, ...newItems];
  }, [items, itemsLoading, sortedIds]);

  const allTags = useMemo(() => {
    const seen = new Set<string>();
    stableItems.forEach((i) => parseTags(i.text).tags.forEach((t) => seen.add(t)));
    return [...seen].sort();
  }, [stableItems]);

  const partialTag = useMemo(() => getPartialTag(newItemText), [newItemText]);

  const tagSuggestions = useMemo(
    () => (partialTag !== null ? allTags.filter((t) => t.startsWith(partialTag)) : []),
    [partialTag, allTags],
  );

  const normalizedSearch = searchQuery.trim().toLowerCase();

  const filteredItems = useMemo(
    () =>
      stableItems
        .filter((i) => !statusFilter || statusFilter === "all" || (statusFilter === "pending" ? !i.done : i.done))
        .filter((i) => !activeTag || parseTags(i.text).tags.includes(activeTag))
        .filter((i) => !normalizedSearch || i.text.toLowerCase().includes(normalizedSearch)),
    [stableItems, statusFilter, activeTag, normalizedSearch],
  );

  function resetOrder() {
    initializedRef.current = false;
    setSortedIds(null);
  }

  function setOrder(ids: string[]) {
    setSortedIds(ids);
  }

  return { stableItems, allTags, partialTag, tagSuggestions, filteredItems, resetOrder, setOrder };
}
