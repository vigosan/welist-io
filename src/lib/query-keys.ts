export const queryKeys = {
  list: (id: string) => ["list", id] as const,
  items: (listId: string) => ["items", listId] as const,
  explore: (q?: string, sort?: string) => ["explore", q ?? "", sort ?? "created_desc"] as const,
  exploreItems: (listId: string) => ["explore-items", listId] as const,
  exploreDetail: (id: string) => ["explore-detail", id] as const,
  myLists: (q?: string, sort?: string, visibility?: string) => ["my-lists", q ?? "", sort ?? "recent", visibility ?? "all"] as const,
};
