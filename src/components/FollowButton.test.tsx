import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@hono/auth-js/react", () => ({ useSession: vi.fn() }));
vi.mock("@/hooks/useList");

import { useSession } from "@hono/auth-js/react";
import { useFollowStatus, useToggleFollow } from "@/hooks/useList";
import { FollowButton } from "./FollowButton";

function setup({
  sessionUserId = "viewer" as string | null,
  isFollowing = false,
  followerCount = 4,
  toggleMutate = vi.fn(),
}: {
  sessionUserId?: string | null;
  isFollowing?: boolean;
  followerCount?: number;
  toggleMutate?: ReturnType<typeof vi.fn>;
} = {}) {
  vi.mocked(useSession).mockReturnValue({
    data: sessionUserId ? { user: { id: sessionUserId }, expires: "" } : null,
    status: sessionUserId ? "authenticated" : "unauthenticated",
    update: vi.fn(),
  } as never);
  vi.mocked(useFollowStatus).mockReturnValue({
    data: { isFollowing, followerCount, followingCount: 0 },
  } as never);
  vi.mocked(useToggleFollow).mockReturnValue({
    mutate: toggleMutate,
    isPending: false,
  } as never);
}

beforeEach(() => vi.clearAllMocks());

describe("FollowButton", () => {
  it("renders nothing when not logged in", () => {
    setup({ sessionUserId: null });
    render(<FollowButton userId="target" />);
    expect(screen.queryByTestId("follow-btn")).not.toBeInTheDocument();
  });

  it("renders nothing on your own profile", () => {
    setup({ sessionUserId: "me" });
    render(<FollowButton userId="me" />);
    expect(screen.queryByTestId("follow-btn")).not.toBeInTheDocument();
  });

  it("shows the follow action and follower count when not following", () => {
    setup({ isFollowing: false, followerCount: 7 });
    render(<FollowButton userId="target" />);
    expect(screen.getByTestId("follow-btn")).toHaveTextContent("Seguir");
    expect(screen.getByTestId("follow-btn")).toBeInTheDocument();
    expect(screen.getByTestId("follower-count")).toHaveTextContent("7");
  });

  it("toggles to follow (mutate false) when clicked while not following", async () => {
    const toggleMutate = vi.fn();
    setup({ isFollowing: false, toggleMutate });
    render(<FollowButton userId="target" />);
    await userEvent.click(screen.getByTestId("follow-btn"));
    expect(toggleMutate).toHaveBeenCalledWith(false);
  });

  it("shows following state and unfollows (mutate true) when clicked", async () => {
    const toggleMutate = vi.fn();
    setup({ isFollowing: true, toggleMutate });
    render(<FollowButton userId="target" />);
    expect(screen.getByTestId("follow-btn")).toHaveTextContent("Siguiendo");
    await userEvent.click(screen.getByTestId("follow-btn"));
    expect(toggleMutate).toHaveBeenCalledWith(true);
  });
});
