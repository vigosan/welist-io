import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { collaboratorsService } from "@/services/collaborators";

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
    onSuccess: () => qc.invalidateQueries({ queryKey: ["collaborators", listId] }),
  });
}

export function useRemoveCollaborator(listId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => collaboratorsService.remove(listId, userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["collaborators", listId] }),
  });
}
