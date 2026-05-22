import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Item } from "./useItems";
import {
  useAddItem,
  useBulkAddItems,
  useDeleteItem,
  useItems,
  useToggleItem,
  useUpdateItem,
} from "./useItems";

vi.mock("@/services/items.service", () => ({
  itemsService: {
    list: vi.fn(),
    add: vi.fn(),
    toggle: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    bulkAdd: vi.fn(),
  },
}));

import { itemsService } from "@/services/items.service";

const LIST_ID = "list-1";

const ITEM_A: Item = {
  id: "i1",
  listId: LIST_ID,
  text: "Tarea A",
  done: false,
  position: 0,
  latitude: null,
  longitude: null,
  placeName: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};
const ITEM_B: Item = {
  id: "i2",
  listId: LIST_ID,
  text: "Tarea B",
  done: true,
  position: 1,
  latitude: null,
  longitude: null,
  placeName: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  }
  return { qc, Wrapper };
}

beforeEach(() => vi.clearAllMocks());

describe("useItems", () => {
  it("returns items from itemsService.list", async () => {
    vi.mocked(itemsService.list).mockResolvedValue([ITEM_A, ITEM_B]);
    const { Wrapper } = makeWrapper();

    const { result } = renderHook(() => useItems(LIST_ID), {
      wrapper: Wrapper,
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([ITEM_A, ITEM_B]);
    expect(itemsService.list).toHaveBeenCalledWith(LIST_ID);
  });
});

describe("useToggleItem", () => {
  it("optimistically flips done before server responds", async () => {
    vi.mocked(itemsService.toggle).mockResolvedValue({
      ...ITEM_A,
      done: true,
    });
    const { qc, Wrapper } = makeWrapper();
    qc.setQueryData(["items", LIST_ID], [ITEM_A, ITEM_B]);

    const { result } = renderHook(() => useToggleItem(LIST_ID), {
      wrapper: Wrapper,
    });
    await act(async () => {
      result.current.mutate(ITEM_A.id);
    });

    const cached = qc.getQueryData<Item[]>(["items", LIST_ID]);
    expect(cached?.find((i) => i.id === ITEM_A.id)?.done).toBe(true);
  });

  it("rolls back optimistic update on error", async () => {
    vi.mocked(itemsService.toggle).mockRejectedValue(
      new Error("Network error")
    );
    const { qc, Wrapper } = makeWrapper();
    qc.setQueryData(["items", LIST_ID], [ITEM_A]);

    const { result } = renderHook(() => useToggleItem(LIST_ID), {
      wrapper: Wrapper,
    });
    act(() => {
      result.current.mutate(ITEM_A.id);
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    const cached = qc.getQueryData<Item[]>(["items", LIST_ID]);
    expect(cached?.find((i) => i.id === ITEM_A.id)?.done).toBe(false);
  });
});

describe("useDeleteItem", () => {
  it("optimistically removes the item before server responds", async () => {
    vi.mocked(itemsService.delete).mockResolvedValue(undefined);
    const { qc, Wrapper } = makeWrapper();
    qc.setQueryData(["items", LIST_ID], [ITEM_A, ITEM_B]);

    const { result } = renderHook(() => useDeleteItem(LIST_ID), {
      wrapper: Wrapper,
    });
    await act(async () => {
      result.current.mutate(ITEM_A.id);
    });

    const cached = qc.getQueryData<Item[]>(["items", LIST_ID]);
    expect(cached?.map((i) => i.id)).not.toContain(ITEM_A.id);
  });

  it("rolls back when delete fails", async () => {
    vi.mocked(itemsService.delete).mockRejectedValue(new Error("fail"));
    const { qc, Wrapper } = makeWrapper();
    qc.setQueryData(["items", LIST_ID], [ITEM_A, ITEM_B]);

    const { result } = renderHook(() => useDeleteItem(LIST_ID), {
      wrapper: Wrapper,
    });
    act(() => {
      result.current.mutate(ITEM_A.id);
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    const cached = qc.getQueryData<Item[]>(["items", LIST_ID]);
    expect(cached?.map((i) => i.id)).toContain(ITEM_A.id);
  });
});

describe("useUpdateItem", () => {
  it("optimistically updates text in cache", async () => {
    vi.mocked(itemsService.update).mockResolvedValue({
      ...ITEM_A,
      text: "Nuevo texto",
    });
    const { qc, Wrapper } = makeWrapper();
    qc.setQueryData(["items", LIST_ID], [ITEM_A]);

    const { result } = renderHook(() => useUpdateItem(LIST_ID), {
      wrapper: Wrapper,
    });
    await act(async () => {
      result.current.mutate({
        id: ITEM_A.id,
        text: "Nuevo texto",
      });
    });

    const cached = qc.getQueryData<Item[]>(["items", LIST_ID]);
    expect(cached?.find((i) => i.id === ITEM_A.id)?.text).toBe("Nuevo texto");
  });

  it("rolls back text update on error", async () => {
    vi.mocked(itemsService.update).mockRejectedValue(new Error("fail"));
    const { qc, Wrapper } = makeWrapper();
    qc.setQueryData(["items", LIST_ID], [ITEM_A]);

    const { result } = renderHook(() => useUpdateItem(LIST_ID), {
      wrapper: Wrapper,
    });
    act(() => {
      result.current.mutate({
        id: ITEM_A.id,
        text: "Nuevo texto",
      });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    const cached = qc.getQueryData<Item[]>(["items", LIST_ID]);
    expect(cached?.find((i) => i.id === ITEM_A.id)?.text).toBe("Tarea A");
  });
});

describe("useAddItem", () => {
  it("invalidates items query on success", async () => {
    vi.mocked(itemsService.add).mockResolvedValue(ITEM_A);
    const { qc, Wrapper } = makeWrapper();
    const invalidate = vi.spyOn(qc, "invalidateQueries");

    const { result } = renderHook(() => useAddItem(LIST_ID), {
      wrapper: Wrapper,
    });
    await act(async () => {
      await result.current.mutateAsync({ text: "Tarea A" });
    });

    expect(invalidate).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ["items", LIST_ID],
      })
    );
  });
});

describe("useBulkAddItems", () => {
  it("invalidates items query on success", async () => {
    vi.mocked(itemsService.bulkAdd).mockResolvedValue([ITEM_A, ITEM_B]);
    const { qc, Wrapper } = makeWrapper();
    const invalidate = vi.spyOn(qc, "invalidateQueries");

    const { result } = renderHook(() => useBulkAddItems(LIST_ID), {
      wrapper: Wrapper,
    });
    await act(async () => {
      await result.current.mutateAsync(["Tarea A", "Tarea B"]);
    });

    expect(invalidate).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ["items", LIST_ID],
      })
    );
  });
});
