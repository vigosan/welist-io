import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { List } from "@/db/schema";
import { routeTree } from "@/routeTree.gen";

vi.mock("@/hooks/useList");
vi.mock("@hono/auth-js/react", () => ({
  useSession: vi.fn(),
}));

import { useSession } from "@hono/auth-js/react";
import { useDeleteList, useMyLists, useStreak } from "@/hooks/useList";

const LIST_A: List = {
  id: "l1",
  name: "Lista A",
  slug: null,
  description: null,
  category: null,
  public: false,
  collaborative: false,
  ownerId: "u1",
  createdAt: new Date(),
};
const LIST_B: List = {
  id: "l2",
  name: "Lista B",
  slug: "lista-b",
  description: "Desc",
  category: null,
  public: true,
  collaborative: false,
  ownerId: "u1",
  createdAt: new Date(),
};
const LIST_PARTICIPATED: List = {
  id: "l3",
  name: "Reto ajeno",
  slug: null,
  description: null,
  category: null,
  public: true,
  collaborative: false,
  ownerId: "other-user",
  createdAt: new Date(),
};
const LIST_IN_PROGRESS = {
  ...LIST_A,
  id: "lp",
  name: "En progreso",
  itemCount: 10,
  doneCount: 3,
  participantCount: 0,
};
const LIST_NOT_STARTED = {
  ...LIST_A,
  id: "lns",
  name: "Sin empezar",
  itemCount: 5,
  doneCount: 0,
  participantCount: 0,
};
const LIST_DONE = {
  ...LIST_A,
  id: "ld",
  name: "Terminada",
  itemCount: 4,
  doneCount: 4,
  participantCount: 0,
};

function renderPage() {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  const history = createMemoryHistory({
    initialEntries: ["/lists/"],
  });
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

function setupMocks({
  lists = [LIST_A, LIST_B],
  isLoading = false,
  deleteMutate = vi.fn(),
  streak,
}: {
  lists?: List[];
  isLoading?: boolean;
  deleteMutate?: ReturnType<typeof vi.fn>;
  streak?: { current: number };
} = {}) {
  vi.mocked(useStreak).mockReturnValue({ data: streak } as never);
  vi.mocked(useSession).mockReturnValue({
    data: { user: { id: "u1", name: "User" }, expires: "" },
    status: "authenticated",
    update: vi.fn(),
  } as never);
  vi.mocked(useMyLists).mockReturnValue({
    data: {
      pages: [{ items: lists, nextCursor: null }],
      pageParams: [],
    },
    isLoading,
    isFetchingNextPage: false,
    hasNextPage: false,
    fetchNextPage: vi.fn(),
  } as never);
  vi.mocked(useDeleteList).mockReturnValue({
    mutate: deleteMutate,
    isPending: false,
  } as never);
}

beforeEach(() => vi.clearAllMocks());

describe("MyListsPage", () => {
  it("renders list cards for each list", async () => {
    setupMocks();
    renderPage();
    await waitFor(() =>
      expect(screen.getAllByTestId("my-list-card")).toHaveLength(2)
    );
    expect(screen.getByText("Lista A")).toBeInTheDocument();
    expect(screen.getByText("Lista B")).toBeInTheDocument();
  });

  it("shows empty state when there are no lists", async () => {
    setupMocks({ lists: [] });
    renderPage();
    await waitFor(() =>
      expect(screen.queryAllByTestId("my-list-card")).toHaveLength(0)
    );
  });

  it("clicking delete button shows confirmation", async () => {
    setupMocks();
    renderPage();
    await waitFor(() =>
      expect(screen.getAllByTestId("delete-list-btn")[0]).toBeInTheDocument()
    );
    await userEvent.click(screen.getAllByTestId("delete-list-btn")[0]);
    expect(screen.getByTestId("delete-confirm-btn")).toBeInTheDocument();
    expect(screen.getByTestId("delete-cancel-btn")).toBeInTheDocument();
  });

  it("confirming deletion calls deleteList.mutate", async () => {
    const deleteMutate = vi.fn();
    setupMocks({ deleteMutate });
    renderPage();
    await waitFor(() =>
      expect(screen.getAllByTestId("delete-list-btn")[0]).toBeInTheDocument()
    );
    await userEvent.click(screen.getAllByTestId("delete-list-btn")[0]);
    await userEvent.click(screen.getByTestId("delete-confirm-btn"));
    expect(deleteMutate).toHaveBeenCalledWith(LIST_A.id);
  });

  it("cancelling deletion hides confirmation", async () => {
    setupMocks();
    renderPage();
    await waitFor(() =>
      expect(screen.getAllByTestId("delete-list-btn")[0]).toBeInTheDocument()
    );
    await userEvent.click(screen.getAllByTestId("delete-list-btn")[0]);
    await userEvent.click(screen.getByTestId("delete-cancel-btn"));
    expect(screen.queryByTestId("delete-confirm-btn")).not.toBeInTheDocument();
  });

  it("shows leave confirmation for participated lists", async () => {
    setupMocks({ lists: [LIST_PARTICIPATED] });
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId("delete-list-btn")).toBeInTheDocument()
    );
    await userEvent.click(screen.getByTestId("delete-list-btn"));
    expect(screen.getByText(/¿Abandonar/i)).toBeInTheDocument();
    expect(screen.getByTestId("delete-confirm-btn")).toHaveTextContent(
      /Abandonar/i
    );
  });

  it("confirming leave calls deleteList.mutate for participated list", async () => {
    const deleteMutate = vi.fn();
    setupMocks({ lists: [LIST_PARTICIPATED], deleteMutate });
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId("delete-list-btn")).toBeInTheDocument()
    );
    await userEvent.click(screen.getByTestId("delete-list-btn"));
    await userEvent.click(screen.getByTestId("delete-confirm-btn"));
    expect(deleteMutate).toHaveBeenCalledWith(LIST_PARTICIPATED.id);
  });

  it("shows progress count and pending items for an in-progress list", async () => {
    setupMocks({ lists: [LIST_IN_PROGRESS] });
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId("list-progress")).toBeInTheDocument()
    );
    expect(screen.getByTestId("list-progress")).toHaveTextContent("3/10");
    expect(screen.getByTestId("list-progress")).toHaveTextContent(
      "7 pendientes"
    );
  });

  it("shows the progress bar track even when nothing is done", async () => {
    setupMocks({ lists: [LIST_NOT_STARTED] });
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId("list-progress-bar")).toBeInTheDocument()
    );
    expect(screen.getByTestId("list-progress")).toHaveTextContent("0/5");
    expect(screen.getByTestId("list-progress")).toHaveTextContent(
      "5 pendientes"
    );
  });

  it("shows a completed label when all items are done", async () => {
    setupMocks({ lists: [LIST_DONE] });
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId("list-progress")).toBeInTheDocument()
    );
    expect(screen.getByTestId("list-progress")).toHaveTextContent("Completada");
    expect(screen.getByTestId("list-progress")).not.toHaveTextContent(
      "pendiente"
    );
  });

  it("shows the streak badge when the user has an active streak", async () => {
    setupMocks({ streak: { current: 5 } });
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId("streak-badge")).toBeInTheDocument()
    );
    expect(screen.getByTestId("streak-badge")).toHaveTextContent(
      "5 días de racha"
    );
  });

  it("hides the streak badge when there is no active streak", async () => {
    setupMocks({ streak: { current: 0 } });
    renderPage();
    await waitFor(() =>
      expect(screen.getAllByTestId("my-list-card").length).toBeGreaterThan(0)
    );
    expect(screen.queryByTestId("streak-badge")).not.toBeInTheDocument();
  });

  it("renders sort option buttons when filters are opened", async () => {
    setupMocks();
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId("filter-toggle")).toBeInTheDocument()
    );
    await userEvent.click(screen.getByTestId("filter-toggle"));
    expect(screen.getByTestId("sort-recent")).toBeInTheDocument();
    expect(screen.getByTestId("sort-created_desc")).toBeInTheDocument();
    expect(screen.getByTestId("sort-created_asc")).toBeInTheDocument();
  });
});
