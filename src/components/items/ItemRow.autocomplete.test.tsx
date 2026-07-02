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
};

const itemWithPlace = {
  ...baseItem,
  text: "Cena @Roma",
  latitude: "41.9",
  longitude: "12.5",
  placeName: "Roma",
};

describe("ItemRow edit coords", () => {
  it("attaches coordinates when a place is added while editing", async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    render(
      <ItemRow
        item={baseItem}
        onToggle={vi.fn()}
        onDelete={vi.fn()}
        onEdit={onEdit}
      />
    );
    await user.click(screen.getByTestId("item-edit-i1"));
    const input = screen.getByTestId<HTMLInputElement>("item-edit-input-i1");
    await user.click(input);
    await user.type(input, " @Mad");
    await user.click(screen.getByText("Madrid"));
    await user.keyboard("{Enter}");
    expect(onEdit).toHaveBeenCalledWith(
      "Comprar leche @Madrid",
      expect.objectContaining({ placeName: "Madrid" })
    );
  });

  it("Enter selects the geocoding result instead of saving when the dropdown is open", async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    render(
      <ItemRow
        item={itemWithPlace}
        onToggle={vi.fn()}
        onDelete={vi.fn()}
        onEdit={onEdit}
      />
    );
    await user.click(screen.getByTestId("item-edit-i1"));
    const input = screen.getByTestId<HTMLInputElement>("item-edit-input-i1");
    await user.click(input);
    await user.keyboard("{End}");
    // remove "Roma", type a new place → dropdown opens with "Madrid"
    await user.keyboard("{Backspace}{Backspace}{Backspace}{Backspace}");
    await user.type(input, "Madrid");
    expect(await screen.findByText("Madrid")).toBeInTheDocument();
    // First Enter picks the geo result (does not save yet)
    await user.keyboard("{Enter}");
    expect(onEdit).not.toHaveBeenCalled();
    // Second Enter saves with the freshly selected coords
    await user.keyboard("{Enter}");
    expect(onEdit).toHaveBeenCalledWith(
      expect.stringContaining("@Madrid"),
      expect.objectContaining({ placeName: "Madrid" })
    );
  });

  it("keeps the existing place when editing other text", async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    render(
      <ItemRow
        item={itemWithPlace}
        onToggle={vi.fn()}
        onDelete={vi.fn()}
        onEdit={onEdit}
      />
    );
    await user.click(screen.getByTestId("item-edit-i1"));
    const input = screen.getByTestId<HTMLInputElement>("item-edit-input-i1");
    await user.click(input);
    await user.type(input, " hoy");
    await user.keyboard("{Enter}");
    // Text changed but @Roma kept → coords must NOT be wiped (undefined = keep)
    expect(onEdit).toHaveBeenCalledWith("Cena @Roma hoy", undefined);
  });
});

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
    await user.click(screen.getByTestId("item-edit-i1"));
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
    await user.click(screen.getByTestId("item-edit-i1"));
    const input = screen.getByTestId<HTMLInputElement>("item-edit-input-i1");
    await user.click(input);
    await user.type(input, " /");
    expect(screen.getByTestId("slash-menu")).toBeInTheDocument();
    await user.click(screen.getByTestId("slash-action-code"));
    expect(input.value).toBe("Comprar leche `texto`");
  });
});
