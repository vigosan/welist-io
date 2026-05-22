export const queryKeys = {
  list: (id: string) => ["list", id] as const,
  items: (listId: string) => ["items", listId] as const,
  explore: (q?: string, sort?: string, category?: string) =>
    ["explore", q ?? "", sort ?? "created_desc", category ?? ""] as const,
  exploreItems: (listId: string) => ["explore-items", listId] as const,
  exploreDetail: (id: string) => ["explore-detail", id] as const,
  myLists: (q?: string, sort?: string, visibility?: string) =>
    ["my-lists", q ?? "", sort ?? "recent", visibility ?? "all"] as const,
  listPrice: (listId: string) => ["list-price", listId] as const,
  listCollaborators: (listId: string) =>
    ["list-collaborators", listId] as const,
  listActiveParticipants: (listId: string) =>
    ["list-active-participants", listId] as const,
  stripeAccountStatus: () => ["stripe-account-status"] as const,
  userProfile: (userId: string) => ["user-profile", userId] as const,
  userAchievements: (userId: string) => ["user-achievements", userId] as const,
  userActivity: (userId: string) => ["user-activity", userId] as const,
  userDirectory: (q?: string) => ["user-directory", q ?? ""] as const,
  userMe: () => ["user-me"] as const,
  followStatus: (userId: string) => ["follow-status", userId] as const,
  feed: () => ["feed"] as const,
  notifications: () => ["notifications"] as const,
  stats: () => ["stats"] as const,
  streak: () => ["streak"] as const,
  surpriseOfTheDay: () => ["surprise-of-the-day"] as const,
};
