import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    ...props
  }: React.PropsWithChildren<Record<string, unknown>>) => (
    <a {...props}>{children}</a>
  ),
}));

import { SignInNudge } from "./SignInNudge";

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

describe("SignInNudge", () => {
  it("renders the nudge with a sign-in call to action", () => {
    render(<SignInNudge storageKey="l1" />);
    expect(screen.getByTestId("signin-nudge")).toBeInTheDocument();
    expect(screen.getByTestId("signin-nudge-cta")).toBeInTheDocument();
  });

  it("links to /login from the CTA", () => {
    render(<SignInNudge storageKey="l1" />);
    expect(screen.getByTestId("signin-nudge-cta")).toHaveAttribute(
      "to",
      "/login"
    );
  });

  it("hides the nudge and persists dismissal when dismissed", async () => {
    render(<SignInNudge storageKey="l1" />);
    await userEvent.click(screen.getByTestId("signin-nudge-dismiss"));
    expect(screen.queryByTestId("signin-nudge")).not.toBeInTheDocument();
    expect(localStorage.getItem("signin-nudge-dismissed:l1")).toBe("1");
  });

  it("does not render when already dismissed in storage", () => {
    localStorage.setItem("signin-nudge-dismissed:l1", "1");
    render(<SignInNudge storageKey="l1" />);
    expect(screen.queryByTestId("signin-nudge")).not.toBeInTheDocument();
  });
});
