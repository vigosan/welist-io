import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  type Challenger,
  type Collaborator,
  collaboratorsService,
} from "@/services/collaborators";

type CollabsShape = {
  collaborators: Collaborator[];
  challengers: Challenger[];
};

export function useCollaborators(listId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["collaborators", listId],
    queryFn: () => collaboratorsService.list(listId),
    enabled: enabled && !!listId,
  });
}

export function useAddCollaborator(listId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => collaboratorsService.add(listId, userId),
    onMutate: async (userId) => {
      await qc.cancelQueries({ queryKey: ["collaborators", listId] });
      const previous = qc.getQueryData<CollabsShape>(["collaborators", listId]);
      if (previous && !previous.collaborators.some((c) => c.id === userId)) {
        qc.setQueryData<CollabsShape>(["collaborators", listId], {
          ...previous,
          collaborators: [
            ...previous.collaborators,
            { id: userId, name: null, image: null },
          ],
        });
      }
      return { previous };
    },
    onError: (_err, _userId, ctx) => {
      if (ctx?.previous)
        qc.setQueryData(["collaborators", listId], ctx.previous);
    },
    onSettled: () =>
      qc.invalidateQueries({ queryKey: ["collaborators", listId] }),
  });
}

export function useRemoveCollaborator(listId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => collaboratorsService.remove(listId, userId),
    onMutate: async (userId) => {
      await qc.cancelQueries({ queryKey: ["collaborators", listId] });
      const previous = qc.getQueryData<CollabsShape>(["collaborators", listId]);
      if (previous) {
        qc.setQueryData<CollabsShape>(["collaborators", listId], {
          ...previous,
          collaborators: previous.collaborators.filter((c) => c.id !== userId),
        });
      }
      return { previous };
    },
    onError: (_err, _userId, ctx) => {
      if (ctx?.previous)
        qc.setQueryData(["collaborators", listId], ctx.previous);
    },
    onSettled: () =>
      qc.invalidateQueries({ queryKey: ["collaborators", listId] }),
  });
}
