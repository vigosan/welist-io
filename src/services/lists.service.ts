import { apiClient } from "@/lib/api-client";
import type { List, Item } from "@/db/schema";

export type ListPrice = { priceInCents: number; currency: string };
export type StripeAccountStatus = { connected: boolean; onboardingComplete: boolean };

export type ListWithParticipation = List & {
  participated: boolean;
  participationCompletedAt: string | null;
};

export type ExploreItem = Pick<List, "id" | "name" | "slug" | "description" | "createdAt"> & {
  itemCount: number;
  participantCount: number;
  completedCount: number;
  owner: { image: string | null } | null;
};

export type ExploreDetail = {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  createdAt: string;
  ownerId: string | null;
  owner: { name: string | null; image: string | null } | null;
  itemCount: number;
  participantCount: number;
  participants: Array<{ image: string | null; name: string | null }>;
};

export const stripeService = {
  getAccountStatus: () =>
    apiClient<StripeAccountStatus>("/api/stripe/account-status"),
};

export const listsService = {
  get: (listId: string) =>
    apiClient<ListWithParticipation>(`/api/lists/${listId}`),

  create: (name: string) =>
    apiClient<List>("/api/lists", { method: "POST", body: JSON.stringify({ name }) }),

  update: (listId: string, patch: { name?: string; slug?: string | null; description?: string | null; public?: boolean; collaborative?: boolean }) =>
    apiClient<List>(`/api/lists/${listId}`, { method: "PATCH", body: JSON.stringify(patch) }),

  explore: (q?: string, cursor?: string, sort?: string) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (cursor) params.set("cursor", cursor);
    if (sort) params.set("sort", sort);
    const qs = params.toString();
    return apiClient<{ items: ExploreItem[]; nextCursor: string | null }>(`/api/explore${qs ? `?${qs}` : ""}`);
  },

  clone: (listId: string) =>
    apiClient<List>(`/api/lists/${listId}/clone`, { method: "POST" }),

  exploreDetail: (listId: string) =>
    apiClient<ExploreDetail>(`/api/explore/${listId}`),

  exploreItems: (listId: string) =>
    apiClient<Item[]>(`/api/explore/${listId}/items`),

  accept: (listId: string) =>
    apiClient<ListWithParticipation>(`/api/lists/${listId}/accept`, { method: "POST" }),

  remove: (listId: string) =>
    apiClient<void>(`/api/lists/${listId}`, { method: "DELETE" }),

  getPrice: (listId: string) =>
    apiClient<ListPrice | null>(`/api/lists/${listId}/price`),

  setPrice: (listId: string, priceInCents: number) =>
    apiClient<ListPrice>(`/api/lists/${listId}/price`, { method: "POST", body: JSON.stringify({ priceInCents }) }),

  removePrice: (listId: string) =>
    apiClient<void>(`/api/lists/${listId}/price`, { method: "DELETE" }),

  myLists: (cursor?: string, q?: string, sort?: string, visibility?: string) => {
    const params = new URLSearchParams();
    if (cursor) params.set("cursor", cursor);
    if (q) params.set("q", q);
    if (sort) params.set("sort", sort);
    if (visibility && visibility !== "all") params.set("visibility", visibility);
    const qs = params.toString();
    return apiClient<{ items: List[]; nextCursor: string | null }>(`/api/my-lists${qs ? `?${qs}` : ""}`);
  },
};
