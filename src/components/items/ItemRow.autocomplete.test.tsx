import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ItemRow } from "./ItemRow";

vi.mock("@/hooks/useGeocodingSearch", () => ({
  useGeocodingSearch: () => ({
    results: [
      {
        latitude: 40.4168,
        longitude: -3.7038,
        name: "Madrid",
        city: "Madrid",
        country: "Spain",
      },
    ],
    isLoading: false,
  }),
}));

const baseItem = {
  id: "i1",
  listId: "l1",
  text: "Comprar leche",
  done: false,
  position: 0,
  latitude: null,
  longitude: null,
  placeName: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  likeCount: 0,
  likedByMe: false,
  commentCount: 0,
};

describe("ItemRow edit autocomplete", () => {
  it("shows geocoding dropdown when typing @<3+chars> in edit mode", async () => {
    const user = userEvent.setup();
    render(
      <ItemRow
        item={baseItem}
        onToggle={vi.fn()}
        onDelete={vi.fn()}
        onEdit={vi.fn()}
      />
    );
    await user.dblClick(screen.getByTestId("item-text-i1"));
    const input = screen.getByTestId("item-edit-input-i1");
    await user.click(input);
    await user.type(input, " @Mad");
    expect(screen.getByText("Madrid")).toBeInTheDocument();
  });

  it("opens the slash menu in edit mode and inserts code formatting", async () => {
    const user = userEvent.setup();
    render(
      <ItemRow
        item={baseItem}
        onToggle={vi.fn()}
        onDelete={vi.fn()}
        onEdit={vi.fn()}
      />
    );
    await user.dblClick(screen.getByTestId("item-text-i1"));
    const input = screen.getByTestId<HTMLInputElement>("item-edit-input-i1");
    await user.click(input);
    await user.type(input, " /");
    expect(screen.getByTestId("slash-menu")).toBeInTheDocument();
    await user.click(screen.getByTestId("slash-action-code"));
    expect(input.value).toBe("Comprar leche `texto`");
  });
});
