import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ListSettingsPanel } from "./ListSettingsPanel";

function renderPanel(
  overrides: Partial<Parameters<typeof ListSettingsPanel>[0]> = {}
) {
  const props = {
    isPublic: true,
    isCollaborative: false,
    category: null as string | null,
    priceInCents: null,
    stripeConnected: true,
    onTogglePublic: vi.fn(),
    onToggleCollaborative: vi.fn(),
    onSetCategory: vi.fn(),
    onSetPrice: vi.fn(),
    onRemovePrice: vi.fn(),
    onClose: vi.fn(),
    ...overrides,
  };
  render(<ListSettingsPanel {...props} />);
  return props;
}

beforeEach(() => vi.clearAllMocks());

describe("ListSettingsPanel category selector", () => {
  it("renders the category select", () => {
    renderPanel();
    expect(screen.getByTestId("category-select")).toBeInTheDocument();
  });

  it("reflects the current category", () => {
    renderPanel({ category: "movies" });
    expect(screen.getByTestId("category-select")).toHaveTextContent("Películas");
  });

  it("calls onSetCategory with the chosen category", async () => {
    const props = renderPanel({ category: null });
    await userEvent.click(screen.getByTestId("category-select"));
    await userEvent.click(screen.getByTestId("category-option-books"));
    expect(props.onSetCategory).toHaveBeenCalledWith("books");
  });

  it("calls onSetCategory with null when cleared", async () => {
    const props = renderPanel({ category: "music" });
    await userEvent.click(screen.getByTestId("category-select"));
    await userEvent.click(screen.getByTestId("category-option-none"));
    expect(props.onSetCategory).toHaveBeenCalledWith(null);
  });
});
