export const queryKeys = {
  list: (id: string) => ["list", id] as const,
  items: (listId: string) => ["items", listId] as const,
  explore: (q?: string) => ["explore", q ?? ""] as const,
  exploreItems: (listId: string) => ["explore-items", listId] as const,
};
