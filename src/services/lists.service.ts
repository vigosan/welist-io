import type { Item, List } from "@/db/schema";
import { apiClient } from "@/lib/api-client";

export type ListPrice = {
  priceInCents: number;
  currency: string;
};
export type StripeAccountStatus = {
  connected: boolean;
  onboardingComplete: boolean;
};

export type ListWithParticipation = List & {
  participated: boolean;
  participationCompletedAt: string | null;
};

export type ExploreItem = Pick<
  List,
  "id" | "name" | "slug" | "description" | "category" | "createdAt"
> & {
  itemCount: number;
  participantCount: number;
  completedCount: number;
  progressDoneTotal: number;
  previewItems: string[];
  participants: Array<{
    id: string;
    name: string | null;
    image: string | null;
  }>;
  isParticipating: boolean;
  owner: {
    id: string | null;
    name: string | null;
    image: string | null;
  } | null;
};

export type ExploreDetail = {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  createdAt: string;
  ownerId: string | null;
  owner: {
    name: string | null;
    image: string | null;
  } | null;
  itemCount: number;
  participantCount: number;
  challengers: Array<{
    id: string;
    name: string | null;
    image: string | null;
    completedAt: string | null;
    doneCount: number;
    totalItems: number;
  }>;
  completedParticipants: Array<{
    name: string | null;
    image: string | null;
    completedAt: string | null;
  }>;
};

export type UserProfile = {
  id: string;
  name: string | null;
  image: string | null;
  publicLists: Array<{
    id: string;
    name: string;
    slug: string | null;
    description: string | null;
    createdAt: string;
    itemCount: number;
    participantCount: number;
    completedCount: number;
  }>;
  completedChallenges: Array<{
    id: string;
    name: string;
    slug: string | null;
    completedAt: string | null;
  }>;
};

export type AppNotification = {
  id: string;
  userId: string;
  type:
    | "challenge_accepted"
    | "challenge_completed"
    | "new_follower"
    | "list_purchased"
    | "added_as_collaborator"
    | "item_added"
    | "item_done"
    | "list_completed"
    | "item_liked"
    | "weekly_recap";
  listId: string | null;
  listName: string | null;
  actorId: string | null;
  actorName: string | null;
  actorImage: string | null;
  actionUrl: string | null;
  metadata: {
    count?: number;
    itemIds?: string[];
    accepted?: number;
    completed?: number;
    followers?: number;
    liked?: number;
  } | null;
  readAt: string | null;
  createdAt: string;
};

export const notificationsService = {
  getAll: () => apiClient<AppNotification[]>("/api/notifications"),
  readAll: () =>
    apiClient<void>("/api/notifications/read-all", { method: "PATCH" }),
  markRead: (id: string) =>
    apiClient<void>(`/api/notifications/${id}/read`, { method: "PATCH" }),
};

export type FeedItem = {
  id: string;
  action:
    | "item_added"
    | "item_edited"
    | "item_deleted"
    | "challenge_accepted"
    | "challenge_completed";
  createdAt: string;
  listId: string;
  listName: string;
  listSlug: string | null;
  newValue: { text?: string } | null;
  actorId: string;
  actorName: string | null;
  actorImage: string | null;
};

export const feedService = {
  getAll: (cursor?: string) => {
    const qs = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
    return apiClient<{ items: FeedItem[]; nextCursor: string | null }>(
      `/api/feed${qs}`
    );
  },
};

export type DirectoryUser = {
  id: string;
  name: string | null;
  image: string | null;
  ownedListsCount: number;
  challengerCount: number;
  completedChallengesCount: number;
  collaboratorCount: number;
  achievementsUnlocked: number;
  achievementsTotal: number;
  followerCount: number;
  isFollowing: boolean;
};

export type AppStats = {
  users: number;
  lists: number;
  challenges: number;
  itemsCompleted: number;
};

export type AchievementType =
  | "first_list_created"
  | "five_lists_created"
  | "first_item_added"
  | "hundred_items_created"
  | "first_public_list"
  | "first_list_accepted"
  | "ten_lists_accepted"
  | "first_list_completed"
  | "five_lists_completed"
  | "ten_lists_completed"
  | "first_follower"
  | "ten_followers"
  | "first_sale";

export type UserAchievement = {
  type: AchievementType;
  target: number;
  progress: number;
  unlockedAt: string | null;
};

export const statsService = {
  get: () => apiClient<AppStats>("/api/stats"),
};

export const usersService = {
  getProfile: (userId: string) =>
    apiClient<UserProfile>(`/api/users/${userId}/profile`),

  getAchievements: (userId: string) =>
    apiClient<{ achievements: UserAchievement[] }>(
      `/api/users/${userId}/achievements`
    ),

  directory: (q?: string, cursor?: string) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (cursor) params.set("cursor", cursor);
    const qs = params.toString();
    return apiClient<{ users: DirectoryUser[]; nextCursor: string | null }>(
      `/api/users${qs ? `?${qs}` : ""}`
    );
  },

  getMe: () =>
    apiClient<{
      publicProfile: boolean;
      emailOptIn: boolean;
      hasPassword: boolean;
    }>("/api/users/me"),

  getStreak: () => apiClient<{ current: number }>("/api/me/streak"),

  followStatus: (userId: string) =>
    apiClient<{
      isFollowing: boolean;
      followerCount: number;
      followingCount: number;
    }>(`/api/users/${userId}/follow-status`),

  follow: (userId: string) =>
    apiClient<{ following: boolean }>(`/api/users/${userId}/follow`, {
      method: "POST",
    }),

  unfollow: (userId: string) =>
    apiClient<{ following: boolean }>(`/api/users/${userId}/follow`, {
      method: "DELETE",
    }),

  updateProfile: (data: { publicProfile?: boolean; emailOptIn?: boolean }) =>
    apiClient<{ publicProfile: boolean; emailOptIn: boolean }>(
      "/api/users/me",
      {
        method: "PATCH",
        body: JSON.stringify(data),
      }
    ),

  getSettings: () =>
    apiClient<{ showAdult: boolean }>("/api/users/me/settings"),

  updateSettings: (data: { showAdult: boolean }) =>
    apiClient<{ showAdult: boolean }>("/api/users/me/settings", {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  setPassword: (password: string) =>
    apiClient<{ ok: true }>("/api/me/password", {
      method: "POST",
      body: JSON.stringify({ password }),
    }),

  signup: (data: { email: string; password: string; name?: string }) =>
    apiClient<{ ok: true }>("/api/auth-web/signup", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  deleteAccount: () => apiClient<{ ok: true }>("/api/me", { method: "DELETE" }),

  search: (q: string) =>
    apiClient<{
      users: {
        id: string;
        name: string | null;
        email: string | null;
        image: string | null;
      }[];
    }>(`/api/users/search?q=${encodeURIComponent(q)}`),
};

export const stripeService = {
  getAccountStatus: () =>
    apiClient<StripeAccountStatus>("/api/stripe/account-status"),
};

export const listsService = {
  get: (listId: string) =>
    apiClient<ListWithParticipation>(`/api/lists/${listId}`),

  create: (name: string) =>
    apiClient<List>("/api/lists", {
      method: "POST",
      body: JSON.stringify({ name }),
    }),

  createFromTemplate: async (name: string, items: string[]) => {
    const list = await apiClient<List>("/api/lists", {
      method: "POST",
      body: JSON.stringify({ name }),
    });
    if (items.length > 0) {
      await apiClient(`/api/lists/${list.id}/items/bulk`, {
        method: "POST",
        body: JSON.stringify({ texts: items }),
      });
    }
    return list;
  },

  update: (
    listId: string,
    patch: {
      name?: string;
      slug?: string | null;
      description?: string | null;
      category?: string | null;
      public?: boolean;
      collaborative?: boolean;
    }
  ) =>
    apiClient<List>(`/api/lists/${listId}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),

  explore: (q?: string, cursor?: string, sort?: string, category?: string) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (cursor) params.set("cursor", cursor);
    if (sort) params.set("sort", sort);
    if (category) params.set("category", category);
    const qs = params.toString();
    return apiClient<{
      items: ExploreItem[];
      nextCursor: string | null;
    }>(`/api/explore${qs ? `?${qs}` : ""}`);
  },

  clone: (listId: string) =>
    apiClient<List>(`/api/lists/${listId}/clone`, {
      method: "POST",
    }),

  exploreDetail: (listId: string) =>
    apiClient<ExploreDetail>(`/api/explore/${listId}`),

  exploreItems: (listId: string) =>
    apiClient<Item[]>(`/api/explore/${listId}/items`),

  accept: (listId: string) =>
    apiClient<ListWithParticipation>(`/api/lists/${listId}/accept`, {
      method: "POST",
    }),

  remove: (listId: string) =>
    apiClient<void>(`/api/lists/${listId}`, {
      method: "DELETE",
    }),

  getPrice: (listId: string) =>
    apiClient<ListPrice | null>(`/api/lists/${listId}/price`),

  setPrice: (listId: string, priceInCents: number) =>
    apiClient<ListPrice>(`/api/lists/${listId}/price`, {
      method: "POST",
      body: JSON.stringify({ priceInCents }),
    }),

  removePrice: (listId: string) =>
    apiClient<void>(`/api/lists/${listId}/price`, {
      method: "DELETE",
    }),

  collaborators: (listId: string) =>
    apiClient<{
      collaborators: {
        id: string;
        name: string | null;
        image: string | null;
      }[];
      challengers: {
        id: string;
        name: string | null;
        image: string | null;
        completedAt: string | null;
        doneCount: number;
        totalItems: number;
      }[];
    }>(`/api/lists/${listId}/collaborators`),

  addCollaborator: (listId: string, userId: string) =>
    apiClient<void>(`/api/lists/${listId}/collaborators`, {
      method: "POST",
      body: JSON.stringify({ userId }),
    }),

  removeCollaborator: (listId: string, userId: string) =>
    apiClient<void>(`/api/lists/${listId}/collaborators/${userId}`, {
      method: "DELETE",
    }),

  activeParticipants: (listId: string) =>
    apiClient<{
      participants: { id: string; name: string | null; image: string | null }[];
      total: number;
    }>(`/api/lists/${listId}/active-participants`),

  myLists: (
    cursor?: string,
    q?: string,
    sort?: string,
    visibility?: string,
    role?: string
  ) => {
    const params = new URLSearchParams();
    if (cursor) params.set("cursor", cursor);
    if (q) params.set("q", q);
    if (sort) params.set("sort", sort);
    if (visibility && visibility !== "all")
      params.set("visibility", visibility);
    if (role && role !== "all") params.set("role", role);
    const qs = params.toString();
    return apiClient<{
      items: (List & {
        itemCount: number;
        doneCount: number;
        participantCount: number;
      })[];
      nextCursor: string | null;
    }>(`/api/my-lists${qs ? `?${qs}` : ""}`);
  },
};
