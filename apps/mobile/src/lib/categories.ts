export const LIST_CATEGORIES = [
  "movies",
  "series",
  "books",
  "music",
  "podcasts",
  "courses",
  "apps",
  "games",
  "travel",
  "places",
  "hotels",
  "restaurants",
  "bars",
  "experiences",
  "food",
  "recipes",
  "shopping",
  "gifts",
  "wishlist",
  "sports",
  "art",
  "adult",
  "other",
] as const;

export type ListCategory = (typeof LIST_CATEGORIES)[number];

export const ADULT_CATEGORIES: readonly ListCategory[] = ["adult"];
