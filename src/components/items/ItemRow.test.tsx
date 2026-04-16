import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ItemRow } from "./ItemRow";

const baseItem = {
  id: "i1",
  listId: "l1",
  text: "Comprar leche",
  done: false,
  position: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
};
const taggedItem = {
  ...baseItem,
  text: "Visitar Roma #viajes #urgente",
};

describe("ItemRow", () => {
  it("renders item text", () => {
    render(
      <ItemRow
        item={baseItem}
        onToggle={vi.fn()}
        onDelete={vi.fn()}
        onEdit={vi.fn()}
      />
    );
    expect(screen.getByTestId("item-text-i1")).toHaveTextContent(
      "Comprar leche"
    );
  });

  it("calls onToggle when checkbox button is clicked", async () => {
    const onToggle = vi.fn();
    render(
      <ItemRow
        item={baseItem}
        onToggle={onToggle}
        onDelete={vi.fn()}
        onEdit={vi.fn()}
      />
    );
    await userEvent.click(screen.getByTestId("item-checkbox-i1"));
    expect(onToggle).toHaveBeenCalledOnce();
  });

  it("shows line-through when item is done", () => {
    render(
      <ItemRow
        item={{ ...baseItem, done: true }}
        onToggle={vi.fn()}
        onDelete={vi.fn()}
        onEdit={vi.fn()}
      />
    );
    expect(screen.getByTestId("item-text-i1")).toHaveClass("line-through");
  });

  it("calls onDelete when delete button clicked", async () => {
    const onDelete = vi.fn();
    render(
      <ItemRow
        item={baseItem}
        onToggle={vi.fn()}
        onDelete={onDelete}
        onEdit={vi.fn()}
      />
    );
    await userEvent.click(screen.getByTestId("item-delete-i1"));
    expect(onDelete).toHaveBeenCalledOnce();
  });

  it("shows display text without hashtags when item has tags", () => {
    render(
      <ItemRow
        item={taggedItem}
        onToggle={vi.fn()}
        onDelete={vi.fn()}
        onEdit={vi.fn()}
      />
    );
    expect(screen.getByTestId("item-text-i1")).toHaveTextContent(
      "Visitar Roma"
    );
    expect(screen.getByTestId("item-text-i1")).not.toHaveTextContent("#viajes");
  });

  it("renders tag chips for each tag", () => {
    render(
      <ItemRow
        item={taggedItem}
        onToggle={vi.fn()}
        onDelete={vi.fn()}
        onEdit={vi.fn()}
      />
    );
    expect(screen.getByTestId("item-tag-i1-viajes")).toBeInTheDocument();
    expect(screen.getByTestId("item-tag-i1-urgente")).toBeInTheDocument();
  });

  it("calls onTagClick when a tag chip is clicked", async () => {
    const onTagClick = vi.fn();
    render(
      <ItemRow
        item={taggedItem}
        onToggle={vi.fn()}
        onDelete={vi.fn()}
        onEdit={vi.fn()}
        onTagClick={onTagClick}
      />
    );
    await userEvent.click(screen.getByTestId("item-tag-i1-viajes"));
    expect(onTagClick).toHaveBeenCalledWith("viajes");
  });

  it("cancels edit mode on Escape without calling onEdit", async () => {
    const onEdit = vi.fn();
    render(
      <ItemRow
        item={baseItem}
        onToggle={vi.fn()}
        onDelete={vi.fn()}
        onEdit={onEdit}
      />
    );
    await userEvent.dblClick(screen.getByTestId("item-text-i1"));
    await userEvent.keyboard("{Escape}");
    expect(onEdit).not.toHaveBeenCalled();
    expect(screen.getByTestId("item-text-i1")).toBeInTheDocument();
  });

  it("enters edit mode on double click and calls onEdit on blur", async () => {
    const onEdit = vi.fn();
    render(
      <ItemRow
        item={baseItem}
        onToggle={vi.fn()}
        onDelete={vi.fn()}
        onEdit={onEdit}
      />
    );
    await userEvent.dblClick(screen.getByTestId("item-text-i1"));
    const input = screen.getByTestId("item-edit-input-i1");
    await userEvent.clear(input);
    await userEvent.type(input, "Comprar pan");
    await userEvent.tab();
    expect(onEdit).toHaveBeenCalledWith("Comprar pan");
  });

  it("renders bold markdown in item text", () => {
    const boldItem = {
      ...baseItem,
      text: "**importante** revisar",
    };
    render(
      <ItemRow
        item={boldItem}
        onToggle={vi.fn()}
        onDelete={vi.fn()}
        onEdit={vi.fn()}
      />
    );
    expect(
      screen.getByTestId("item-text-i1").querySelector("strong")
    ).toHaveTextContent("importante");
  });

  it("renders link markdown in item text", () => {
    const linkItem = {
      ...baseItem,
      text: "[docs](https://docs.com)",
    };
    render(
      <ItemRow
        item={linkItem}
        onToggle={vi.fn()}
        onDelete={vi.fn()}
        onEdit={vi.fn()}
      />
    );
    const anchor = screen.getByTestId("item-text-i1").querySelector("a");
    expect(anchor).toHaveAttribute("href", "https://docs.com");
    expect(anchor).toHaveTextContent("docs");
  });

  it("renders tags alongside markdown without interference", () => {
    const mixedItem = {
      ...baseItem,
      text: "**importante** revisar #trabajo",
    };
    render(
      <ItemRow
        item={mixedItem}
        onToggle={vi.fn()}
        onDelete={vi.fn()}
        onEdit={vi.fn()}
      />
    );
    expect(
      screen.getByTestId("item-text-i1").querySelector("strong")
    ).toHaveTextContent("importante");
    expect(screen.getByTestId("item-tag-i1-trabajo")).toBeInTheDocument();
  });
});
