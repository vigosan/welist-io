import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ActiveParticipants } from "./ActiveParticipants";

describe("ActiveParticipants", () => {
  it("renders nothing when total is 0", () => {
    const { container } = render(
      <ActiveParticipants participants={[]} total={0} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders one avatar per participant", () => {
    render(
      <ActiveParticipants
        participants={[
          { id: "u1", name: "Alice", image: null },
          { id: "u2", name: "Bob", image: "https://x/y.png" },
        ]}
        total={2}
      />
    );
    expect(screen.getByTestId("active-participant-u1")).toBeInTheDocument();
    expect(screen.getByTestId("active-participant-u2")).toBeInTheDocument();
  });

  it("shows '+N' chip when total exceeds participants length", () => {
    render(
      <ActiveParticipants
        participants={[
          { id: "u1", name: "Alice", image: null },
          { id: "u2", name: "Bob", image: null },
          { id: "u3", name: "Carol", image: null },
          { id: "u4", name: "Dan", image: null },
          { id: "u5", name: "Eve", image: null },
        ]}
        total={12}
      />
    );
    expect(screen.getByTestId("active-participants-overflow").textContent).toBe(
      "+7"
    );
  });

  it("does not render overflow chip when total equals shown count", () => {
    render(
      <ActiveParticipants
        participants={[
          { id: "u1", name: "Alice", image: null },
          { id: "u2", name: "Bob", image: null },
        ]}
        total={2}
      />
    );
    expect(
      screen.queryByTestId("active-participants-overflow")
    ).not.toBeInTheDocument();
  });
});
