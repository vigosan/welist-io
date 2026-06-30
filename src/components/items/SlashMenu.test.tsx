import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SlashMenu } from "./SlashMenu";

describe("SlashMenu", () => {
  it("renders one button per action with its label", () => {
    render(<SlashMenu activeIndex={0} onSelect={() => {}} />);
    expect(screen.getByTestId("slash-action-bold")).toBeInTheDocument();
    expect(screen.getByTestId("slash-action-italic")).toBeInTheDocument();
    expect(screen.getByTestId("slash-action-code")).toBeInTheDocument();
    expect(screen.getByTestId("slash-action-link")).toBeInTheDocument();
    expect(screen.getByTestId("slash-action-place")).toBeInTheDocument();
    expect(screen.getByTestId("slash-action-tag")).toBeInTheDocument();
  });

  it("marks the active item with aria-selected", () => {
    render(<SlashMenu activeIndex={2} onSelect={() => {}} />);
    expect(screen.getByTestId("slash-action-code")).toHaveAttribute(
      "aria-selected",
      "true"
    );
    expect(screen.getByTestId("slash-action-bold")).toHaveAttribute(
      "aria-selected",
      "false"
    );
  });

  it("calls onSelect with the action when an item is clicked", () => {
    const onSelect = vi.fn();
    render(<SlashMenu activeIndex={0} onSelect={onSelect} />);
    fireEvent.click(screen.getByTestId("slash-action-link"));
    expect(onSelect).toHaveBeenCalledWith("link");
  });

  it("does not blur the input (prevents default on mousedown)", () => {
    const onSelect = vi.fn();
    render(<SlashMenu activeIndex={0} onSelect={onSelect} />);
    const ev = fireEvent.mouseDown(screen.getByTestId("slash-action-bold"));
    expect(ev).toBe(false);
  });
});
