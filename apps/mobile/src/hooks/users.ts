import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { usersService } from "@/services/users";

export function useUserDirectory(q?: string) {
  return useInfiniteQuery({
    queryKey: ["users-directory", q ?? ""],
    queryFn: ({ pageParam }) =>
      usersService.directory(pageParam as string | undefined, q),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}

export function useUserSearch(q: string) {
  return useQuery({
    queryKey: ["user-search", q],
    queryFn: () => usersService.search(q),
    enabled: q.trim().length >= 2,
  });
}

export function useUserProfile(userId: string) {
  return useQuery({
    queryKey: ["user-profile", userId],
    queryFn: () => usersService.getProfile(userId),
    enabled: !!userId,
  });
}

export function useUserAchievements(userId: string) {
  return useQuery({
    queryKey: ["user-achievements", userId],
    queryFn: () => usersService.getAchievements(userId),
    enabled: !!userId,
  });
}

export function useFollowStatus(userId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["follow-status", userId],
    queryFn: () => usersService.followStatus(userId),
    enabled: enabled && !!userId,
  });
}

export function useToggleFollow(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (currentlyFollowing: boolean) =>
      currentlyFollowing
        ? usersService.unfollow(userId)
        : usersService.follow(userId),
    onMutate: async (currentlyFollowing) => {
      await qc.cancelQueries({ queryKey: ["follow-status", userId] });
      const previous = qc.getQueryData<{
        isFollowing: boolean;
        followerCount: number;
        followingCount: number;
      }>(["follow-status", userId]);
      if (previous) {
        qc.setQueryData(["follow-status", userId], {
          ...previous,
          isFollowing: !currentlyFollowing,
          followerCount: previous.followerCount + (currentlyFollowing ? -1 : 1),
        });
      }
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous)
        qc.setQueryData(["follow-status", userId], ctx.previous);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["follow-status", userId] });
    },
  });
}

type UserMe = {
  publicProfile: boolean;
  emailOptIn: boolean;
  hasPassword: boolean;
};

export function useUserMe(enabled = true) {
  return useQuery({
    queryKey: ["user-me"],
    queryFn: () => usersService.getMe(),
    enabled,
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { publicProfile?: boolean; emailOptIn?: boolean }) =>
      usersService.updateProfile(data),
    onSuccess: (updated) => {
      qc.setQueryData<UserMe>(["user-me"], (old) =>
        old ? { ...old, ...updated } : { ...updated, hasPassword: false }
      );
    },
  });
}

export function useSetPassword() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (password: string) => usersService.setPassword(password),
    onSuccess: () => {
      qc.setQueryData<UserMe>(["user-me"], (old) =>
        old ? { ...old, hasPassword: true } : old
      );
    },
  });
}

export function useDeleteAccount() {
  return useMutation({
    mutationFn: () => usersService.deleteAccount(),
  });
}

export function useReport() {
  return useMutation({
    mutationFn: (args: {
      targetType: "list" | "user";
      targetId: string;
      reason?: string;
    }) => usersService.report(args.targetType, args.targetId, args.reason),
  });
}
