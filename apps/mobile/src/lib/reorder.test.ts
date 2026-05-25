import { describe, expect, it } from "vitest";
import { reorderArray } from "./reorder";

describe("reorderArray", () => {
  it("moves an element forward without losing siblings", () => {
    expect(reorderArray(["a", "b", "c", "d"], 0, 2)).toEqual([
      "b",
      "c",
      "a",
      "d",
    ]);
  });

  it("moves an element backward without losing siblings", () => {
    expect(reorderArray(["a", "b", "c", "d"], 3, 1)).toEqual([
      "a",
      "d",
      "b",
      "c",
    ]);
  });

  it("returns the original array reference-equal when from equals to so renders skip", () => {
    const arr = ["a", "b", "c"];
    expect(reorderArray(arr, 1, 1)).toBe(arr);
  });

  it("returns the original array when indices are out of bounds to avoid corrupting state", () => {
    const arr = ["a", "b", "c"];
    expect(reorderArray(arr, -1, 2)).toBe(arr);
    expect(reorderArray(arr, 0, 5)).toBe(arr);
  });
});
