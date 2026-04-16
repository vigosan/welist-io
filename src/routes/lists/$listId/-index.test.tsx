import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRouter, createMemoryHistory, RouterProvider } from "@tanstack/react-router";
import { routeTree } from "@/routeTree.gen";

vi.mock("@/hooks/useItems");
vi.mock("@/hooks/useListHeader");
vi.mock("@/hooks/useItemsFilter");
vi.mock("@/hooks/usePullToRefresh");
vi.mock("@/hooks/useList");
vi.mock("@/hooks/useListPrice");
vi.mock("@/hooks/useStripeAccount");
vi.mock("@/lib/confetti", () => ({ fireConfetti: vi.fn() }));
vi.mock("@hono/auth-js/react", () => ({ useSession: vi.fn() }));

import { useItems, useAddItem, useToggleItem, useDeleteItem, useUpdateItem, useBulkAddItems } from "@/hooks/useItems";
import { useListHeader } from "@/hooks/useListHeader";
import { useItemsFilter } from "@/hooks/useItemsFilter";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { useToggleCollaborative } from "@/hooks/useList";
import { useListPrice, useSetPrice, useRemovePrice } from "@/hooks/useListPrice";
import { useStripeAccountStatus } from "@/hooks/useStripeAccount";
import { useSession } from "@hono/auth-js/react";
import type { Item } from "@/hooks/useItems";
import type { ListWithParticipation } from "@/services/lists.service";

// ---- Fixtures ----

const LIST: ListWithParticipation = {
  id: "test-list",
  name: "Mi lista",
  slug: null,
  description: null,
  public: false,
  collaborative: false,
  ownerId: null,
  createdAt: new Date(),
  participated: false,
  participationCompletedAt: null,
};

function makeItem(id: string, text: string, done = false): Item {
  return { id, listId: "test-list", text, done, position: 0, createdAt: new Date(), updatedAt: new Date() };
}

const ITEMS: Item[] = [makeItem("i1", "Tarea A"), makeItem("i2", "Tarea B", true)];

// ---- Router helper ----

function renderPage(listId = "test-list") {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const history = createMemoryHistory({ initialEntries: [`/lists/${listId}/`] });
  const router = createRouter({ routeTree, history, context: { queryClient: qc } });
  return render(
    <QueryClientProvider client={qc}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

// ---- Mock helpers ----

type SessionUser = { id: string; name?: string | null; email?: string | null; image?: string | null };

function setupMocks({
  items = ITEMS,
  list = LIST,
  filteredItems = items,
  addMutate = vi.fn(),
  toggleMutate = vi.fn(),
  deleteMutate = vi.fn(),
  updateMutate = vi.fn(),
  bulkMutate = vi.fn(),
  bulkIsPending = false,
  sessionUser = null as SessionUser | null,
}: {
  items?: Item[];
  list?: ListWithParticipation;
  filteredItems?: Item[];
  addMutate?: ReturnType<typeof vi.fn>;
  toggleMutate?: ReturnType<typeof vi.fn>;
  deleteMutate?: ReturnType<typeof vi.fn>;
  updateMutate?: ReturnType<typeof vi.fn>;
  bulkMutate?: ReturnType<typeof vi.fn>;
  bulkIsPending?: boolean;
  sessionUser?: SessionUser | null;
} = {}) {
  vi.mocked(useSession).mockReturnValue({
    data: sessionUser ? { user: sessionUser, expires: "" } : null,
    status: sessionUser ? "authenticated" : "unauthenticated",
    update: vi.fn(),
  } as never);

  vi.mocked(useItems).mockReturnValue({ data: items, isLoading: false, refetch: vi.fn() } as never);
  vi.mocked(useAddItem).mockReturnValue({ mutate: addMutate, isPending: false } as never);
  vi.mocked(useToggleItem).mockReturnValue({ mutate: toggleMutate } as never);
  vi.mocked(useDeleteItem).mockReturnValue({ mutate: deleteMutate } as never);
  vi.mocked(useUpdateItem).mockReturnValue({ mutate: updateMutate } as never);
  vi.mocked(useBulkAddItems).mockReturnValue({ mutate: bulkMutate, isPending: bulkIsPending } as never);

  vi.mocked(useListHeader).mockReturnValue({
    list, listLoading: false, listError: false, refetchList: vi.fn(),
    editingName: false, setEditingName: vi.fn(), nameValue: list.name, setNameValue: vi.fn(),
    updateName: { mutate: vi.fn(), isPending: false } as never,
    editingSlug: false, setEditingSlug: vi.fn(), slugValue: "", setSlugValue: vi.fn(),
    slugError: "", startEditingSlug: vi.fn(), handleSlugSubmit: vi.fn(),
    updateSlug: { mutate: vi.fn(), isPending: false } as never,
    editingDescription: false, setEditingDescription: vi.fn(), descriptionValue: "", setDescriptionValue: vi.fn(),
    updateDescription: { mutate: vi.fn(), isPending: false } as never,
    copied: false, handleShare: vi.fn(),
    togglePublic: { mutate: vi.fn(), isPending: false } as never,
  });

  vi.mocked(useItemsFilter).mockReturnValue({
    stableItems: items,
    allTags: [],
    partialTag: null,
    tagSuggestions: [],
    filteredItems,
    resetOrder: vi.fn(),
    setOrder: vi.fn(),
  });

  vi.mocked(usePullToRefresh).mockReturnValue({
    containerRef: { current: null },
    pullDistance: 0,
    refreshing: false,
  } as never);

  vi.mocked(useToggleCollaborative).mockReturnValue({ mutate: vi.fn(), isPending: false } as never);
  vi.mocked(useListPrice).mockReturnValue({ data: null, isLoading: false } as never);
  vi.mocked(useSetPrice).mockReturnValue({ mutate: vi.fn(), isPending: false } as never);
  vi.mocked(useRemovePrice).mockReturnValue({ mutate: vi.fn(), isPending: false } as never);
  vi.mocked(useStripeAccountStatus).mockReturnValue({ data: { connected: false, onboardingComplete: false }, isLoading: false } as never);
}

beforeEach(() => vi.clearAllMocks());

// ---- Tests ----

describe("ListDetailPage", () => {
  it("renders list name and items", async () => {
    setupMocks();
    renderPage();
    await waitFor(() => expect(screen.getByText("Mi lista")).toBeInTheDocument());
    expect(screen.getByTestId("item-row-i1")).toBeInTheDocument();
    expect(screen.getByTestId("item-row-i2")).toBeInTheDocument();
  });

  it("shows empty state when no items", async () => {
    setupMocks({ items: [], filteredItems: [] });
    renderPage();
    await waitFor(() => expect(screen.getByText("Añade el primer elemento a tu lista.")).toBeInTheDocument());
  });

  it("submits add-item form and calls addItem.mutate", async () => {
    const addMutate = vi.fn();
    setupMocks({ addMutate });
    renderPage();
    await waitFor(() => screen.getByTestId("add-item-input"));

    await userEvent.type(screen.getByTestId("add-item-input"), "Nueva tarea");
    await userEvent.click(screen.getByTestId("add-item-submit"));

    expect(addMutate).toHaveBeenCalledWith({ text: "Nueva tarea" }, expect.any(Object));
  });

  it("does not submit when add-item input is empty", async () => {
    const addMutate = vi.fn();
    setupMocks({ addMutate });
    renderPage();
    await waitFor(() => screen.getByTestId("add-item-submit"));

    await userEvent.click(screen.getByTestId("add-item-submit"));
    expect(addMutate).not.toHaveBeenCalled();
  });

  it("calls toggleItem.mutate when checkbox is clicked", async () => {
    const toggleMutate = vi.fn();
    setupMocks({ toggleMutate });
    renderPage();
    await waitFor(() => screen.getByTestId("item-checkbox-i1"));

    await userEvent.click(screen.getByTestId("item-checkbox-i1"));
    expect(toggleMutate).toHaveBeenCalledWith("i1");
  });

  it("calls deleteItem.mutate when delete button is clicked", async () => {
    const deleteMutate = vi.fn();
    setupMocks({ deleteMutate });
    renderPage();
    await waitFor(() => screen.getByTestId("item-delete-i1"));

    await userEvent.click(screen.getByTestId("item-delete-i1"));
    expect(deleteMutate).toHaveBeenCalledWith("i1");
  });

  it("shows BulkPastePreview when multi-line text is pasted", async () => {
    setupMocks();
    renderPage();
    await waitFor(() => screen.getByTestId("add-item-input"));

    fireEvent.paste(screen.getByTestId("add-item-input"), {
      clipboardData: { getData: () => "Línea 1\nLínea 2\nLínea 3" },
    });

    expect(screen.getByTestId("bulk-preview")).toBeInTheDocument();
    expect(screen.getByText(/3 elementos para añadir/)).toBeInTheDocument();
  });

  it("does not show BulkPastePreview for single-line paste", async () => {
    setupMocks();
    renderPage();
    await waitFor(() => screen.getByTestId("add-item-input"));

    fireEvent.paste(screen.getByTestId("add-item-input"), {
      clipboardData: { getData: () => "una sola línea" },
    });

    expect(screen.queryByTestId("bulk-preview")).not.toBeInTheDocument();
  });

  it("calls bulkAddItems.mutate on bulk confirm", async () => {
    const bulkMutate = vi.fn();
    setupMocks({ bulkMutate });
    renderPage();
    await waitFor(() => screen.getByTestId("add-item-input"));

    fireEvent.paste(screen.getByTestId("add-item-input"), {
      clipboardData: { getData: () => "A\nB\nC" },
    });

    await userEvent.click(screen.getByTestId("bulk-confirm"));
    expect(bulkMutate).toHaveBeenCalledWith(["A", "B", "C"], expect.any(Object));
  });

  it("dismisses BulkPastePreview on cancel", async () => {
    setupMocks();
    renderPage();
    await waitFor(() => screen.getByTestId("add-item-input"));

    fireEvent.paste(screen.getByTestId("add-item-input"), {
      clipboardData: { getData: () => "X\nY" },
    });
    expect(screen.getByTestId("bulk-preview")).toBeInTheDocument();

    await userEvent.click(screen.getByTestId("bulk-cancel"));
    expect(screen.queryByTestId("bulk-preview")).not.toBeInTheDocument();
  });

  it("shows search bar on Cmd+F and hides on Escape", async () => {
    setupMocks();
    renderPage();
    await waitFor(() => screen.getByTestId("add-item-input"));

    expect(screen.queryByTestId("search-input")).not.toBeInTheDocument();

    await userEvent.keyboard("{Meta>}f{/Meta}");
    await waitFor(() => expect(screen.getByTestId("search-input")).toBeInTheDocument());

    fireEvent.keyDown(screen.getByTestId("search-input"), { key: "Escape" });
    await waitFor(() => expect(screen.queryByTestId("search-input")).not.toBeInTheDocument());
  });

  it("closes search bar via close button", async () => {
    setupMocks();
    renderPage();
    await waitFor(() => screen.getByTestId("add-item-input"));

    await userEvent.keyboard("{Meta>}f{/Meta}");
    await waitFor(() => screen.getByTestId("search-input"));

    await userEvent.click(screen.getByTestId("search-close"));
    expect(screen.queryByTestId("search-input")).not.toBeInTheDocument();
  });

  it("shows completion counter when items exist", async () => {
    setupMocks();
    renderPage();
    await waitFor(() => expect(screen.getByText("1 / 2 completados")).toBeInTheDocument());
  });

  describe("permissions", () => {
    it("hides write controls for non-owner non-collaborative list", async () => {
      setupMocks({
        list: { ...LIST, ownerId: "other-user", collaborative: false },
        sessionUser: null,
      });
      renderPage();
      await waitFor(() => expect(screen.getByText("Mi lista")).toBeInTheDocument());
      expect(screen.queryByTestId("add-item-input")).not.toBeInTheDocument();
      expect(screen.queryByTestId("item-delete-i1")).not.toBeInTheDocument();
    });

    it("shows write controls for non-owner collaborative list", async () => {
      setupMocks({
        list: { ...LIST, ownerId: "other-user", collaborative: true },
        sessionUser: null,
      });
      renderPage();
      await waitFor(() => expect(screen.getByTestId("add-item-input")).toBeInTheDocument());
      expect(screen.getByTestId("item-delete-i1")).toBeInTheDocument();
    });

    it("hides settings button for non-owner", async () => {
      setupMocks({
        list: { ...LIST, ownerId: "other-user", collaborative: false },
        sessionUser: null,
      });
      renderPage();
      await waitFor(() => expect(screen.getByText("Mi lista")).toBeInTheDocument());
      expect(screen.queryByTestId("settings-btn")).not.toBeInTheDocument();
    });

    it("shows all controls for owner after opening settings panel", async () => {
      setupMocks({
        list: { ...LIST, ownerId: "owner-id", collaborative: false },
        sessionUser: { id: "owner-id" },
      });
      renderPage();
      await waitFor(() => expect(screen.getByTestId("add-item-input")).toBeInTheDocument());
      await userEvent.click(screen.getByTestId("settings-btn"));
      await waitFor(() => expect(screen.getByTestId("list-settings-panel")).toBeInTheDocument());
      expect(screen.getByTestId("item-delete-i1")).toBeInTheDocument();
    });
  });
});
