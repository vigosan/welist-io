import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/useList");

import { useDuel } from "@/hooks/useList";
import { DuelPanel } from "./DuelPanel";

const OPPONENTS = [
  { id: "u2", name: "Rival", image: null },
  { id: "u3", name: "Otro", image: null },
];

beforeEach(() => vi.clearAllMocks());

describe("DuelPanel", () => {
  it("renders nothing without opponents", () => {
    vi.mocked(useDuel).mockReturnValue({ data: undefined } as never);
    const { container } = render(<DuelPanel listId="l1" opponents={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("shows an opponent chip per opponent so the user can pick a rival", () => {
    vi.mocked(useDuel).mockReturnValue({ data: undefined } as never);
    render(<DuelPanel listId="l1" opponents={OPPONENTS} />);
    expect(screen.getByTestId("duel-opponent-u2")).toBeInTheDocument();
    expect(screen.getByTestId("duel-opponent-u3")).toBeInTheDocument();
    expect(screen.queryByTestId("duel-result")).not.toBeInTheDocument();
  });

  it("renders the head-to-head once a duel result is available", async () => {
    vi.mocked(useDuel).mockReturnValue({
      data: {
        totalItems: 10,
        me: { id: "u1", name: "Me", image: null, done: 7 },
        opponent: { id: "u2", name: "Rival", image: null, done: 4 },
      },
      isLoading: false,
    } as never);
    render(<DuelPanel listId="l1" opponents={OPPONENTS} />);
    await userEvent.click(screen.getByTestId("duel-opponent-u2"));
    expect(screen.getByTestId("duel-result")).toBeInTheDocument();
    expect(screen.getByText("7/10")).toBeInTheDocument();
    expect(screen.getByText("4/10")).toBeInTheDocument();
  });
});
