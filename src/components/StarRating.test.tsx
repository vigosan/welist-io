import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { StarRatingDisplay, StarRatingInput } from "./StarRating";

describe("StarRatingDisplay", () => {
  it("shows the average and count when there are ratings", () => {
    render(<StarRatingDisplay avg={4.25} count={12} />);
    expect(screen.getByTestId("rating-avg")).toHaveTextContent("4.3");
    expect(screen.getByText("(12)")).toBeInTheDocument();
  });

  it("shows an em dash when there are no ratings", () => {
    render(<StarRatingDisplay avg={null} count={0} />);
    expect(screen.queryByTestId("rating-avg")).not.toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();
  });
});

describe("StarRatingInput", () => {
  it("calls onChange with the clicked value", async () => {
    const onChange = vi.fn();
    render(<StarRatingInput value={null} onChange={onChange} />);
    await userEvent.click(screen.getByTestId("rating-star-4"));
    expect(onChange).toHaveBeenCalledWith(4);
  });

  it("calls onClear when clicking the active value", async () => {
    const onChange = vi.fn();
    const onClear = vi.fn();
    render(<StarRatingInput value={3} onChange={onChange} onClear={onClear} />);
    await userEvent.click(screen.getByTestId("rating-star-3"));
    expect(onClear).toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("does not fire callbacks when disabled", async () => {
    const onChange = vi.fn();
    render(<StarRatingInput value={null} onChange={onChange} disabled />);
    await userEvent.click(screen.getByTestId("rating-star-1"));
    expect(onChange).not.toHaveBeenCalled();
  });
});
