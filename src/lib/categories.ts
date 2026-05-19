export const LIST_CATEGORIES = [
  "movies",
  "series",
  "books",
  "music",
  "places",
  "food",
  "travel",
  "games",
  "other",
] as const;

export type ListCategory = (typeof LIST_CATEGORIES)[number];
