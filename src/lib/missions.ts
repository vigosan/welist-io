export const MISSION_TYPES = ["complete_5_items", "accept_2_lists"] as const;

export type MissionType = (typeof MISSION_TYPES)[number];

export const MISSION_TARGETS: Record<MissionType, number> = {
  complete_5_items: 5,
  accept_2_lists: 2,
};

export function currentWeekStartUtc(now: Date = new Date()): Date {
  const d = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  const offsetFromMonday = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - offsetFromMonday);
  return d;
}
