import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { WeeklyMissions } from "./WeeklyMissions";

describe("WeeklyMissions", () => {
  it("renders one row per mission with progress and target", () => {
    render(
      <WeeklyMissions
        missions={[
          { type: "complete_5_items", progress: 4, target: 5 },
          { type: "accept_2_lists", progress: 0, target: 2 },
        ]}
      />
    );
    expect(
      screen.getByTestId("mission-complete_5_items").textContent
    ).toContain("4 / 5");
    expect(screen.getByTestId("mission-accept_2_lists").textContent).toContain(
      "0 / 2"
    );
  });

  it("clamps progress to target in the displayed counter", () => {
    render(
      <WeeklyMissions
        missions={[{ type: "complete_5_items", progress: 9, target: 5 }]}
      />
    );
    expect(
      screen.getByTestId("mission-complete_5_items").textContent
    ).toContain("5 / 5");
  });

  it("marks completed missions with data-completed", () => {
    render(
      <WeeklyMissions
        missions={[{ type: "accept_2_lists", progress: 2, target: 2 }]}
      />
    );
    expect(
      screen
        .getByTestId("mission-accept_2_lists")
        .getAttribute("data-completed")
    ).toBe("true");
  });
});
