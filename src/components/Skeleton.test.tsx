import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Skeleton } from "./Skeleton";

describe("Skeleton", () => {
  it("renders with the default block variant", () => {
    render(<Skeleton data-testid="sk" />);
    const el = screen.getByTestId("sk");
    expect(el.className).toContain("rounded-2xl");
    expect(el.className).toContain("animate-pulse");
  });

  it("supports text variant with rounded-md", () => {
    render(<Skeleton data-testid="sk" variant="text" />);
    expect(screen.getByTestId("sk").className).toContain("rounded-md");
  });

  it("supports circle variant with rounded-full", () => {
    render(<Skeleton data-testid="sk" variant="circle" />);
    expect(screen.getByTestId("sk").className).toContain("rounded-full");
  });

  it("merges additional className", () => {
    render(<Skeleton data-testid="sk" className="h-4 w-20" />);
    const el = screen.getByTestId("sk");
    expect(el.className).toContain("h-4");
    expect(el.className).toContain("w-20");
  });

  it("is hidden from assistive tech", () => {
    render(<Skeleton data-testid="sk" />);
    expect(screen.getByTestId("sk")).toHaveAttribute("aria-hidden", "true");
  });
});
