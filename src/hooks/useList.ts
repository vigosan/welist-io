import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { notFound } from "@tanstack/react-router";
import { queryKeys } from "@/lib/query-keys";
import { eventsService } from "@/services/events.service";
import type {
  DirectoryUser,
  ListWithParticipation,
} from "@/services/lists.service";
import {
  listsService,
  statsService,
  usersService,
} from "@/services/lists.service";

type DirectoryPage = { users: DirectoryUser[]; nextCursor: string | null };
type DirectoryInfiniteData = { pages: DirectoryPage[]; pageParams: unknown[] };

type MyListsPage = {
  items: { id: string }[];
  nextCursor: string | null;
};
type MyListsInfiniteData = { pages: MyListsPage[]; pageParams: unknown[] };

export function useCollaborators(listId: string, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.listCollaborators(listId),
    queryFn: () => listsService.collaborators(listId),
    enabled,
    staleTime: 30_000,
  });
}

export function useUserSearch(q: string) {
  return useQuery({
    queryKey: queryKeys.userSearch(q),
    queryFn: () => usersService.search(q),
    enabled: q.length >= 2,
    staleTime: 30_000,
  });
}

export function useAddCollaborator(listId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      listsService.addCollaborator(listId, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.listCollaborators(listId) });
    },
  });
}

export function useRemoveCollaborator(listId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      listsService.removeCollaborator(listId, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.listCollaborators(listId) });
    },
  });
}

export function useActiveParticipants(listId: string) {
  return useQuery({
    queryKey: queryKeys.listActiveParticipants(listId),
    queryFn: () => listsService.activeParticipants(listId),
    staleTime: 30_000,
  });
}

export function useList(listId: string) {
  return useQuery<ListWithParticipation>({
    queryKey: queryKeys.list(listId),
    queryFn: async () => {
      try {
        return await listsService.get(listId);
      } catch {
        throw notFound();
      }
    },
  });
}

export function useCreateList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => listsService.create(name),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.myListsAll() }),
  });
}

export function useUpdateName(listId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => listsService.update(listId, { name }),
    onMutate: async (name) => {
      await qc.cancelQueries({
        queryKey: queryKeys.list(listId),
      });
      const previous = qc.getQueryData<ListWithParticipation>(
        queryKeys.list(listId)
      );
      qc.setQueryData<ListWithParticipation>(queryKeys.list(listId), (old) =>
        old ? { ...old, name } : old
      );
      return { previous };
    },
    onError: (_err, _name, ctx) => {
      qc.setQueryData(queryKeys.list(listId), ctx?.previous);
    },
    onSettled: (updated) => {
      if (updated) qc.setQueryData(queryKeys.list(listId), updated);
    },
  });
}

export function useUpdateDescription(listId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (description: string | null) =>
      listsService.update(listId, { description }),
    onMutate: async (description) => {
      await qc.cancelQueries({
        queryKey: queryKeys.list(listId),
      });
      const previous = qc.getQueryData<ListWithParticipation>(
        queryKeys.list(listId)
      );
      qc.setQueryData<ListWithParticipation>(queryKeys.list(listId), (old) =>
        old ? { ...old, description } : old
      );
      return { previous };
    },
    onError: (_err, _val, ctx) => {
      qc.setQueryData(queryKeys.list(listId), ctx?.previous);
    },
    onSettled: (updated) => {
      if (updated) qc.setQueryData(queryKeys.list(listId), updated);
    },
  });
}

export function useUpdateCategory(listId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (category: string | null) =>
      listsService.update(listId, { category }),
    onMutate: async (category) => {
      await qc.cancelQueries({
        queryKey: queryKeys.list(listId),
      });
      const previous = qc.getQueryData<ListWithParticipation>(
        queryKeys.list(listId)
      );
      qc.setQueryData<ListWithParticipation>(queryKeys.list(listId), (old) =>
        old ? { ...old, category } : old
      );
      return { previous };
    },
    onError: (_err, _val, ctx) => {
      qc.setQueryData(queryKeys.list(listId), ctx?.previous);
    },
    onSettled: (updated) => {
      if (updated) qc.setQueryData(queryKeys.list(listId), updated);
    },
  });
}

export function useUpdateSlug(listId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (slug: string | null) => listsService.update(listId, { slug }),
    onSuccess: (updated) => qc.setQueryData(queryKeys.list(listId), updated),
  });
}

export function useTogglePublic(listId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (isPublic: boolean) =>
      listsService.update(listId, { public: isPublic }),
    onMutate: async (isPublic) => {
      await qc.cancelQueries({
        queryKey: queryKeys.list(listId),
      });
      const previous = qc.getQueryData<ListWithParticipation>(
        queryKeys.list(listId)
      );
      qc.setQueryData<ListWithParticipation>(queryKeys.list(listId), (old) =>
        old ? { ...old, public: isPublic } : old
      );
      return { previous };
    },
    onError: (_err, _val, ctx) => {
      qc.setQueryData(queryKeys.list(listId), ctx?.previous);
    },
    onSettled: (updated) => {
      if (updated) qc.setQueryData(queryKeys.list(listId), updated);
    },
  });
}

export function useToggleCollaborative(listId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (collaborative: boolean) =>
      listsService.update(listId, { collaborative }),
    onMutate: async (collaborative) => {
      await qc.cancelQueries({
        queryKey: queryKeys.list(listId),
      });
      const previous = qc.getQueryData<ListWithParticipation>(
        queryKeys.list(listId)
      );
      qc.setQueryData<ListWithParticipation>(queryKeys.list(listId), (old) =>
        old ? { ...old, collaborative } : old
      );
      return { previous };
    },
    onError: (_err, _val, ctx) => {
      qc.setQueryData(queryKeys.list(listId), ctx?.previous);
    },
    onSettled: (updated) => {
      if (updated) qc.setQueryData(queryKeys.list(listId), updated);
    },
  });
}

export function useExplore(q?: string, sort?: string, category?: string) {
  return useInfiniteQuery({
    queryKey: queryKeys.explore(q, sort, category),
    queryFn: ({ pageParam }) =>
      listsService.explore(q, pageParam, sort, category),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}

export function useCloneList() {
  return useMutation({
    mutationFn: (listId: string) => listsService.clone(listId),
  });
}

export function useExploreDetail(listId: string) {
  return useQuery({
    queryKey: queryKeys.exploreDetail(listId),
    queryFn: () => listsService.exploreDetail(listId),
  });
}

export function useExploreItems(listId: string, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.exploreItems(listId),
    queryFn: () => listsService.exploreItems(listId),
    enabled,
  });
}

export function useMyLists(
  search?: string,
  sort?: string,
  visibility?: string
) {
  return useInfiniteQuery({
    queryKey: queryKeys.myLists(search, sort, visibility),
    queryFn: ({ pageParam }) =>
      listsService.myLists(pageParam, search, sort, visibility),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}

export function useDeleteList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (listId: string) => listsService.remove(listId),
    onMutate: async (listId) => {
      await qc.cancelQueries({ queryKey: queryKeys.myListsAll() });
      const previous = qc.getQueriesData<MyListsInfiniteData>({
        queryKey: queryKeys.myListsAll(),
      });
      qc.setQueriesData<MyListsInfiniteData>(
        { queryKey: queryKeys.myListsAll() },
        (old) =>
          old
            ? {
                ...old,
                pages: old.pages.map((p) => ({
                  ...p,
                  items: p.items.filter((i) => i.id !== listId),
                })),
              }
            : old
      );
      return { previous };
    },
    onError: (_err, _listId, ctx) => {
      ctx?.previous?.forEach(([key, data]) => {
        qc.setQueryData(key, data);
      });
    },
    onSettled: () => qc.invalidateQueries({ queryKey: queryKeys.myListsAll() }),
  });
}

export function useAcceptChallenge() {
  return useMutation({
    mutationFn: (listId: string) => listsService.accept(listId),
    onSuccess: (_data, listId) => {
      eventsService.track({ type: "list_accepted", listId });
    },
  });
}

export function useFeed(enabled = true) {
  return useQuery({
    queryKey: queryKeys.feed(),
    queryFn: () => usersService.getFeed(),
    enabled,
    staleTime: 60_000,
  });
}

export function useUserProfile(userId: string) {
  return useQuery({
    queryKey: queryKeys.userProfile(userId),
    queryFn: () => usersService.getProfile(userId),
    staleTime: 60_000,
  });
}

export function useUserAchievements(userId: string) {
  return useQuery({
    queryKey: queryKeys.userAchievements(userId),
    queryFn: async () =>
      (await usersService.getAchievements(userId)).achievements,
    staleTime: 60_000,
  });
}

export function useUserDirectory(q?: string) {
  return useInfiniteQuery({
    queryKey: queryKeys.userDirectory(q),
    queryFn: ({ pageParam }) => usersService.directory(q, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    staleTime: 60_000,
  });
}

export function useUserMe() {
  return useQuery({
    queryKey: queryKeys.userMe(),
    queryFn: () => usersService.getMe(),
    staleTime: 60_000,
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { publicProfile?: boolean; emailOptIn?: boolean }) =>
      usersService.updateProfile(data),
    onSuccess: (updated) => {
      qc.setQueryData(queryKeys.userMe(), updated);
    },
  });
}

export function useSetPassword() {
  return useMutation({
    mutationFn: (password: string) => usersService.setPassword(password),
  });
}

export function useStats() {
  return useQuery({
    queryKey: queryKeys.stats(),
    queryFn: () => statsService.get(),
    staleTime: 5 * 60_000,
  });
}

export function useStreak() {
  return useQuery({
    queryKey: queryKeys.streak(),
    queryFn: () => usersService.getStreak(),
    staleTime: 60_000,
  });
}

type FollowStatus = {
  isFollowing: boolean;
  followerCount: number;
  followingCount: number;
};

export function useFollowStatus(userId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.followStatus(userId),
    queryFn: () => usersService.followStatus(userId),
    enabled,
    staleTime: 60_000,
  });
}

export function useToggleFollow(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (isFollowing: boolean) =>
      isFollowing ? usersService.unfollow(userId) : usersService.follow(userId),
    onMutate: async (isFollowing) => {
      await qc.cancelQueries({
        queryKey: queryKeys.followStatus(userId),
      });
      const previous = qc.getQueryData<FollowStatus>(
        queryKeys.followStatus(userId)
      );
      qc.setQueryData<FollowStatus>(queryKeys.followStatus(userId), (old) =>
        old
          ? {
              ...old,
              isFollowing: !isFollowing,
              followerCount: old.followerCount + (isFollowing ? -1 : 1),
            }
          : old
      );
      qc.setQueriesData<DirectoryInfiniteData>(
        { queryKey: queryKeys.userDirectoryAll() },
        (old) =>
          old
            ? {
                ...old,
                pages: old.pages.map((page) => ({
                  ...page,
                  users: page.users.map((u) =>
                    u.id === userId
                      ? {
                          ...u,
                          isFollowing: !isFollowing,
                          followerCount:
                            u.followerCount + (isFollowing ? -1 : 1),
                        }
                      : u
                  ),
                })),
              }
            : old
      );
      return { previous };
    },
    onError: (_err, _val, ctx) => {
      qc.setQueryData(queryKeys.followStatus(userId), ctx?.previous);
    },
    onSettled: () => {
      qc.invalidateQueries({
        queryKey: queryKeys.followStatus(userId),
      });
    },
  });
}

function applyRatingChange(
  rating: ListWithParticipation["rating"] | undefined,
  next: number | null
): ListWithParticipation["rating"] {
  const base = rating ?? { avg: null, count: 0, userValue: null };
  const sum = (base.avg ?? 0) * base.count;
  const previousValue = base.userValue;
  const sumWithoutPrev = previousValue != null ? sum - previousValue : sum;
  const countWithoutPrev = previousValue != null ? base.count - 1 : base.count;
  const newCount = next != null ? countWithoutPrev + 1 : countWithoutPrev;
  const newSum = next != null ? sumWithoutPrev + next : sumWithoutPrev;
  return {
    avg: newCount > 0 ? newSum / newCount : null,
    count: newCount,
    userValue: next,
  };
}

export function useRateList(listId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (value: number) => listsService.rate(listId, value),
    onMutate: async (value) => {
      await qc.cancelQueries({ queryKey: queryKeys.list(listId) });
      const previous = qc.getQueryData<ListWithParticipation>(
        queryKeys.list(listId)
      );
      qc.setQueryData<ListWithParticipation>(queryKeys.list(listId), (old) =>
        old ? { ...old, rating: applyRatingChange(old.rating, value) } : old
      );
      return { previous };
    },
    onError: (_err, _val, ctx) => {
      qc.setQueryData(queryKeys.list(listId), ctx?.previous);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.list(listId) });
    },
  });
}

export function useUnrateList(listId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => listsService.unrate(listId),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: queryKeys.list(listId) });
      const previous = qc.getQueryData<ListWithParticipation>(
        queryKeys.list(listId)
      );
      qc.setQueryData<ListWithParticipation>(queryKeys.list(listId), (old) =>
        old ? { ...old, rating: applyRatingChange(old.rating, null) } : old
      );
      return { previous };
    },
    onError: (_err, _val, ctx) => {
      qc.setQueryData(queryKeys.list(listId), ctx?.previous);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.list(listId) });
    },
  });
}
