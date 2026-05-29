import {
  render,
  screen,
  waitForElementToBeRemoved,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("@hono/auth-js/react", () => ({
  signOut: vi.fn(),
}));

vi.mock("@/hooks/useCachedSession", () => ({
  useCachedSession: vi.fn(),
}));

vi.mock("@/hooks/useTheme", () => ({
  useTheme: () => ({ theme: "light", toggle: vi.fn() }),
}));

vi.mock("@/i18n/service", () => ({
  setLanguage: vi.fn(),
  useLanguage: () => ({ language: "es" }),
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    ...props
  }: React.PropsWithChildren<Record<string, unknown>>) => (
    <a {...props}>{children}</a>
  ),
  useRouterState: () => ({ location: { pathname: "/" } }),
}));

vi.mock("./GlobalCommandPalette", () => ({
  GlobalCommandPalette: () => null,
}));

vi.mock("./NotificationBell", () => ({
  NotificationBell: () => null,
}));

vi.mock("./UserMenu", () => ({
  UserMenu: () => null,
}));

import { useCachedSession } from "@/hooks/useCachedSession";
import { AppNav } from "./AppNav";

describe("AppNav mobile menu", () => {
  it("shows a backdrop behind the menu when opened so the page is dimmed", async () => {
    vi.mocked(useCachedSession).mockReturnValue({
      data: null,
      status: "unauthenticated",
      update: vi.fn(),
    } as never);

    render(<AppNav />);

    expect(screen.queryByTestId("nav-mobile-backdrop")).not.toBeInTheDocument();

    await userEvent.click(screen.getByTestId("nav-burger"));

    expect(screen.getByTestId("nav-mobile-backdrop")).toBeInTheDocument();
  });

  it("closes the menu when the backdrop is clicked", async () => {
    vi.mocked(useCachedSession).mockReturnValue({
      data: null,
      status: "unauthenticated",
      update: vi.fn(),
    } as never);

    render(<AppNav />);

    await userEvent.click(screen.getByTestId("nav-burger"));
    expect(screen.getByTestId("nav-explore-mobile")).toBeInTheDocument();

    await userEvent.click(screen.getByTestId("nav-mobile-backdrop"));

    await waitForElementToBeRemoved(() =>
      screen.queryByTestId("nav-explore-mobile")
    );
  });

  it("animates the menu out instead of removing it abruptly on close", async () => {
    vi.mocked(useCachedSession).mockReturnValue({
      data: null,
      status: "unauthenticated",
      update: vi.fn(),
    } as never);

    render(<AppNav />);

    await userEvent.click(screen.getByTestId("nav-burger"));
    const backdrop = screen.getByTestId("nav-mobile-backdrop");

    await userEvent.click(backdrop);

    expect(backdrop).toBeInTheDocument();
    expect(backdrop).toHaveClass("opacity-0");

    await waitForElementToBeRemoved(() =>
      screen.queryByTestId("nav-mobile-backdrop")
    );
  });
});
