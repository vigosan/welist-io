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
  likeCount?: number;
  likedByMe?: boolean;
  commentCount?: number;
};

export type ItemCommentView = {
  id: string;
  body: string;
  createdAt: string;
  userId: string;
  userName: string | null;
  userImage: string | null;
};

export type Page<T> = { items: T[]; nextCursor: string | null };

export type ExploreItem = {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  category: string | null;
  createdAt: string;
  itemCount: number;
  participantCount: number;
  completedCount: number;
  progressDoneTotal: number;
  previewItems: string[];
  participants: { id: string; name: string | null; image: string | null }[];
  isParticipating: boolean;
  owner: {
    id: string | null;
    name: string | null;
    image: string | null;
  } | null;
};

export type NotificationType =
  | "challenge_accepted"
  | "challenge_completed"
  | "new_follower"
  | "list_purchased"
  | "added_as_collaborator"
  | "item_added"
  | "item_done"
  | "list_completed"
  | "item_liked"
  | "item_commented"
  | "list_forked"
  | "weekly_recap";

export type AppNotification = {
  id: string;
  userId: string;
  type: NotificationType;
  listId: string | null;
  listName: string | null;
  actorId: string | null;
  actorName: string | null;
  actorImage: string | null;
  actionUrl: string | null;
  metadata: {
    count?: number;
    itemIds?: string[];
    accepted?: number;
    completed?: number;
    followers?: number;
    liked?: number;
  } | null;
  readAt: string | null;
  createdAt: string;
};

export type FeedItem = {
  id: string;
  action:
    | "item_added"
    | "item_edited"
    | "item_deleted"
    | "challenge_accepted"
    | "challenge_completed";
  createdAt: string;
  listId: string;
  listName: string;
  listSlug: string | null;
  newValue: { text?: string } | null;
  actorId: string;
  actorName: string | null;
  actorImage: string | null;
};

export type DirectoryUser = {
  id: string;
  name: string | null;
  image: string | null;
  ownedListsCount: number;
  challengerCount: number;
  completedChallengesCount: number;
  collaboratorCount: number;
  achievementsUnlocked: number;
  achievementsTotal: number;
  followerCount: number;
  isFollowing: boolean;
};

export type UserProfile = {
  id: string;
  name: string | null;
  image: string | null;
  publicLists: {
    id: string;
    name: string;
    slug: string | null;
    description: string | null;
    createdAt: string;
    itemCount: number;
    participantCount: number;
    completedCount: number;
  }[];
  completedChallenges: {
    id: string;
    name: string;
    slug: string | null;
    completedAt: string | null;
  }[];
  level: {
    xp: number;
    level: number;
    xpIntoLevel: number;
    xpForNextLevel: number;
    progress: number;
  };
};

export type AchievementType =
  | "first_list_created"
  | "five_lists_created"
  | "first_item_added"
  | "hundred_items_created"
  | "first_public_list"
  | "first_list_accepted"
  | "ten_lists_accepted"
  | "first_list_completed"
  | "five_lists_completed"
  | "ten_lists_completed"
  | "first_follower"
  | "ten_followers"
  | "first_sale";

export type UserAchievement = {
  type: AchievementType;
  target: number;
  progress: number;
  unlockedAt: string | null;
};

export type ExploreDetail = {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  createdAt: string;
  ownerId: string | null;
  owner: { name: string | null; image: string | null } | null;
  forkedFrom: { id: string; name: string; slug: string | null } | null;
  itemCount: number;
  participantCount: number;
  challengers: {
    id: string;
    name: string | null;
    image: string | null;
    completedAt: string | null;
    doneCount: number;
    totalItems: number;
  }[];
  completedParticipants: {
    name: string | null;
    image: string | null;
    completedAt: string | null;
  }[];
};
