import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRouter, createMemoryHistory, RouterProvider } from "@tanstack/react-router";
import { routeTree } from "@/routeTree.gen";

vi.mock("@/hooks/useList");
vi.mock("@hono/auth-js/react", () => ({ useSession: vi.fn() }));

import { useCreateList } from "@/hooks/useList";
import { useSession } from "@hono/auth-js/react";

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const history = createMemoryHistory({ initialEntries: ["/"] });
  const router = createRouter({ routeTree, history, context: { queryClient: qc } });
  return render(
    <QueryClientProvider client={qc}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

function setupMocks(mutateFn = vi.fn()) {
  vi.mocked(useSession).mockReturnValue({
    data: null,
    status: "unauthenticated",
    update: vi.fn(),
  } as never);
  vi.mocked(useCreateList).mockReturnValue({ mutate: mutateFn, isPending: false } as never);
}

beforeEach(() => vi.clearAllMocks());

describe("HomePage", () => {
  it("renders the name input and create button", async () => {
    setupMocks();
    renderPage();
    await waitFor(() => expect(screen.getByTestId("list-name-input")).toBeInTheDocument());
    expect(screen.getByTestId("create-list-btn")).toBeInTheDocument();
  });

  it("create button is disabled when input is empty", async () => {
    setupMocks();
    renderPage();
    await waitFor(() => expect(screen.getByTestId("create-list-btn")).toBeInTheDocument());
    expect(screen.getByTestId("create-list-btn")).toBeDisabled();
  });

  it("create button is enabled when input has text", async () => {
    setupMocks();
    renderPage();
    await waitFor(() => expect(screen.getByTestId("list-name-input")).toBeInTheDocument());
    await userEvent.type(screen.getByTestId("list-name-input"), "Mi nueva lista");
    expect(screen.getByTestId("create-list-btn")).not.toBeDisabled();
  });

  it("submitting the form calls createList.mutate with the name", async () => {
    const mutateFn = vi.fn();
    setupMocks(mutateFn);
    renderPage();
    await waitFor(() => expect(screen.getByTestId("list-name-input")).toBeInTheDocument());
    await userEvent.type(screen.getByTestId("list-name-input"), "Test lista");
    await userEvent.click(screen.getByTestId("create-list-btn"));
    expect(mutateFn).toHaveBeenCalledWith("Test lista", expect.any(Object));
  });

  it("does not call mutate when input is only whitespace", async () => {
    const mutateFn = vi.fn();
    setupMocks(mutateFn);
    renderPage();
    await waitFor(() => expect(screen.getByTestId("list-name-input")).toBeInTheDocument());
    await userEvent.type(screen.getByTestId("list-name-input"), "   ");
    await userEvent.click(screen.getByTestId("create-list-btn"));
    expect(mutateFn).not.toHaveBeenCalled();
  });
});
