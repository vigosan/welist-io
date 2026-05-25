import { apiFetch } from "@/lib/api";

export const streakService = {
  get: () => apiFetch<{ current: number }>("/me/streak"),
};
