import { apiFetch } from "@/lib/api";
import type { DirectoryUser, UserAchievement, UserProfile } from "@/types";

export const usersService = {
  directory: (cursor?: string, q?: string) => {
    const params = new URLSearchParams();
    if (cursor) params.set("cursor", cursor);
    if (q) params.set("q", q);
    const qs = params.toString();
    return apiFetch<{ users: DirectoryUser[]; nextCursor: string | null }>(
      `/users${qs ? `?${qs}` : ""}`
    );
  },

  getProfile: (userId: string) =>
    apiFetch<UserProfile>(`/users/${userId}/profile`),

  getAchievements: (userId: string) =>
    apiFetch<{ achievements: UserAchievement[] }>(
      `/users/${userId}/achievements`
    ),

  followStatus: (userId: string) =>
    apiFetch<{
      isFollowing: boolean;
      followerCount: number;
      followingCount: number;
    }>(`/users/${userId}/follow-status`),

  follow: (userId: string) =>
    apiFetch<void>(`/users/${userId}/follow`, { method: "POST" }),

  unfollow: (userId: string) =>
    apiFetch<void>(`/users/${userId}/follow`, { method: "DELETE" }),
};
