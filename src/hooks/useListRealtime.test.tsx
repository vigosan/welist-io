import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import type React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { queryKeys } from "@/lib/query-keys";
import type { ItemWithLikes } from "@/services/items.service";

vi.mock("@hono/auth-js/react", () => ({
  useSession: vi.fn(),
}));

import { useSession } from "@hono/auth-js/react";
import { useListRealtime } from "./useListRealtime";

class FakeEventSource {
  static instances: FakeEventSource[] = [];
  url: string;
  closed = false;
  listeners = new Map<string, Set<(e: MessageEvent) => void>>();

  constructor(url: string) {
    this.url = url;
    FakeEventSource.instances.push(this);
  }
  addEventListener(type: string, fn: (e: MessageEvent) => void) {
    let set = this.listeners.get(type);
    if (!set) {
      set = new Set();
      this.listeners.set(type, set);
    }
    set.add(fn);
  }
  removeEventListener(type: string, fn: (e: MessageEvent) => void) {
    this.listeners.get(type)?.delete(fn);
  }
  close() {
    this.closed = true;
  }
  dispatch(type: string, data: unknown) {
    const set = this.listeners.get(type);
    if (!set) return;
    const e = { data: JSON.stringify(data) } as MessageEvent;
    for (const fn of set) fn(e);
  }
}

const LIST_ID = "list-1";

const ITEM_A: ItemWithLikes = {
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
  likeCount: 0,
  likedByMe: false,
};

const ITEM_B: ItemWithLikes = { ...ITEM_A, id: "i2", text: "Tarea B" };

function mockSession(userId: string | null) {
  vi.mocked(useSession).mockReturnValue({
    data: userId
      ? {
          user: { id: userId, name: null, email: null, image: null },
          expires: "",
        }
      : null,
    status: userId ? "authenticated" : "unauthenticated",
    update: vi.fn(),
  } as never);
}

function renderWithClient(enabled: boolean) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  qc.setQueryData<ItemWithLikes[]>(queryKeys.items(LIST_ID), [ITEM_A, ITEM_B]);
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  const result = renderHook(() => useListRealtime(LIST_ID, enabled), {
    wrapper,
  });
  return { qc, ...result };
}

beforeEach(() => {
  FakeEventSource.instances = [];
  vi.stubGlobal("EventSource", FakeEventSource);
  mockSession(null);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useListRealtime", () => {
  it("does not open an EventSource when disabled", () => {
    renderWithClient(false);
    expect(FakeEventSource.instances).toHaveLength(0);
  });

  it("opens an EventSource for the list stream when enabled", () => {
    renderWithClient(true);
    expect(FakeEventSource.instances).toHaveLength(1);
    expect(FakeEventSource.instances[0].url).toBe(
      `/api/lists/${LIST_ID}/stream`
    );
  });

  it("applies a toggle event from another user to the items query", () => {
    mockSession("me");
    const { qc } = renderWithClient(true);
    const [es] = FakeEventSource.instances;

    act(() => {
      es.dispatch("item-toggled", {
        listId: LIST_ID,
        itemId: "i1",
        done: true,
        userId: "someone-else",
      });
    });

    const items = qc.getQueryData<ItemWithLikes[]>(queryKeys.items(LIST_ID));
    expect(items?.find((i) => i.id === "i1")?.done).toBe(true);
    expect(items?.find((i) => i.id === "i2")?.done).toBe(false);
  });

  it("ignores echo events from the current user", () => {
    mockSession("me");
    const { qc } = renderWithClient(true);
    const [es] = FakeEventSource.instances;

    act(() => {
      es.dispatch("item-toggled", {
        listId: LIST_ID,
        itemId: "i1",
        done: true,
        userId: "me",
      });
    });

    const items = qc.getQueryData<ItemWithLikes[]>(queryKeys.items(LIST_ID));
    expect(items?.find((i) => i.id === "i1")?.done).toBe(false);
  });

  it("closes the EventSource on unmount", () => {
    const { unmount } = renderWithClient(true);
    const [es] = FakeEventSource.instances;
    expect(es.closed).toBe(false);
    unmount();
    expect(es.closed).toBe(true);
  });
});
