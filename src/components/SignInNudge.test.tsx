import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@hono/auth-js/react", () => ({
  signIn: vi.fn(),
}));

import { signIn } from "@hono/auth-js/react";
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

  it("calls signIn with google when the CTA is clicked", async () => {
    render(<SignInNudge storageKey="l1" />);
    await userEvent.click(screen.getByTestId("signin-nudge-cta"));
    expect(signIn).toHaveBeenCalledWith("google");
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
