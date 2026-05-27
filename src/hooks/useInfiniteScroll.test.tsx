import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useInfiniteScroll } from "./useInfiniteScroll";

type IOEntry = { isIntersecting: boolean };
type IOCallback = (entries: IOEntry[]) => void;

let lastCallback: IOCallback | null = null;
const observe = vi.fn();
const disconnect = vi.fn();

beforeEach(() => {
  lastCallback = null;
  observe.mockClear();
  disconnect.mockClear();
  vi.stubGlobal(
    "IntersectionObserver",
    vi.fn((cb: IOCallback) => {
      lastCallback = cb;
      return { observe, disconnect, unobserve: vi.fn() };
    })
  );
});

function TestComponent(props: {
  hasNextPage: boolean | undefined;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
}) {
  const ref = useInfiniteScroll(props);
  return <div ref={ref} data-testid="sentinel" />;
}

describe("useInfiniteScroll", () => {
  it("observes the sentinel element on mount", () => {
    render(
      <TestComponent
        hasNextPage={true}
        isFetchingNextPage={false}
        fetchNextPage={vi.fn()}
      />
    );
    expect(observe).toHaveBeenCalledOnce();
  });

  it("calls fetchNextPage when sentinel intersects and there is a next page", () => {
    const fetchNextPage = vi.fn();
    render(
      <TestComponent
        hasNextPage={true}
        isFetchingNextPage={false}
        fetchNextPage={fetchNextPage}
      />
    );
    lastCallback?.([{ isIntersecting: true }]);
    expect(fetchNextPage).toHaveBeenCalledOnce();
  });

  it("does not call fetchNextPage when not intersecting", () => {
    const fetchNextPage = vi.fn();
    render(
      <TestComponent
        hasNextPage={true}
        isFetchingNextPage={false}
        fetchNextPage={fetchNextPage}
      />
    );
    lastCallback?.([{ isIntersecting: false }]);
    expect(fetchNextPage).not.toHaveBeenCalled();
  });

  it("does not call fetchNextPage when there is no next page", () => {
    const fetchNextPage = vi.fn();
    render(
      <TestComponent
        hasNextPage={false}
        isFetchingNextPage={false}
        fetchNextPage={fetchNextPage}
      />
    );
    lastCallback?.([{ isIntersecting: true }]);
    expect(fetchNextPage).not.toHaveBeenCalled();
  });

  it("does not call fetchNextPage while already fetching", () => {
    const fetchNextPage = vi.fn();
    render(
      <TestComponent
        hasNextPage={true}
        isFetchingNextPage={true}
        fetchNextPage={fetchNextPage}
      />
    );
    lastCallback?.([{ isIntersecting: true }]);
    expect(fetchNextPage).not.toHaveBeenCalled();
  });

  it("disconnects on unmount", () => {
    const { unmount } = render(
      <TestComponent
        hasNextPage={true}
        isFetchingNextPage={false}
        fetchNextPage={vi.fn()}
      />
    );
    unmount();
    expect(disconnect).toHaveBeenCalled();
  });
});
