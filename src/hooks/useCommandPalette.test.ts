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
    activeTag: undefined,
    addInputRef: { current: null },
    handleShare: vi.fn(),
    setActiveTag: vi.fn(),
    setStatusFilter: vi.fn(),
    setNameValue: vi.fn(),
    setEditingName: vi.fn(),
    togglePublicMutate: vi.fn(),
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
    expect(ids).toContain("share");
    expect(ids).toContain("toggle-public");
    expect(ids).toContain("rename");
    expect(ids).toContain("filter-all");
    expect(ids).toContain("filter-pending");
    expect(ids).toContain("filter-done");
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
