import { apiFetch } from "@/lib/api";

export type Collaborator = { id: string; name: string | null; image: string | null };

export type Challenger = Collaborator & {
  completedAt: string | null;
  doneCount: number;
  totalItems: number;
};

export const collaboratorsService = {
  list: (listId: string) =>
    apiFetch<{ collaborators: Collaborator[]; challengers: Challenger[] }>(
      `/lists/${listId}/collaborators`
    ),

  add: (listId: string, userId: string) =>
    apiFetch<void>(`/lists/${listId}/collaborators`, {
      method: "POST",
      body: JSON.stringify({ userId }),
    }),

  remove: (listId: string, userId: string) =>
    apiFetch<void>(`/lists/${listId}/collaborators/${userId}`, {
      method: "DELETE",
    }),
};
