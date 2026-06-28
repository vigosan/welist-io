import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { collectionsService } from "@/services/collections";

export function useCollections() {
  return useInfiniteQuery({
    queryKey: ["collections"],
    queryFn: ({ pageParam }) => collectionsService.explore(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}

export function useMyCollections(enabled: boolean) {
  return useQuery({
    queryKey: ["my-collections"],
    queryFn: () => collectionsService.mine(),
    enabled,
  });
}

export function useCollectionDetail(id: string) {
  return useQuery({
    queryKey: ["collection-detail", id],
    queryFn: () => collectionsService.detail(id),
    enabled: !!id,
  });
}

export function useCreateCollection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      name: string;
      description?: string;
      public?: boolean;
    }) => collectionsService.create(input),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["my-collections"] }),
  });
}

export function useDeleteCollection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => collectionsService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-collections"] });
      qc.invalidateQueries({ queryKey: ["collections"] });
    },
  });
}

export function useAddListToCollection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { collectionId: string; listId: string }) =>
      collectionsService.addList(input.collectionId, input.listId),
    onSuccess: (_d, { collectionId }) => {
      qc.invalidateQueries({ queryKey: ["collection-detail", collectionId] });
      qc.invalidateQueries({ queryKey: ["my-collections"] });
    },
  });
}

export function useRemoveListFromCollection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { collectionId: string; listId: string }) =>
      collectionsService.removeList(input.collectionId, input.listId),
    onSuccess: (_d, { collectionId }) =>
      qc.invalidateQueries({ queryKey: ["collection-detail", collectionId] }),
  });
}
