import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { routeTree } from "@/routeTree.gen";

vi.mock("@/hooks/useList");
vi.mock("@hono/auth-js/react", () => ({
  useSession: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

import { signIn, useSession } from "@hono/auth-js/react";
import { useMyLists, useSignup, useStreak } from "@/hooks/useList";

function renderLogin() {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  const history = createMemoryHistory({ initialEntries: ["/login"] });
  const router = createRouter({
    routeTree,
    history,
    context: { queryClient: qc },
  });
  return render(
    <QueryClientProvider client={qc}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}

const mutateAsync = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useSession).mockReturnValue({
    data: null,
    status: "unauthenticated",
    update: vi.fn(),
  } as never);
  vi.mocked(useSignup).mockReturnValue({
    mutateAsync,
    isPending: false,
  } as never);
  vi.mocked(useMyLists).mockReturnValue({
    data: undefined,
    isLoading: false,
    isFetchingNextPage: false,
    hasNextPage: false,
    fetchNextPage: vi.fn(),
  } as never);
  vi.mocked(useStreak).mockReturnValue({ data: undefined } as never);
  vi.mocked(signIn).mockResolvedValue({ error: null, ok: true } as never);
  mutateAsync.mockResolvedValue({ ok: true });
});

describe("LoginPage", () => {
  it("renders the email/password form and a Google button in login mode", async () => {
    renderLogin();
    await waitFor(() =>
      expect(screen.getByTestId("auth-email-input")).toBeInTheDocument()
    );
    expect(screen.getByTestId("auth-password-input")).toBeInTheDocument();
    expect(screen.getByTestId("auth-google-btn")).toBeInTheDocument();
    expect(screen.queryByTestId("auth-name-input")).not.toBeInTheDocument();
  });

  it("signs in with Google when the Google button is clicked", async () => {
    renderLogin();
    await waitFor(() =>
      expect(screen.getByTestId("auth-google-btn")).toBeInTheDocument()
    );
    await userEvent.click(screen.getByTestId("auth-google-btn"));
    expect(signIn).toHaveBeenCalledWith("google", { callbackUrl: "/lists" });
  });

  it("signs in with credentials on login submit", async () => {
    renderLogin();
    await waitFor(() =>
      expect(screen.getByTestId("auth-email-input")).toBeInTheDocument()
    );
    await userEvent.type(screen.getByTestId("auth-email-input"), "a@b.com");
    await userEvent.type(
      screen.getByTestId("auth-password-input"),
      "secret123"
    );
    await userEvent.click(screen.getByTestId("auth-submit-btn"));
    expect(signIn).toHaveBeenCalledWith("credentials", {
      email: "a@b.com",
      password: "secret123",
      redirect: false,
    });
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it("shows an error when credentials are invalid", async () => {
    vi.mocked(signIn).mockResolvedValue({
      error: "CredentialsSignin",
      ok: false,
    } as never);
    renderLogin();
    await waitFor(() =>
      expect(screen.getByTestId("auth-email-input")).toBeInTheDocument()
    );
    await userEvent.type(screen.getByTestId("auth-email-input"), "a@b.com");
    await userEvent.type(
      screen.getByTestId("auth-password-input"),
      "secret123"
    );
    await userEvent.click(screen.getByTestId("auth-submit-btn"));
    expect(await screen.findByTestId("auth-error")).toBeInTheDocument();
  });

  it("creates an account then signs in when in signup mode", async () => {
    renderLogin();
    await waitFor(() =>
      expect(screen.getByTestId("auth-toggle-mode")).toBeInTheDocument()
    );
    await userEvent.click(screen.getByTestId("auth-toggle-mode"));
    expect(screen.getByTestId("auth-name-input")).toBeInTheDocument();

    await userEvent.type(screen.getByTestId("auth-name-input"), "Ada");
    await userEvent.type(screen.getByTestId("auth-email-input"), "ada@b.com");
    await userEvent.type(
      screen.getByTestId("auth-password-input"),
      "secret123"
    );
    await userEvent.click(screen.getByTestId("auth-submit-btn"));

    expect(mutateAsync).toHaveBeenCalledWith({
      email: "ada@b.com",
      password: "secret123",
      name: "Ada",
    });
    await waitFor(() =>
      expect(signIn).toHaveBeenCalledWith("credentials", {
        email: "ada@b.com",
        password: "secret123",
        redirect: false,
      })
    );
  });
});
