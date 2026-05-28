import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { List } from "@/db/schema";
import { useCommandPalette } from "./useCommandPalette";

vi.mock("@/lib/confetti", () => ({
  fireConfetti: vi.fn(),
}));

const LIST: List = {
  id: "l1",
  name: "Mi lista",
  slug: null,
  description: null,
  category: null,
  public: false,
  collaborative: false,
  ownerId: null,
  completedAt: null,
  createdAt: new Date(),
};

function makeOpts(
  overrides: Partial<Parameters<typeof useCommandPalette>[0]> = {}
) {
  return {
    list: LIST,
    allTags: [],
    allPlaces: [],
    activeTag: undefined,
    activePlace: undefined,
    statusFilter: "all" as const,
    viewMode: "list" as const,
    isOwner: true,
    addInputRef: { current: null },
    handleShare: vi.fn(),
    handleExport: vi.fn(),
    pickRandomItem: vi.fn(),
    setActiveTag: vi.fn(),
    setActivePlace: vi.fn(),
    setStatusFilter: vi.fn(),
    setViewMode: vi.fn(),
    setNameValue: vi.fn(),
    setEditingName: vi.fn(),
    togglePublicMutate: vi.fn(),
    toggleCollaborativeMutate: vi.fn(),
    onDelete: vi.fn(),
    onSearch: vi.fn(),
    ...overrides,
  };
}

beforeEach(() => vi.clearAllMocks());

describe("useCommandPalette", () => {
  it("starts with palette closed", () => {
    const { result } = renderHook(() => useCommandPalette(makeOpts()));
    expect(result.current.paletteOpen).toBe(false);
  });

  it("Ctrl+K opens the palette", () => {
    const { result } = renderHook(() => useCommandPalette(makeOpts()));
    act(() => {
      document.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "k",
          ctrlKey: true,
        })
      );
    });
    expect(result.current.paletteOpen).toBe(true);
  });

  it("Ctrl+K a second time closes the palette", () => {
    const { result } = renderHook(() => useCommandPalette(makeOpts()));
    act(() => {
      document.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "k",
          ctrlKey: true,
        })
      );
    });
    act(() => {
      document.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "k",
          ctrlKey: true,
        })
      );
    });
    expect(result.current.paletteOpen).toBe(false);
  });

  it("Ctrl+F calls onSearch", () => {
    const onSearch = vi.fn();
    renderHook(() => useCommandPalette(makeOpts({ onSearch })));
    act(() => {
      document.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "f",
          ctrlKey: true,
        })
      );
    });
    expect(onSearch).toHaveBeenCalledTimes(1);
  });

  it("paletteActions contains core action ids", () => {
    const { result } = renderHook(() => useCommandPalette(makeOpts()));
    const ids = result.current.paletteActions.map((a) => a.id);
    expect(ids).toContain("search");
    expect(ids).toContain("add-item");
    expect(ids).toContain("toggle-view");
    expect(ids).toContain("random-item");
    expect(ids).toContain("share");
    expect(ids).toContain("export");
    expect(ids).toContain("toggle-public");
    expect(ids).toContain("toggle-collaborative");
    expect(ids).toContain("rename");
    expect(ids).toContain("filter-all");
    expect(ids).toContain("filter-pending");
    expect(ids).toContain("filter-done");
    expect(ids).toContain("delete-list");
  });

  it("hides owner-only actions when not owner", () => {
    const { result } = renderHook(() =>
      useCommandPalette(makeOpts({ isOwner: false }))
    );
    const ids = result.current.paletteActions.map((a) => a.id);
    expect(ids).not.toContain("toggle-public");
    expect(ids).not.toContain("toggle-collaborative");
    expect(ids).not.toContain("rename");
    expect(ids).not.toContain("delete-list");
  });

  it("toggle-view flips list↔map", () => {
    const setViewMode = vi.fn();
    const { result } = renderHook(() =>
      useCommandPalette(makeOpts({ viewMode: "list", setViewMode }))
    );
    const action = result.current.paletteActions.find(
      (a) => a.id === "toggle-view"
    );
    action?.onSelect();
    expect(setViewMode).toHaveBeenCalledWith("map");
  });

  it("toggle-collaborative flips the flag", () => {
    const toggleCollaborativeMutate = vi.fn();
    const { result } = renderHook(() =>
      useCommandPalette(
        makeOpts({
          list: { ...LIST, collaborative: false },
          toggleCollaborativeMutate,
        })
      )
    );
    const action = result.current.paletteActions.find(
      (a) => a.id === "toggle-collaborative"
    );
    action?.onSelect();
    expect(toggleCollaborativeMutate).toHaveBeenCalledWith(true);
  });

  it("delete-list calls onDelete", () => {
    const onDelete = vi.fn();
    const { result } = renderHook(() =>
      useCommandPalette(makeOpts({ onDelete }))
    );
    const action = result.current.paletteActions.find(
      (a) => a.id === "delete-list"
    );
    action?.onSelect();
    expect(onDelete).toHaveBeenCalledOnce();
  });

  it("includes place filter actions for each place", () => {
    const { result } = renderHook(() =>
      useCommandPalette(makeOpts({ allPlaces: ["madrid", "sevilla"] }))
    );
    const ids = result.current.paletteActions.map((a) => a.id);
    expect(ids).toContain("filter-place-madrid");
    expect(ids).toContain("filter-place-sevilla");
  });

  it("clear-all-filters appears only when a filter is active", () => {
    const { result: noFilters } = renderHook(() =>
      useCommandPalette(makeOpts())
    );
    expect(noFilters.current.paletteActions.map((a) => a.id)).not.toContain(
      "clear-all-filters"
    );

    const { result: withTag } = renderHook(() =>
      useCommandPalette(makeOpts({ activeTag: "work" }))
    );
    expect(withTag.current.paletteActions.map((a) => a.id)).toContain(
      "clear-all-filters"
    );

    const { result: withStatus } = renderHook(() =>
      useCommandPalette(makeOpts({ statusFilter: "pending" }))
    );
    expect(withStatus.current.paletteActions.map((a) => a.id)).toContain(
      "clear-all-filters"
    );
  });

  it("clear-all-filters resets tag, place and status", () => {
    const setActiveTag = vi.fn();
    const setActivePlace = vi.fn();
    const setStatusFilter = vi.fn();
    const { result } = renderHook(() =>
      useCommandPalette(
        makeOpts({
          activeTag: "work",
          activePlace: "madrid",
          statusFilter: "pending",
          setActiveTag,
          setActivePlace,
          setStatusFilter,
        })
      )
    );
    result.current.paletteActions
      .find((a) => a.id === "clear-all-filters")
      ?.onSelect();
    expect(setActiveTag).toHaveBeenCalledWith(null);
    expect(setActivePlace).toHaveBeenCalledWith(undefined);
    expect(setStatusFilter).toHaveBeenCalledWith("all");
  });

  it("Ctrl+K stops propagation so the global listener doesn't also fire", () => {
    const globalHandler = vi.fn();
    document.addEventListener("keydown", globalHandler);
    renderHook(() => useCommandPalette(makeOpts()));
    act(() => {
      document.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "k",
          ctrlKey: true,
          cancelable: true,
        })
      );
    });
    expect(globalHandler).not.toHaveBeenCalled();
    document.removeEventListener("keydown", globalHandler);
  });

  it("includes tag filter actions for each tag", () => {
    const { result } = renderHook(() =>
      useCommandPalette(makeOpts({ allTags: ["work", "personal"] }))
    );
    const ids = result.current.paletteActions.map((a) => a.id);
    expect(ids).toContain("filter-work");
    expect(ids).toContain("filter-personal");
  });

  it("includes clear-filter action when a tag is active", () => {
    const { result } = renderHook(() =>
      useCommandPalette(makeOpts({ allTags: ["work"], activeTag: "work" }))
    );
    const ids = result.current.paletteActions.map((a) => a.id);
    expect(ids).toContain("clear-filter");
  });

  it("setPaletteOpen controls palette visibility", () => {
    const { result } = renderHook(() => useCommandPalette(makeOpts()));
    act(() => {
      result.current.setPaletteOpen(true);
    });
    expect(result.current.paletteOpen).toBe(true);
  });
});
