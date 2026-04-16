import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRouter, createMemoryHistory, RouterProvider } from "@tanstack/react-router";
import { routeTree } from "@/routeTree.gen";
import type { List } from "@/db/schema";

vi.mock("@/hooks/useList");
vi.mock("@hono/auth-js/react", () => ({ useSession: vi.fn() }));

import { useMyLists, useDeleteList } from "@/hooks/useList";
import { useSession } from "@hono/auth-js/react";

const LIST_A: List = {
  id: "l1", name: "Lista A", slug: null, description: null,
  public: false, collaborative: false, ownerId: "u1", createdAt: new Date(),
};
const LIST_B: List = {
  id: "l2", name: "Lista B", slug: "lista-b", description: "Desc",
  public: true, collaborative: false, ownerId: "u1", createdAt: new Date(),
};

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const history = createMemoryHistory({ initialEntries: ["/lists/"] });
  const router = createRouter({ routeTree, history, context: { queryClient: qc } });
  return render(
    <QueryClientProvider client={qc}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

function setupMocks({
  lists = [LIST_A, LIST_B],
  isLoading = false,
  deleteMutate = vi.fn(),
}: {
  lists?: List[];
  isLoading?: boolean;
  deleteMutate?: ReturnType<typeof vi.fn>;
} = {}) {
  vi.mocked(useSession).mockReturnValue({
    data: { user: { id: "u1", name: "User" }, expires: "" },
    status: "authenticated",
    update: vi.fn(),
  } as never);
  vi.mocked(useMyLists).mockReturnValue({
    data: { pages: [{ items: lists, nextCursor: null }], pageParams: [] },
    isLoading,
    isFetchingNextPage: false,
    hasNextPage: false,
    fetchNextPage: vi.fn(),
  } as never);
  vi.mocked(useDeleteList).mockReturnValue({ mutate: deleteMutate, isPending: false } as never);
}

beforeEach(() => vi.clearAllMocks());

describe("MyListsPage", () => {
  it("renders list cards for each list", async () => {
    setupMocks();
    renderPage();
    await waitFor(() => expect(screen.getAllByTestId("my-list-card")).toHaveLength(2));
    expect(screen.getByText("Lista A")).toBeInTheDocument();
    expect(screen.getByText("Lista B")).toBeInTheDocument();
  });

  it("shows empty state when there are no lists", async () => {
    setupMocks({ lists: [] });
    renderPage();
    await waitFor(() => expect(screen.queryAllByTestId("my-list-card")).toHaveLength(0));
  });

  it("clicking delete button shows confirmation", async () => {
    setupMocks();
    renderPage();
    await waitFor(() => expect(screen.getAllByTestId("delete-list-btn")[0]).toBeInTheDocument());
    await userEvent.click(screen.getAllByTestId("delete-list-btn")[0]);
    expect(screen.getByTestId("delete-confirm-btn")).toBeInTheDocument();
    expect(screen.getByTestId("delete-cancel-btn")).toBeInTheDocument();
  });

  it("confirming deletion calls deleteList.mutate", async () => {
    const deleteMutate = vi.fn();
    setupMocks({ deleteMutate });
    renderPage();
    await waitFor(() => expect(screen.getAllByTestId("delete-list-btn")[0]).toBeInTheDocument());
    await userEvent.click(screen.getAllByTestId("delete-list-btn")[0]);
    await userEvent.click(screen.getByTestId("delete-confirm-btn"));
    expect(deleteMutate).toHaveBeenCalledWith(LIST_A.id);
  });

  it("cancelling deletion hides confirmation", async () => {
    setupMocks();
    renderPage();
    await waitFor(() => expect(screen.getAllByTestId("delete-list-btn")[0]).toBeInTheDocument());
    await userEvent.click(screen.getAllByTestId("delete-list-btn")[0]);
    await userEvent.click(screen.getByTestId("delete-cancel-btn"));
    expect(screen.queryByTestId("delete-confirm-btn")).not.toBeInTheDocument();
  });

  it("renders sort option buttons", async () => {
    setupMocks();
    renderPage();
    await waitFor(() => expect(screen.getByTestId("sort-recent")).toBeInTheDocument());
    expect(screen.getByTestId("sort-created_desc")).toBeInTheDocument();
    expect(screen.getByTestId("sort-created_asc")).toBeInTheDocument();
  });
});
