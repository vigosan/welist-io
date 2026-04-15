import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useItemsFilter } from "./useItemsFilter";
import type { Item } from "@/db/schema";

function makeItem(id: string, text: string, done = false): Item {
  return { id, listId: "l1", text, done, position: 0, createdAt: new Date(), updatedAt: new Date() };
}

const PENDING = makeItem("a", "Tarea #work", false);
const DONE = makeItem("b", "Hecha #personal", true);
const PLAIN = makeItem("c", "Sin tags", false);

const BASE_OPTS = {
  itemsLoading: false,
  statusFilter: undefined as "all" | "pending" | "done" | undefined,
  activeTag: undefined as string | undefined,
  searchQuery: "",
  newItemText: "",
};

describe("useItemsFilter", () => {
  it("returns all items when no filter is active", () => {
    const { result } = renderHook(() =>
      useItemsFilter({ items: [PENDING, DONE, PLAIN], ...BASE_OPTS }),
    );
    expect(result.current.filteredItems).toHaveLength(3);
  });

  it("filters to pending items", () => {
    const { result } = renderHook(() =>
      useItemsFilter({ items: [PENDING, DONE, PLAIN], ...BASE_OPTS, statusFilter: "pending" }),
    );
    expect(result.current.filteredItems.map((i) => i.id)).toEqual(
      expect.arrayContaining(["a", "c"]),
    );
    expect(result.current.filteredItems.map((i) => i.id)).not.toContain("b");
  });

  it("filters to done items", () => {
    const { result } = renderHook(() =>
      useItemsFilter({ items: [PENDING, DONE, PLAIN], ...BASE_OPTS, statusFilter: "done" }),
    );
    expect(result.current.filteredItems.map((i) => i.id)).toEqual(["b"]);
  });

  it("filters by active tag", () => {
    const { result } = renderHook(() =>
      useItemsFilter({ items: [PENDING, DONE, PLAIN], ...BASE_OPTS, activeTag: "work" }),
    );
    expect(result.current.filteredItems.map((i) => i.id)).toEqual(["a"]);
  });

  it("filters by search query (case-insensitive)", () => {
    const { result } = renderHook(() =>
      useItemsFilter({ items: [PENDING, DONE, PLAIN], ...BASE_OPTS, searchQuery: "HECHA" }),
    );
    expect(result.current.filteredItems.map((i) => i.id)).toEqual(["b"]);
  });

  it("collects allTags from items", () => {
    const { result } = renderHook(() =>
      useItemsFilter({ items: [PENDING, DONE, PLAIN], ...BASE_OPTS }),
    );
    expect(result.current.allTags).toEqual(["personal", "work"]);
  });

  it("returns tagSuggestions matching newItemText partial tag", () => {
    const { result } = renderHook(() =>
      useItemsFilter({ items: [PENDING, DONE, PLAIN], ...BASE_OPTS, newItemText: "#wo" }),
    );
    expect(result.current.tagSuggestions).toEqual(["work"]);
  });

  it("places done items after pending in initial stable sort", () => {
    const items = [DONE, PENDING, PLAIN];
    const { result } = renderHook(() =>
      useItemsFilter({ items, ...BASE_OPTS }),
    );
    const ids = result.current.stableItems.map((i) => i.id);
    expect(ids.indexOf("b")).toBeGreaterThan(ids.indexOf("a"));
    expect(ids.indexOf("b")).toBeGreaterThan(ids.indexOf("c"));
  });

  it("resetOrder clears the stable sort reference", () => {
    const { result } = renderHook(() =>
      useItemsFilter({ items: [DONE, PENDING], ...BASE_OPTS }),
    );
    act(() => { result.current.resetOrder(); });
    expect(result.current.stableItems).toBeDefined();
  });

  it("setOrder reorders items immediately without waiting for server", () => {
    const items = [PENDING, DONE, PLAIN];
    const { result } = renderHook(() =>
      useItemsFilter({ items, ...BASE_OPTS }),
    );
    act(() => { result.current.setOrder(["c", "a", "b"]); });
    expect(result.current.stableItems.map((i) => i.id)).toEqual(["c", "a", "b"]);
  });
});
