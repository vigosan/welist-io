import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ListSettingsPanel } from "./ListSettingsPanel";

vi.mock("@/hooks/useCachedSession", () => ({
  useCachedSession: () => ({
    data: { user: { id: "owner", name: "Owner", image: null } },
    status: "authenticated",
  }),
}));

const categoryMutate = vi.fn();

vi.mock("@/hooks/useList", () => ({
  useList: vi.fn(),
  useTogglePublic: () => ({ mutate: vi.fn(), isPending: false }),
  useToggleCollaborative: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateCategory: () => ({ mutate: categoryMutate, isPending: false }),
  useCollaborators: () => ({ data: { collaborators: [] } }),
  useUserSearch: () => ({ data: { users: [] }, isFetching: false }),
  useAddCollaborator: () => ({ mutate: vi.fn(), isPending: false }),
  useRemoveCollaborator: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock("@/hooks/useListPrice", () => ({
  useListPrice: () => ({ data: { priceInCents: null } }),
  useSetPrice: () => ({ mutate: vi.fn(), isPending: false }),
  useRemovePrice: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock("@/hooks/useStripeAccount", () => ({
  useStripeAccountStatus: () => ({ data: { onboardingComplete: true } }),
}));

vi.mock("@/hooks/useListSlugEditor", () => ({
  useListSlugEditor: () => ({
    list: { slug: "abc" },
    editingSlug: false,
    setEditingSlug: vi.fn(),
    slugValue: "",
    setSlugValue: vi.fn(),
    slugError: "",
    startEditingSlug: vi.fn(),
    handleSlugSubmit: vi.fn(),
    updateSlug: { isPending: false },
  }),
}));

import { useList } from "@/hooks/useList";

function renderPanel(listOverrides: Record<string, unknown> = {}) {
  vi.mocked(useList).mockReturnValue({
    data: {
      id: "abc",
      slug: "abc",
      public: true,
      collaborative: false,
      category: null,
      ...listOverrides,
    },
  } as never);
  const qc = new QueryClient();
  render(
    <QueryClientProvider client={qc}>
      <ListSettingsPanel
        listId="abc"
        onClose={vi.fn()}
        onSlugUpdated={vi.fn()}
      />
    </QueryClientProvider>
  );
}

beforeEach(() => vi.clearAllMocks());

describe("ListSettingsPanel category selector", () => {
  it("renders the category select", () => {
    renderPanel();
    expect(screen.getByTestId("category-select")).toBeInTheDocument();
  });

  it("reflects the current category", () => {
    renderPanel({ category: "movies" });
    expect(screen.getByTestId("category-select")).toHaveTextContent(
      "Películas"
    );
  });

  it("calls updateCategory with the chosen category", async () => {
    renderPanel({ category: null });
    await userEvent.click(screen.getByTestId("category-select"));
    await userEvent.click(screen.getByTestId("category-option-books"));
    expect(categoryMutate).toHaveBeenCalledWith("books");
  });

  it("calls updateCategory with null when cleared", async () => {
    renderPanel({ category: "music" });
    await userEvent.click(screen.getByTestId("category-select"));
    await userEvent.click(screen.getByTestId("category-option-none"));
    expect(categoryMutate).toHaveBeenCalledWith(null);
  });
});
