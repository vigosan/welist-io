import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import type React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { queryKeys } from "@/lib/query-keys";

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

function renderWithClient(enabled: boolean) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const invalidateSpy = vi.spyOn(qc, "invalidateQueries");
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  const result = renderHook(() => useListRealtime(LIST_ID, enabled), {
    wrapper,
  });
  return { qc, invalidateSpy, ...result };
}

beforeEach(() => {
  FakeEventSource.instances = [];
  vi.stubGlobal("EventSource", FakeEventSource);
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

  it("invalidates the items and list queries on list-changed", () => {
    const { invalidateSpy } = renderWithClient(true);
    const [es] = FakeEventSource.instances;

    act(() => {
      es.dispatch("list-changed", { listId: LIST_ID });
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.items(LIST_ID),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.list(LIST_ID),
    });
  });

  it("closes the EventSource on unmount", () => {
    const { unmount } = renderWithClient(true);
    const [es] = FakeEventSource.instances;
    expect(es.closed).toBe(false);
    unmount();
    expect(es.closed).toBe(true);
  });
});
