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

const FEED_ITEM: FeedItem = {
  id: "l1",
  name: "Lista de Bob",
  slug: null,
  description: "Algo",
  createdAt: new Date().toISOString(),
  itemCount: 4,
  owner: { id: "u2", name: "Bob", image: null },
};

function renderPage() {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
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

function setupMocks({
  items = [FEED_ITEM] as FeedItem[],
  sessionUserId = "u1" as string | null,
}: {
  items?: FeedItem[];
  sessionUserId?: string | null;
} = {}) {
  vi.mocked(useSession).mockReturnValue({
    data: sessionUserId ? { user: { id: sessionUserId }, expires: "" } : null,
    status: sessionUserId ? "authenticated" : "unauthenticated",
    update: vi.fn(),
  } as never);
  vi.mocked(useFeed).mockReturnValue({
    data: { items },
    isLoading: false,
  } as never);
}

beforeEach(() => vi.clearAllMocks());

describe("FeedPage", () => {
  it("renders a card for each feed item when logged in", async () => {
    setupMocks();
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId("feed-item-l1")).toBeInTheDocument()
    );
    expect(screen.getByText("Lista de Bob")).toBeInTheDocument();
  });

  it("shows the empty state when there is nothing to show", async () => {
    setupMocks({ items: [] });
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId("feed-empty")).toBeInTheDocument()
    );
  });

  it("prompts to sign in when logged out", async () => {
    setupMocks({ sessionUserId: null });
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId("feed-signin")).toBeInTheDocument()
    );
  });
});
