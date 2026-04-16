import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("@hono/auth-js/react", () => ({
  signIn: vi.fn(),
  signOut: vi.fn(),
  useSession: vi.fn(),
}));

vi.mock("@/hooks/useCachedSession", () => ({
  useCachedSession: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    ...props
  }: React.PropsWithChildren<Record<string, unknown>>) => (
    <a {...props}>{children}</a>
  ),
}));

import { signIn, signOut } from "@hono/auth-js/react";
import { useCachedSession } from "@/hooks/useCachedSession";
import { UserMenu } from "./UserMenu";

describe("UserMenu", () => {
  it("renders translated menu items for logged-in user", async () => {
    vi.mocked(useCachedSession).mockReturnValue({
      data: {
        user: { id: "u1", name: "Ana", image: null },
        expires: "",
      },
      status: "authenticated",
      update: vi.fn(),
    } as never);

    render(<UserMenu />);

    await userEvent.click(screen.getByTestId("user-avatar-btn"));

    expect(screen.getByText("Mis listas")).toBeInTheDocument();
    expect(screen.getByText("Configuración")).toBeInTheDocument();
    expect(screen.getByTestId("sign-out-btn")).toHaveTextContent(
      "Cerrar sesión"
    );
  });

  it("calls signOut when sign-out button is clicked", async () => {
    vi.mocked(useCachedSession).mockReturnValue({
      data: {
        user: { id: "u1", name: "Ana", image: null },
        expires: "",
      },
      status: "authenticated",
      update: vi.fn(),
    } as never);

    render(<UserMenu />);
    await userEvent.click(screen.getByTestId("user-avatar-btn"));
    await userEvent.click(screen.getByTestId("sign-out-btn"));

    expect(signOut).toHaveBeenCalledOnce();
  });

  it("renders sign-in button when not logged in", () => {
    vi.mocked(useCachedSession).mockReturnValue({
      data: null,
      status: "unauthenticated",
      update: vi.fn(),
    } as never);

    render(<UserMenu />);

    expect(screen.getByTestId("sign-in-btn")).toHaveTextContent(
      "Iniciar sesión"
    );
  });

  it("calls signIn when sign-in button is clicked", async () => {
    vi.mocked(useCachedSession).mockReturnValue({
      data: null,
      status: "unauthenticated",
      update: vi.fn(),
    } as never);

    render(<UserMenu />);
    await userEvent.click(screen.getByTestId("sign-in-btn"));

    expect(signIn).toHaveBeenCalledWith("google");
  });
});
