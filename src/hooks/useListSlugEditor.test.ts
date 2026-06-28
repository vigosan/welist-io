import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { List } from "@/db/schema";
import { useListSlugEditor } from "./useListSlugEditor";

vi.mock("./useList", () => ({
  useList: vi.fn(),
  useUpdateSlug: vi.fn(),
}));

vi.mock("@/i18n/service", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

import { useList, useUpdateSlug } from "./useList";

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
  vi.mocked(useUpdateSlug).mockReturnValue({
    mutate: mutateFn,
    isPending: false,
  } as never);
}

beforeEach(() => vi.clearAllMocks());

describe("useListSlugEditor", () => {
  it("starts with slug edit closed", () => {
    setupMocks();
    const { result } = renderHook(() =>
      useListSlugEditor({ listId: "l1", onSlugUpdated: vi.fn() })
    );
    expect(result.current.editingSlug).toBe(false);
  });

  it("startEditingSlug opens slug edit with current value", () => {
    setupMocks();
    const { result } = renderHook(() =>
      useListSlugEditor({ listId: "l1", onSlugUpdated: vi.fn() })
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
      useListSlugEditor({ listId: "l1", onSlugUpdated: vi.fn() })
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
      useListSlugEditor({ listId: "l1", onSlugUpdated: vi.fn() })
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
      useListSlugEditor({ listId: "l1", onSlugUpdated: vi.fn() })
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

  it("sets slugError.saveFailed on generic error", async () => {
    let capturedOnError: ((err: unknown) => void) | undefined;
    const mutateFn = vi.fn(
      (_val: string, callbacks: { onError: (err: unknown) => void }) => {
        capturedOnError = callbacks.onError;
      }
    );
    setupMocks(mutateFn);

    const { result } = renderHook(() =>
      useListSlugEditor({ listId: "l1", onSlugUpdated: vi.fn() })
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
