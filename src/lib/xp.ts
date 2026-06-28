export type XpMetrics = {
  listsOwned: number;
  itemsInOwned: number;
  publicListsOwned: number;
  participations: number;
  participationsCompleted: number;
  followers: number;
  sales: number;
  achievementsUnlocked: number;
};

export type LevelInfo = {
  xp: number;
  level: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  progress: number;
};

const WEIGHTS: Record<keyof XpMetrics, number> = {
  listsOwned: 10,
  itemsInOwned: 1,
  publicListsOwned: 15,
  participations: 8,
  participationsCompleted: 25,
  followers: 5,
  sales: 50,
  achievementsUnlocked: 30,
};

export function xpFromMetrics(metrics: XpMetrics): number {
  let xp = 0;
  for (const key of Object.keys(WEIGHTS) as (keyof XpMetrics)[]) {
    xp += (metrics[key] ?? 0) * WEIGHTS[key];
  }
  return xp;
}

// Each level L (advancing from L to L+1) costs BASE * L XP.
// Cumulative XP to *reach* level L is BASE * (L-1)*L / 2.
const BASE = 100;

function cumulativeXpForLevel(level: number): number {
  return (BASE * (level - 1) * level) / 2;
}

export function computeLevel(xp: number): LevelInfo {
  const safeXp = Math.max(0, Math.floor(xp));
  let level = 1;
  while (cumulativeXpForLevel(level + 1) <= safeXp) {
    level += 1;
  }
  const floor = cumulativeXpForLevel(level);
  const ceil = cumulativeXpForLevel(level + 1);
  const xpForNextLevel = ceil - floor;
  const xpIntoLevel = safeXp - floor;
  const progress = xpForNextLevel > 0 ? xpIntoLevel / xpForNextLevel : 0;
  return { xp: safeXp, level, xpIntoLevel, xpForNextLevel, progress };
}

export function levelFromMetrics(metrics: XpMetrics): LevelInfo {
  return computeLevel(xpFromMetrics(metrics));
}
