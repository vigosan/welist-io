import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { List } from "@/db/schema";
import { useListHeader } from "./useListHeader";

vi.mock("./useList", () => ({
  useList: vi.fn(),
  useUpdateName: vi.fn(),
  useUpdateSlug: vi.fn(),
  useUpdateDescription: vi.fn(),
  useTogglePublic: vi.fn(),
}));

vi.mock("@/i18n/service", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

import {
  useList,
  useTogglePublic,
  useUpdateDescription,
  useUpdateName,
  useUpdateSlug,
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
    mutate: vi.fn(),
    isPending: false,
  } as never);
  vi.mocked(useUpdateSlug).mockReturnValue({
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
    const { result } = renderHook(() =>
      useListHeader({
        listId: "l1",
        onSlugUpdated: vi.fn(),
      })
    );
    expect(result.current.editingName).toBe(false);
    expect(result.current.editingSlug).toBe(false);
    expect(result.current.editingDescription).toBe(false);
  });

  it("startEditingSlug opens slug edit with current value", () => {
    setupMocks();
    const { result } = renderHook(() =>
      useListHeader({
        listId: "l1",
        onSlugUpdated: vi.fn(),
      })
    );
    act(() => {
      result.current.startEditingSlug();
    });
    expect(result.current.editingSlug).toBe(true);
    expect(result.current.slugValue).toBe("mi-lista");
  });

  it("handleSlugSubmit calls updateSlug.mutate with trimmed value", async () => {
    const mutateFn = vi.fn();
    setupMocks(mutateFn);
    const { result } = renderHook(() =>
      useListHeader({
        listId: "l1",
        onSlugUpdated: vi.fn(),
      })
    );
    act(() => {
      result.current.setSlugValue("nuevo-slug");
    });
    await waitFor(() => expect(result.current.slugValue).toBe("nuevo-slug"));
    act(() => {
      result.current.handleSlugSubmit({
        preventDefault: vi.fn(),
      } as never);
    });
    expect(mutateFn).toHaveBeenCalledWith("nuevo-slug", expect.any(Object));
  });

  it("handleSlugSubmit does not call mutate when value matches current slug", async () => {
    const mutateFn = vi.fn();
    setupMocks(mutateFn);
    const { result } = renderHook(() =>
      useListHeader({
        listId: "l1",
        onSlugUpdated: vi.fn(),
      })
    );
    act(() => {
      result.current.setSlugValue("mi-lista");
    });
    await waitFor(() => expect(result.current.slugValue).toBe("mi-lista"));
    act(() => {
      result.current.handleSlugSubmit({
        preventDefault: vi.fn(),
      } as never);
    });
    expect(mutateFn).not.toHaveBeenCalled();
  });

  it("sets slugError.taken when server returns slug_taken", async () => {
    let capturedOnError: ((err: unknown) => void) | undefined;
    const mutateFn = vi.fn(
      (_val: string, callbacks: { onError: (err: unknown) => void }) => {
        capturedOnError = callbacks.onError;
      }
    );
    setupMocks(mutateFn);

    const { result } = renderHook(() =>
      useListHeader({
        listId: "l1",
        onSlugUpdated: vi.fn(),
      })
    );
    act(() => {
      result.current.setSlugValue("taken");
    });
    await waitFor(() => expect(result.current.slugValue).toBe("taken"));
    act(() => {
      result.current.handleSlugSubmit({
        preventDefault: vi.fn(),
      } as never);
    });
    expect(capturedOnError).toBeDefined();

    const mockResponse = {
      json: () => Promise.resolve({ error: "slug_taken" }),
    } as Response;
    const err = Object.assign(new Error("conflict"), {
      response: mockResponse,
    });
    await act(async () => {
      // biome-ignore lint/style/noNonNullAssertion: captured in mock callback above
      await capturedOnError!(err);
    });

    expect(result.current.slugError).toBe("slugError.taken");
  });

  it("clears the share timeout on unmount", () => {
    vi.useFakeTimers();
    const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout");
    setupMocks();
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
    const { result, unmount } = renderHook(() =>
      useListHeader({ listId: "l1", onSlugUpdated: vi.fn() })
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

  it("sets slugError.saveFailed on generic error", async () => {
    let capturedOnError: ((err: unknown) => void) | undefined;
    const mutateFn = vi.fn(
      (_val: string, callbacks: { onError: (err: unknown) => void }) => {
        capturedOnError = callbacks.onError;
      }
    );
    setupMocks(mutateFn);

    const { result } = renderHook(() =>
      useListHeader({
        listId: "l1",
        onSlugUpdated: vi.fn(),
      })
    );
    act(() => {
      result.current.setSlugValue("otro");
    });
    await waitFor(() => expect(result.current.slugValue).toBe("otro"));
    act(() => {
      result.current.handleSlugSubmit({
        preventDefault: vi.fn(),
      } as never);
    });

    await act(async () => {
      // biome-ignore lint/style/noNonNullAssertion: captured in mock callback above
      await capturedOnError!(new Error("network"));
    });

    expect(result.current.slugError).toBe("slugError.saveFailed");
  });
});
