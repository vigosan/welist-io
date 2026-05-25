import { describe, expect, it } from "vitest";
import { filterItems, type FilterMode } from "./items-filter";
import type { Item } from "../types";

function item(id: string, done: boolean): Item {
  return {
    id,
    listId: "l1",
    text: id,
    done,
    position: 0,
    latitude: null,
    longitude: null,
    placeName: null,
    createdAt: "",
    updatedAt: "",
  };
}

const sample: Item[] = [
  item("a", false),
  item("b", true),
  item("c", false),
  item("d", true),
];

describe("filterItems", () => {
  it("returns every item in 'all' mode so users keep their full context", () => {
    expect(filterItems(sample, "all").map((i) => i.id)).toEqual([
      "a",
      "b",
      "c",
      "d",
    ]);
  });

  it("hides completed items in 'pending' mode to focus on remaining work", () => {
    expect(filterItems(sample, "pending").map((i) => i.id)).toEqual(["a", "c"]);
  });

  it("shows only completed items in 'done' mode for review", () => {
    expect(filterItems(sample, "done").map((i) => i.id)).toEqual(["b", "d"]);
  });

  it("falls back to all when an unknown mode is passed defensively", () => {
    expect(filterItems(sample, "garbage" as FilterMode)).toHaveLength(4);
  });
});
