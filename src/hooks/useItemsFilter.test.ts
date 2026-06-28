import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ItemWithLikes } from "@/hooks/useItems";
import { useItemsFilter } from "./useItemsFilter";

function makeItem(id: string, text: string, done = false): ItemWithLikes {
  return {
    id,
    listId: "l1",
    text,
    done,
    position: 0,
    latitude: null,
    longitude: null,
    placeName: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    likeCount: 0,
    likedByMe: false,
    commentCount: 0,
  };
}

const PENDING = makeItem("a", "Tarea #work", false);
const DONE = makeItem("b", "Hecha #personal", true);
const PLAIN = makeItem("c", "Sin tags", false);

const BASE_OPTS = {
  itemsLoading: false,
  statusFilter: undefined as "all" | "pending" | "done" | undefined,
  activeTag: undefined as string | undefined,
  searchQuery: "",
};

describe("useItemsFilter", () => {
  it("returns all items when no filter is active", () => {
    const { result } = renderHook(() =>
      useItemsFilter({
        items: [PENDING, DONE, PLAIN],
        ...BASE_OPTS,
      })
    );
    expect(result.current.filteredItems).toHaveLength(3);
  });

  it("filters to pending items", () => {
    const { result } = renderHook(() =>
      useItemsFilter({
        items: [PENDING, DONE, PLAIN],
        ...BASE_OPTS,
        statusFilter: "pending",
      })
    );
    expect(result.current.filteredItems.map((i) => i.id)).toEqual(
      expect.arrayContaining(["a", "c"])
    );
    expect(result.current.filteredItems.map((i) => i.id)).not.toContain("b");
  });

  it("filters to done items", () => {
    const { result } = renderHook(() =>
      useItemsFilter({
        items: [PENDING, DONE, PLAIN],
        ...BASE_OPTS,
        statusFilter: "done",
      })
    );
    expect(result.current.filteredItems.map((i) => i.id)).toEqual(["b"]);
  });

  it("filters by active tag", () => {
    const { result } = renderHook(() =>
      useItemsFilter({
        items: [PENDING, DONE, PLAIN],
        ...BASE_OPTS,
        activeTag: "work",
      })
    );
    expect(result.current.filteredItems.map((i) => i.id)).toEqual(["a"]);
  });

  it("filters by search query (case-insensitive)", () => {
    const { result } = renderHook(() =>
      useItemsFilter({
        items: [PENDING, DONE, PLAIN],
        ...BASE_OPTS,
        searchQuery: "HECHA",
      })
    );
    expect(result.current.filteredItems.map((i) => i.id)).toEqual(["b"]);
  });

  it("collects allTags from items", () => {
    const { result } = renderHook(() =>
      useItemsFilter({
        items: [PENDING, DONE, PLAIN],
        ...BASE_OPTS,
      })
    );
    expect(result.current.allTags).toEqual(["personal", "work"]);
  });

  it("preserves server order on initial load regardless of done state", () => {
    const items = [DONE, PENDING, PLAIN];
    const { result } = renderHook(() =>
      useItemsFilter({ items, ...BASE_OPTS })
    );
    expect(result.current.stableItems.map((i) => i.id)).toEqual([
      "b",
      "a",
      "c",
    ]);
  });

  it("preserves server order when items finish loading", () => {
    const { result, rerender } = renderHook(
      ({
        items,
        itemsLoading,
      }: {
        items: ItemWithLikes[];
        itemsLoading: boolean;
      }) => useItemsFilter({ ...BASE_OPTS, items, itemsLoading }),
      { initialProps: { items: [] as ItemWithLikes[], itemsLoading: true } }
    );
    rerender({ items: [DONE, PENDING, PLAIN], itemsLoading: false });
    expect(result.current.stableItems.map((i) => i.id)).toEqual([
      "b",
      "a",
      "c",
    ]);
  });

  it("keeps an item in place after it is toggled done", () => {
    const { result, rerender } = renderHook(
      ({ items }: { items: ItemWithLikes[] }) =>
        useItemsFilter({ ...BASE_OPTS, items }),
      { initialProps: { items: [DONE, PENDING, PLAIN] } }
    );
    expect(result.current.stableItems.map((i) => i.id)).toEqual([
      "b",
      "a",
      "c",
    ]);
    rerender({ items: [DONE, makeItem("a", "Tarea #work", true), PLAIN] });
    expect(result.current.stableItems.map((i) => i.id)).toEqual([
      "b",
      "a",
      "c",
    ]);
  });

  it("appends items added after the order is established", () => {
    const { result, rerender } = renderHook(
      ({ items }: { items: ItemWithLikes[] }) =>
        useItemsFilter({ ...BASE_OPTS, items }),
      { initialProps: { items: [PENDING, DONE] } }
    );
    expect(result.current.stableItems.map((i) => i.id)).toEqual(["a", "b"]);
    rerender({ items: [PENDING, DONE, PLAIN] });
    expect(result.current.stableItems.map((i) => i.id)).toEqual([
      "a",
      "b",
      "c",
    ]);
  });

  it("resetOrder clears the stable sort reference", () => {
    const { result } = renderHook(() =>
      useItemsFilter({
        items: [DONE, PENDING],
        ...BASE_OPTS,
      })
    );
    act(() => {
      result.current.resetOrder();
    });
    expect(result.current.stableItems).toBeDefined();
  });

  it("setOrder reorders items immediately without waiting for server", () => {
    const items = [PENDING, DONE, PLAIN];
    const { result } = renderHook(() =>
      useItemsFilter({ items, ...BASE_OPTS })
    );
    act(() => {
      result.current.setOrder(["c", "a", "b"]);
    });
    expect(result.current.stableItems.map((i) => i.id)).toEqual([
      "c",
      "a",
      "b",
    ]);
  });
});
