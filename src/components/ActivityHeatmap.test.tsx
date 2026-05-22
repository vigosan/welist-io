import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ActivityHeatmap } from "./ActivityHeatmap";

const FIXED_TODAY = new Date("2026-05-22T12:00:00Z");

describe("ActivityHeatmap", () => {
  it("renders one cell per day in the 365-day window", () => {
    render(<ActivityHeatmap days={[]} today={FIXED_TODAY} />);
    const cells = screen.getAllByTestId(/^heatmap-cell-/);
    expect(cells.length).toBeGreaterThanOrEqual(365);
    expect(cells.length).toBeLessThanOrEqual(371);
  });

  it("renders a cell for today with the given count", () => {
    render(
      <ActivityHeatmap
        days={[{ date: "2026-05-22", count: 7 }]}
        today={FIXED_TODAY}
      />
    );
    const cell = screen.getByTestId("heatmap-cell-2026-05-22");
    expect(cell.getAttribute("data-count")).toBe("7");
    expect(cell.getAttribute("data-level")).toBe("3");
  });

  it("assigns level 0 to days without activity", () => {
    render(<ActivityHeatmap days={[]} today={FIXED_TODAY} />);
    const cell = screen.getByTestId("heatmap-cell-2026-05-22");
    expect(cell.getAttribute("data-level")).toBe("0");
  });

  it("groups cells in weeks of 7 columns", () => {
    render(<ActivityHeatmap days={[]} today={FIXED_TODAY} />);
    const grid = screen.getByTestId("heatmap-grid");
    const weeks = within(grid).getAllByTestId(/^heatmap-week-/);
    expect(weeks.length).toBeGreaterThanOrEqual(53);
    for (const w of weeks) {
      expect(within(w).getAllByTestId(/^heatmap-cell-/).length).toBe(7);
    }
  });
});
