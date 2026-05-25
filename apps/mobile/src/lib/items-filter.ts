import type { Item } from "../types";

export type FilterMode = "all" | "pending" | "done";

export function filterItems(items: Item[], mode: FilterMode): Item[] {
  if (mode === "pending") return items.filter((i) => !i.done);
  if (mode === "done") return items.filter((i) => i.done);
  return items;
}
