import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { routeTree } from "@/routeTree.gen";

vi.mock("@/hooks/useList");
vi.mock("@hono/auth-js/react", () => ({
  useSession: vi.fn(),
  signIn: vi.fn(),
}));

import { useSession } from "@hono/auth-js/react";
import {
  useAcceptChallenge,
  useExplore,
  useExploreDetail,
  useExploreItems,
  useForkList,
} from "@/hooks/useList";

function renderDetailPage(listId = "list-detail-1") {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  const history = createMemoryHistory({
    initialEntries: [`/explore/${listId}`],
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

function setupBaseMocks() {
  vi.mocked(useSession).mockReturnValue({
    data: null,
    status: "unauthenticated",
    update: vi.fn(),
  } as never);
  vi.mocked(useExplore).mockReturnValue({
    data: { pages: [{ items: [], nextCursor: null }], pageParams: [] },
    isLoading: false,
    isFetchingNextPage: false,
    hasNextPage: false,
    fetchNextPage: vi.fn(),
  } as never);
  vi.mocked(useAcceptChallenge).mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
  } as never);
  vi.mocked(useForkList).mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
  } as never);
  vi.mocked(useExploreItems).mockReturnValue({
    data: [],
    isLoading: false,
  } as never);
}

beforeEach(() => vi.clearAllMocks());

describe("ExploreDetailPage", () => {
  it("renders loading skeleton while detail is loading", async () => {
    setupBaseMocks();
    vi.mocked(useExploreDetail).mockReturnValue({
      data: undefined,
      isLoading: true,
    } as never);

    renderDetailPage();

    await waitFor(() => {
      expect(screen.getAllByTestId("skeleton").length).toBeGreaterThan(0);
    });
    expect(
      screen.queryByTestId("accept-challenge-btn")
    ).not.toBeInTheDocument();
  });

  it("hides the challengers panel by default and toggles it via the avatar stack", async () => {
    setupBaseMocks();
    vi.mocked(useExploreDetail).mockReturnValue({
      data: {
        id: "list-detail-1",
        name: "Lista Detalle",
        slug: null,
        description: "Una descripción",
        itemCount: 3,
        participantCount: 2,
        ownerId: "owner-1",
        owner: { name: "Ana", image: "https://example.com/ana.jpg" },
        challengers: [
          {
            id: "ana",
            name: "Ana",
            image: "https://example.com/ana.jpg",
            completedAt: null,
            doneCount: 1,
            totalItems: 3,
          },
          {
            id: "bob",
            name: "Bob",
            image: null,
            completedAt: null,
            doneCount: 0,
            totalItems: 3,
          },
        ],
        completedParticipants: [],
      },
      isLoading: false,
    } as never);

    renderDetailPage();

    await waitFor(() =>
      expect(screen.getByText("Lista Detalle")).toBeInTheDocument()
    );
    expect(screen.queryByText("2 retadores")).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId("challengers-toggle"));
    expect(screen.getByText("2 retadores")).toBeInTheDocument();
    expect(screen.getByText("1/3")).toBeInTheDocument();
    expect(screen.getByText("0/3")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("challengers-toggle"));
    expect(screen.queryByText("2 retadores")).not.toBeInTheDocument();
  });

  it("shows a fork button to a logged-in non-owner and forks on click", async () => {
    setupBaseMocks();
    vi.mocked(useSession).mockReturnValue({
      data: { user: { id: "viewer" }, expires: "" },
      status: "authenticated",
      update: vi.fn(),
    } as never);
    const forkMutate = vi.fn();
    vi.mocked(useForkList).mockReturnValue({
      mutate: forkMutate,
      isPending: false,
    } as never);
    vi.mocked(useExploreDetail).mockReturnValue({
      data: {
        id: "list-detail-1",
        name: "Lista Detalle",
        slug: null,
        description: null,
        ownerId: "owner-1",
        owner: { name: "Ana", image: null },
        forkedFrom: null,
        itemCount: 1,
        participantCount: 0,
        challengers: [],
        completedParticipants: [],
      },
      isLoading: false,
    } as never);

    renderDetailPage();

    await waitFor(() =>
      expect(screen.getByTestId("fork-list-btn")).toBeInTheDocument()
    );
    fireEvent.click(screen.getByTestId("fork-list-btn"));
    expect(forkMutate).toHaveBeenCalledTimes(1);
  });

  it("does not show the fork button to the list owner", async () => {
    setupBaseMocks();
    vi.mocked(useSession).mockReturnValue({
      data: { user: { id: "owner-1" }, expires: "" },
      status: "authenticated",
      update: vi.fn(),
    } as never);
    vi.mocked(useExploreDetail).mockReturnValue({
      data: {
        id: "list-detail-1",
        name: "Lista Detalle",
        slug: null,
        description: null,
        ownerId: "owner-1",
        owner: { name: "Ana", image: null },
        forkedFrom: null,
        itemCount: 1,
        participantCount: 0,
        challengers: [],
        completedParticipants: [],
      },
      isLoading: false,
    } as never);

    renderDetailPage();

    await waitFor(() =>
      expect(screen.getByText("Lista Detalle")).toBeInTheDocument()
    );
    expect(screen.queryByTestId("fork-list-btn")).not.toBeInTheDocument();
  });

  it("shows forked-from attribution when the list is a fork", async () => {
    setupBaseMocks();
    vi.mocked(useExploreDetail).mockReturnValue({
      data: {
        id: "list-detail-1",
        name: "Mi versión",
        slug: null,
        description: null,
        ownerId: "owner-1",
        owner: { name: "Ana", image: null },
        forkedFrom: { id: "src", name: "Original", slug: "original" },
        itemCount: 1,
        participantCount: 0,
        challengers: [],
        completedParticipants: [],
      },
      isLoading: false,
    } as never);

    renderDetailPage();

    await waitFor(() =>
      expect(screen.getByTestId("forked-from-link")).toBeInTheDocument()
    );
  });
});
