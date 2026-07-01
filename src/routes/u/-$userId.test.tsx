import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { routeTree } from "@/routeTree.gen";

vi.mock("@/hooks/useList");
vi.mock("@hono/auth-js/react", () => ({
  useSession: vi.fn(() => ({ data: null, status: "unauthenticated" })),
}));

import {
  useFollowStatus,
  useToggleFollow,
  useUserProfile,
} from "@/hooks/useList";

const PROFILE = {
  id: "u1",
  name: "Alice",
  image: null,
  publicLists: [],
  completedChallenges: [],
};

function renderProfile() {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  const history = createMemoryHistory({ initialEntries: ["/u/u1"] });
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

describe("UserProfilePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useUserProfile).mockReturnValue({
      data: PROFILE,
      isLoading: false,
    } as unknown as ReturnType<typeof useUserProfile>);
    vi.mocked(useFollowStatus).mockReturnValue({
      data: { isFollowing: false, followerCount: 0, followingCount: 0 },
    } as unknown as ReturnType<typeof useFollowStatus>);
    vi.mocked(useToggleFollow).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useToggleFollow>);
  });

  it("renders the user's name", async () => {
    renderProfile();
    await waitFor(() =>
      expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument()
    );
  });
});
