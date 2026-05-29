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

type CollaboratorsData = Awaited<ReturnType<typeof listsService.collaborators>>;

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
    onMutate: async (userId) => {
      await qc.cancelQueries({
        queryKey: queryKeys.listCollaborators(listId),
      });
      const previous = qc.getQueryData<CollaboratorsData>(
        queryKeys.listCollaborators(listId)
      );
      qc.setQueryData<CollaboratorsData>(
        queryKeys.listCollaborators(listId),
        (old) =>
          old
            ? {
                ...old,
                collaborators: old.collaborators.filter((c) => c.id !== userId),
              }
            : old
      );
      return { previous };
    },
    onError: (_err, _userId, ctx) => {
      qc.setQueryData(queryKeys.listCollaborators(listId), ctx?.previous);
    },
    onSettled: () => {
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
    onMutate: async (slug) => {
      await qc.cancelQueries({ queryKey: queryKeys.list(listId) });
      const previous = qc.getQueryData<ListWithParticipation>(
        queryKeys.list(listId)
      );
      qc.setQueryData<ListWithParticipation>(queryKeys.list(listId), (old) =>
        old ? { ...old, slug } : old
      );
      return { previous };
    },
    onError: (_err, _slug, ctx) => {
      qc.setQueryData(queryKeys.list(listId), ctx?.previous);
    },
    onSettled: (updated) => {
      if (updated) qc.setQueryData(queryKeys.list(listId), updated);
    },
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

type UserMe = {
  publicProfile: boolean;
  emailOptIn: boolean;
  hasPassword: boolean;
};

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { publicProfile?: boolean; emailOptIn?: boolean }) =>
      usersService.updateProfile(data),
    onSuccess: (updated) => {
      qc.setQueryData<UserMe>(queryKeys.userMe(), (old) =>
        old ? { ...old, ...updated } : { ...updated, hasPassword: false }
      );
    },
  });
}

type UserSettings = { showAdult: boolean };

export function useUserSettings(opts: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: queryKeys.userSettings(),
    queryFn: () => usersService.getSettings(),
    staleTime: 60_000,
    enabled: opts.enabled ?? true,
  });
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { showAdult: boolean }) =>
      usersService.updateSettings(data),
    onSuccess: (updated) => {
      qc.setQueryData<UserSettings>(queryKeys.userSettings(), updated);
    },
  });
}

export function useSetPassword() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (password: string) => usersService.setPassword(password),
    onSuccess: () => {
      qc.setQueryData<UserMe>(queryKeys.userMe(), (old) =>
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

export function useSignup() {
  return useMutation({
    mutationFn: (data: { email: string; password: string; name?: string }) =>
      usersService.signup(data),
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
