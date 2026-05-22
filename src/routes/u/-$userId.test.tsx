import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { routeTree } from "@/routeTree.gen";
import type { UserAchievement } from "@/services/lists.service";

vi.mock("@/hooks/useList");
vi.mock("@hono/auth-js/react", () => ({
  useSession: vi.fn(() => ({ data: null, status: "unauthenticated" })),
}));

import {
  useFollowStatus,
  useToggleFollow,
  useUserAchievements,
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

describe("UserProfilePage achievements", () => {
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

  it("renders every badge in the catalog with its progress", async () => {
    const achievements: UserAchievement[] = [
      {
        type: "first_list_created",
        target: 1,
        progress: 1,
        unlockedAt: "2026-05-21T00:00:00Z",
      },
      {
        type: "ten_lists_accepted",
        target: 10,
        progress: 3,
        unlockedAt: null,
      },
      {
        type: "hundred_items_created",
        target: 100,
        progress: 42,
        unlockedAt: null,
      },
    ];
    vi.mocked(useUserAchievements).mockReturnValue({
      data: achievements,
    } as unknown as ReturnType<typeof useUserAchievements>);

    renderProfile();

    await waitFor(() =>
      expect(
        screen.getByTestId("achievement-first_list_created")
      ).toBeInTheDocument()
    );
    expect(
      screen.getByTestId("achievement-ten_lists_accepted")
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("achievement-hundred_items_created")
    ).toBeInTheDocument();
  });

  it("shows progress numbers for locked badges", async () => {
    vi.mocked(useUserAchievements).mockReturnValue({
      data: [
        {
          type: "ten_lists_accepted",
          target: 10,
          progress: 3,
          unlockedAt: null,
        },
      ],
    } as unknown as ReturnType<typeof useUserAchievements>);

    renderProfile();

    await waitFor(() =>
      expect(
        screen.getByTestId("achievement-progress-ten_lists_accepted")
      ).toHaveTextContent("3 / 10")
    );
  });

  it("marks unlocked badges with their unlocked-at date", async () => {
    vi.mocked(useUserAchievements).mockReturnValue({
      data: [
        {
          type: "first_list_created",
          target: 1,
          progress: 1,
          unlockedAt: "2026-05-21T00:00:00Z",
        },
      ],
    } as unknown as ReturnType<typeof useUserAchievements>);

    renderProfile();

    await waitFor(() => {
      const card = screen.getByTestId("achievement-first_list_created");
      expect(card).toHaveAttribute("data-unlocked", "true");
    });
  });
});
