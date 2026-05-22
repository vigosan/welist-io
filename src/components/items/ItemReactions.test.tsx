import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ItemReactions } from "./ItemReactions";

describe("ItemReactions", () => {
  it("renders one button per supported emoji", () => {
    render(<ItemReactions reactions={[]} onReact={vi.fn()} />);
    expect(screen.getByTestId("item-reaction-👏")).toBeInTheDocument();
    expect(screen.getByTestId("item-reaction-🔥")).toBeInTheDocument();
    expect(screen.getByTestId("item-reaction-💡")).toBeInTheDocument();
  });

  it("shows count only when greater than zero", () => {
    render(
      <ItemReactions
        reactions={[{ emoji: "🔥", count: 3, mine: false }]}
        onReact={vi.fn()}
      />
    );
    expect(screen.getByTestId("item-reaction-🔥").textContent).toContain("3");
    expect(screen.getByTestId("item-reaction-👏").textContent).not.toMatch(
      /\d/
    );
  });

  it("calls onReact with the clicked emoji", async () => {
    const onReact = vi.fn();
    render(<ItemReactions reactions={[]} onReact={onReact} />);
    await userEvent.click(screen.getByTestId("item-reaction-💡"));
    expect(onReact).toHaveBeenCalledWith("💡");
  });
});
