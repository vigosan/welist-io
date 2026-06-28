import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { List } from "@/db/schema";
import { useListHeader } from "./useListHeader";

vi.mock("./useList", () => ({
  useList: vi.fn(),
  useUpdateName: vi.fn(),
  useUpdateDescription: vi.fn(),
  useTogglePublic: vi.fn(),
}));

import {
  useList,
  useTogglePublic,
  useUpdateDescription,
  useUpdateName,
} from "./useList";

const LIST: List = {
  id: "l1",
  name: "Mi lista",
  slug: "mi-lista",
  description: null,
  category: null,
  public: false,
  collaborative: false,
  ownerId: null,
  forkedFromId: null,
  completedAt: null,
  createdAt: new Date(),
};

function setupMocks(mutateFn = vi.fn()) {
  vi.mocked(useList).mockReturnValue({
    data: LIST,
    isLoading: false,
    refetch: vi.fn(),
  } as never);
  vi.mocked(useUpdateName).mockReturnValue({
    mutate: mutateFn,
    isPending: false,
  } as never);
  vi.mocked(useUpdateDescription).mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
  } as never);
  vi.mocked(useTogglePublic).mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
  } as never);
}

beforeEach(() => vi.clearAllMocks());

describe("useListHeader", () => {
  it("starts with all editing states false", () => {
    setupMocks();
    const { result } = renderHook(() => useListHeader({ listId: "l1" }));
    expect(result.current.editingName).toBe(false);
    expect(result.current.editingDescription).toBe(false);
  });

  it("clears the share timeout on unmount", () => {
    vi.useFakeTimers();
    const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout");
    setupMocks();
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
    const { result, unmount } = renderHook(() =>
      useListHeader({ listId: "l1" })
    );
    act(() => {
      result.current.handleShare();
    });
    expect(result.current.copied).toBe(true);
    unmount();
    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
    vi.useRealTimers();
  });
});
