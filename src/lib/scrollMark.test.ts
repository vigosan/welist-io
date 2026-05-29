import { describe, expect, it } from "vitest";
import {
  doneCountFromProgress,
  flagsFromOrder,
  shuffledOrder,
} from "./scrollMark";

describe("doneCountFromProgress", () => {
  it("marks nothing at the start of the scroll", () => {
    expect(doneCountFromProgress(0, 5)).toBe(0);
  });

  it("marks everything at the end of the scroll", () => {
    expect(doneCountFromProgress(1, 5)).toBe(5);
  });

  it("scales the count linearly with scroll progress", () => {
    expect(doneCountFromProgress(0.5, 4)).toBe(2);
  });

  it("clamps progress below zero so the count never goes negative", () => {
    expect(doneCountFromProgress(-0.3, 5)).toBe(0);
  });

  it("clamps progress above one so the count never exceeds the total", () => {
    expect(doneCountFromProgress(1.4, 5)).toBe(5);
  });
});

describe("shuffledOrder", () => {
  it("returns a permutation containing every index exactly once", () => {
    const order = shuffledOrder(5);
    expect([...order].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4]);
  });

  it("is deterministic for a given rng so up/down scrolling stays consistent", () => {
    const rng = () => 0.5;
    expect(shuffledOrder(4, rng)).toEqual(shuffledOrder(4, rng));
  });

  it("does not mark items in their natural order", () => {
    const order = shuffledOrder(5, () => 0);
    expect(order).not.toEqual([0, 1, 2, 3, 4]);
  });
});

describe("flagsFromOrder", () => {
  it("marks no items when the done count is zero", () => {
    expect(flagsFromOrder([2, 0, 4, 1, 3], 0)).toEqual([
      false,
      false,
      false,
      false,
      false,
    ]);
  });

  it("marks the first N items of the random order, not the first N positions", () => {
    expect(flagsFromOrder([2, 0, 4, 1, 3], 2)).toEqual([
      true,
      false,
      true,
      false,
      false,
    ]);
  });

  it("marks every item when the done count reaches the total", () => {
    expect(flagsFromOrder([2, 0, 4, 1, 3], 5)).toEqual([
      true,
      true,
      true,
      true,
      true,
    ]);
  });

  it("is reversible: a lower count is a subset of a higher count's marks", () => {
    const order = [2, 0, 4, 1, 3];
    const two = flagsFromOrder(order, 2);
    const three = flagsFromOrder(order, 3);
    two.forEach((done, i) => {
      if (done) expect(three[i]).toBe(true);
    });
  });
});
