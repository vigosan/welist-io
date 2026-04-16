import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { routeTree } from "@/routeTree.gen";
import type { ExploreItem } from "@/services/lists.service";

vi.mock("@/hooks/useList");
vi.mock("@hono/auth-js/react", () => ({
  useSession: vi.fn(),
  signIn: vi.fn(),
}));

import { signIn, useSession } from "@hono/auth-js/react";
import {
  useAcceptChallenge,
  useExplore,
  useExploreDetail,
  useExploreItems,
} from "@/hooks/useList";

const EXPLORE_A: ExploreItem = {
  id: "e1",
  name: "Lista Explorar A",
  slug: null,
  description: null,
  createdAt: new Date(),
  itemCount: 5,
  participantCount: 3,
  completedCount: 1,
  owner: null,
};
const EXPLORE_B: ExploreItem = {
  id: "e2",
  name: "Lista Explorar B",
  slug: "lista-b",
  description: "Desc",
  createdAt: new Date(),
  itemCount: 2,
  participantCount: 0,
  completedCount: 0,
  owner: null,
};

function renderPage() {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  const history = createMemoryHistory({
    initialEntries: ["/explore"],
  });
  const router = createRouter({
    routeTree,
    history,
    context: { queryClient: qc },
  });
  return render(
    <QueryClientProvider client={qc}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}

function setupMocks({
  lists = [EXPLORE_A, EXPLORE_B],
  isLoading = false,
  sessionUser = null as { id: string } | null,
  acceptMutate = vi.fn(),
}: {
  lists?: ExploreItem[];
  isLoading?: boolean;
  sessionUser?: { id: string } | null;
  acceptMutate?: ReturnType<typeof vi.fn>;
} = {}) {
  vi.mocked(useSession).mockReturnValue({
    data: sessionUser ? { user: sessionUser, expires: "" } : null,
    status: sessionUser ? "authenticated" : "unauthenticated",
    update: vi.fn(),
  } as never);
  vi.mocked(useExplore).mockReturnValue({
    data: {
      pages: [{ items: lists, nextCursor: null }],
      pageParams: [],
    },
    isLoading,
    isFetchingNextPage: false,
    hasNextPage: false,
    fetchNextPage: vi.fn(),
  } as never);
  vi.mocked(useExploreDetail).mockReturnValue({
    data: undefined,
    isLoading: false,
  } as never);
  vi.mocked(useExploreItems).mockReturnValue({
    data: [],
    isLoading: false,
  } as never);
  vi.mocked(useAcceptChallenge).mockReturnValue({
    mutate: acceptMutate,
    isPending: false,
  } as never);
}

beforeEach(() => vi.clearAllMocks());

describe("ExplorePage", () => {
  it("renders a card for each public list", async () => {
    setupMocks();
    renderPage();
    await waitFor(() =>
      expect(screen.getByText("Lista Explorar A")).toBeInTheDocument()
    );
    expect(screen.getByText("Lista Explorar B")).toBeInTheDocument();
  });

  it("shows empty state when there are no lists", async () => {
    setupMocks({ lists: [] });
    renderPage();
    await waitFor(() =>
      expect(screen.queryByTestId("accept-btn-e1")).not.toBeInTheDocument()
    );
  });

  it("accept button calls acceptChallenge.mutate when logged in", async () => {
    const acceptMutate = vi.fn();
    setupMocks({ sessionUser: { id: "u1" }, acceptMutate });
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId("accept-btn-e1")).toBeInTheDocument()
    );
    await userEvent.click(screen.getByTestId("accept-btn-e1"));
    expect(acceptMutate).toHaveBeenCalledWith("e1", expect.any(Object));
  });

  it("accept button calls signIn when not logged in", async () => {
    setupMocks({ sessionUser: null });
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId("accept-btn-e1")).toBeInTheDocument()
    );
    await userEvent.click(screen.getByTestId("accept-btn-e1"));
    expect(signIn).toHaveBeenCalledWith("google");
  });

  it("accept error navigates to list when already participating", async () => {
    let capturedOnError: ((err: Error) => void) | undefined;
    const acceptMutate = vi.fn(
      (_id: string, callbacks: { onError: (err: Error) => void }) => {
        capturedOnError = callbacks.onError;
      }
    );
    setupMocks({ sessionUser: { id: "u1" }, acceptMutate });

    const qc = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    const history = createMemoryHistory({ initialEntries: ["/explore"] });
    const router = createRouter({
      routeTree,
      history,
      context: { queryClient: qc },
    });
    render(
      <QueryClientProvider client={qc}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    );

    await waitFor(() =>
      expect(screen.getByTestId("accept-btn-e1")).toBeInTheDocument()
    );
    await userEvent.click(screen.getByTestId("accept-btn-e1"));
    expect(capturedOnError).toBeDefined();
    // biome-ignore lint/style/noNonNullAssertion: captured in mock callback above
    capturedOnError!(new Error("Already participating"));
    expect(router.state.location.pathname).toBe("/lists/e1");
  });
});
