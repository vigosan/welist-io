import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { routeTree } from "@/routeTree.gen";
import type { FeedItem } from "@/services/lists.service";

vi.mock("@/hooks/useList");
vi.mock("@hono/auth-js/react", () => ({
  useSession: vi.fn(),
  signIn: vi.fn(),
}));

import { useSession } from "@hono/auth-js/react";
import { useFeed } from "@/hooks/useList";

const ITEM: FeedItem = {
  id: "a1",
  action: "challenge_completed",
  createdAt: new Date("2024-01-01").toISOString(),
  listId: "l1",
  listName: "Cine",
  listSlug: "cine",
  newValue: null,
  actorId: "u2",
  actorName: "Ana",
  actorImage: null,
};

function setupMocks({
  items = [ITEM],
  sessionUser = { id: "u1" } as { id: string } | null,
}: {
  items?: FeedItem[];
  sessionUser?: { id: string } | null;
} = {}) {
  vi.mocked(useSession).mockReturnValue({
    data: sessionUser ? { user: sessionUser, expires: "" } : null,
    status: sessionUser ? "authenticated" : "unauthenticated",
    update: vi.fn(),
  } as never);
  vi.mocked(useFeed).mockReturnValue({
    data: { pages: [{ items, nextCursor: null }], pageParams: [] },
    isLoading: false,
    isFetchingNextPage: false,
    hasNextPage: false,
    fetchNextPage: vi.fn(),
  } as never);
}

function renderFeed() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const history = createMemoryHistory({ initialEntries: ["/feed"] });
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

beforeEach(() => vi.clearAllMocks());

describe("FeedPage", () => {
  it("prompts to sign in when logged out so the feed has a clear entry point", async () => {
    setupMocks({ sessionUser: null });
    renderFeed();
    await waitFor(() =>
      expect(
        screen.getByText(/entra para ver la actividad/i)
      ).toBeInTheDocument()
    );
  });

  it("renders a row per activity item for a logged-in user", async () => {
    setupMocks();
    renderFeed();
    await waitFor(() =>
      expect(screen.getByTestId("feed-row-a1")).toBeInTheDocument()
    );
  });
});
