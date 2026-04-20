import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { notFound } from "@tanstack/react-router";
import { POLLING_INTERVAL_MS } from "@/lib/constants";
import { queryKeys } from "@/lib/query-keys";
import type { ListWithParticipation } from "@/services/lists.service";
import { listsService, usersService } from "@/services/lists.service";

export function useCollaborators(listId: string, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.listCollaborators(listId),
    queryFn: () => listsService.collaborators(listId),
    enabled,
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
    staleTime: POLLING_INTERVAL_MS,
    refetchInterval: POLLING_INTERVAL_MS,
    refetchIntervalInBackground: false,
  });
}

export function useCreateList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => listsService.create(name),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-lists"] }),
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

export function useExplore(q?: string, sort?: string) {
  return useInfiniteQuery({
    queryKey: queryKeys.explore(q, sort),
    queryFn: ({ pageParam }) => listsService.explore(q, pageParam, sort),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    staleTime: POLLING_INTERVAL_MS,
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
    staleTime: POLLING_INTERVAL_MS,
  });
}

export function useDeleteList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (listId: string) => listsService.remove(listId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-lists"] }),
  });
}

export function useAcceptChallenge() {
  return useMutation({
    mutationFn: (listId: string) => listsService.accept(listId),
  });
}

export function useUserProfile(userId: string) {
  return useQuery({
    queryKey: queryKeys.userProfile(userId),
    queryFn: () => usersService.getProfile(userId),
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
    mutationFn: (data: { publicProfile: boolean }) =>
      usersService.updateProfile(data),
    onSuccess: (updated) => {
      qc.setQueryData(queryKeys.userMe(), updated);
    },
  });
}
