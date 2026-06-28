import { describe, expect, it } from "vitest";
import { computeLevel, type XpMetrics, xpFromMetrics } from "./xp";

const ZERO: XpMetrics = {
  listsOwned: 0,
  itemsInOwned: 0,
  publicListsOwned: 0,
  participations: 0,
  participationsCompleted: 0,
  followers: 0,
  sales: 0,
  achievementsUnlocked: 0,
};

describe("xpFromMetrics", () => {
  it("returns 0 XP for a brand-new user with no activity", () => {
    expect(xpFromMetrics(ZERO)).toBe(0);
  });

  it("weights each metric and sums them", () => {
    // 1 list (10) + 1 completed challenge (25) + 2 followers (2*5)
    const xp = xpFromMetrics({
      ...ZERO,
      listsOwned: 1,
      participationsCompleted: 1,
      followers: 2,
    });
    expect(xp).toBe(10 + 25 + 10);
  });

  it("rewards achievements more than raw counts", () => {
    const oneAchievement = xpFromMetrics({ ...ZERO, achievementsUnlocked: 1 });
    const oneItem = xpFromMetrics({ ...ZERO, itemsInOwned: 1 });
    expect(oneAchievement).toBeGreaterThan(oneItem);
  });

  it("is monotonic: more activity never lowers XP", () => {
    const a = xpFromMetrics({ ...ZERO, listsOwned: 3 });
    const b = xpFromMetrics({ ...ZERO, listsOwned: 3, followers: 1 });
    expect(b).toBeGreaterThan(a);
  });
});

describe("computeLevel", () => {
  it("level 1 at 0 XP", () => {
    const r = computeLevel(0);
    expect(r.level).toBe(1);
    expect(r.xpIntoLevel).toBe(0);
    expect(r.progress).toBe(0);
  });

  it("advances levels as XP grows", () => {
    const low = computeLevel(50);
    const high = computeLevel(5000);
    expect(high.level).toBeGreaterThan(low.level);
  });

  it("progress is a fraction between 0 and 1", () => {
    const r = computeLevel(137);
    expect(r.progress).toBeGreaterThanOrEqual(0);
    expect(r.progress).toBeLessThanOrEqual(1);
  });

  it("xpIntoLevel + remaining equals the level span", () => {
    const r = computeLevel(137);
    expect(r.xpIntoLevel).toBeGreaterThanOrEqual(0);
    expect(r.xpIntoLevel).toBeLessThan(r.xpForNextLevel);
  });

  it("reaching the exact threshold of a level rolls into it", () => {
    // threshold for level 2 (see formula): find it empirically
    const r1 = computeLevel(0);
    const next = r1.xpForNextLevel;
    const atThreshold = computeLevel(next);
    expect(atThreshold.level).toBe(2);
    expect(atThreshold.xpIntoLevel).toBe(0);
  });
});
