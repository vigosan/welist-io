export type List = {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  category: string | null;
  public: boolean;
  collaborative: boolean;
  ownerId: string | null;
  createdAt: string;
};

export type MyListItem = List & {
  itemCount: number;
  doneCount: number;
  participantCount: number;
};

export type ListWithParticipation = List & {
  participation: {
    role: "challenger" | "collaborator";
    completedAt: string | null;
  } | null;
  rating: { avg: number; count: number; mine: number | null };
};

export type Item = {
  id: string;
  listId: string;
  text: string;
  done: boolean;
  position: number;
  latitude: string | null;
  longitude: string | null;
  placeName: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Page<T> = { items: T[]; nextCursor: string | null };
