import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { AddItemForm } from "./AddItemForm";

vi.mock("@/hooks/useGeocodingSearch", () => ({
  useGeocodingSearch: () => ({ results: [], isLoading: false }),
}));

vi.mock("@/hooks/useItems", () => ({
  useAddItem: () => ({ mutate: vi.fn(), isPending: false }),
  useBulkAddItems: () => ({ mutate: vi.fn(), isPending: false }),
}));

function renderForm(allTags: string[] = [], allPlaces: string[] = []) {
  return render(
    <AddItemForm
      listId="l1"
      allTags={allTags}
      allPlaces={allPlaces}
      addInputRef={createRef<HTMLInputElement>()}
    />
  );
}

describe("AddItemForm", () => {
  it("suggests existing tags matching the partial tag being typed", async () => {
    renderForm(["personal", "work"]);
    await userEvent.type(screen.getByTestId("add-item-input"), "Tarea #wo");
    expect(screen.getByText("#work")).toBeInTheDocument();
    expect(screen.queryByText("#personal")).not.toBeInTheDocument();
  });

  it("suggests existing places matching the partial place being typed", async () => {
    renderForm([], ["Roma", "París"]);
    await userEvent.type(screen.getByTestId("add-item-input"), "Visitar @Ro");
    expect(screen.getByText("Roma")).toBeInTheDocument();
    expect(screen.queryByText("París")).not.toBeInTheDocument();
  });

  it("turns a pasted numbered list into a bulk preview with markers stripped", async () => {
    renderForm();
    const input = screen.getByTestId("add-item-input");
    input.focus();
    await userEvent.paste("1. Alpha\n2. Beta\n3. Gamma");
    expect(screen.getByTestId("bulk-preview")).toBeInTheDocument();
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("Beta")).toBeInTheDocument();
    expect(screen.getByText("Gamma")).toBeInTheDocument();
  });

  it("turns a pasted comma-separated single line into a bulk preview", async () => {
    renderForm();
    screen.getByTestId("add-item-input").focus();
    await userEvent.paste("apples, bananas, cherries");
    expect(screen.getByTestId("bulk-preview")).toBeInTheDocument();
    expect(screen.getByText("bananas")).toBeInTheDocument();
  });
});
