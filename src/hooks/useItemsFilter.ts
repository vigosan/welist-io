import { useMemo, useRef, useState } from "react";
import type { Item } from "@/db/schema";
import { parseItemText } from "@/lib/item-text";
import { getPartialPlace, parsePlaces } from "@/lib/places";
import { getPartialTag, parseTags } from "@/lib/tags";

interface Options {
  items: Item[];
  itemsLoading: boolean;
  statusFilter: "all" | "pending" | "done" | undefined;
  activeTag: string | undefined;
  activePlace?: string;
  searchQuery: string;
  newItemText: string;
}

export function useItemsFilter({
  items,
  itemsLoading,
  statusFilter,
  activeTag,
  activePlace,
  searchQuery,
  newItemText,
}: Options) {
  const [sortedIds, setSortedIds] = useState<string[] | null>(null);
  const initializedRef = useRef(false);

  const stableItems = useMemo(() => {
    if (itemsLoading) return items;
    let ids = sortedIds;
    if (ids === null && items.length > 0 && !initializedRef.current) {
      ids = [...items]
        .sort((a, b) => Number(a.done) - Number(b.done))
        .map((i) => i.id);
      initializedRef.current = true;
      setSortedIds(ids);
    }
    if (!ids) return items;
    // Order by sortedIds but use live items for done state
    const liveById = new Map(items.map((i) => [i.id, i]));
    const sortedSet = new Set(ids);
    const inOrder = ids.flatMap((id) => {
      // biome-ignore lint/style/noNonNullAssertion: id presence verified by has() check
      return liveById.has(id) ? [liveById.get(id)!] : [];
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

  const partialTag = useMemo(() => getPartialTag(newItemText), [newItemText]);
  const partialPlace = useMemo(
    () => getPartialPlace(newItemText),
    [newItemText]
  );

  const tagSuggestions = useMemo(
    () =>
      partialTag !== null
        ? allTags.filter((t) => t.startsWith(partialTag))
        : [],
    [partialTag, allTags]
  );

  const placeSuggestions = useMemo(
    () =>
      partialPlace !== null
        ? allPlaces.filter((p) =>
            p.toLowerCase().startsWith(partialPlace.toLowerCase())
          )
        : [],
    [partialPlace, allPlaces]
  );

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
    initializedRef.current = false;
    setSortedIds(null);
  }

  function setOrder(ids: string[]) {
    setSortedIds(ids);
  }

  return {
    stableItems,
    allTags,
    allPlaces,
    partialTag,
    partialPlace,
    tagSuggestions,
    placeSuggestions,
    filteredItems,
    resetOrder,
    setOrder,
  };
}
