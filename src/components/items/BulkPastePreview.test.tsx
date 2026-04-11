import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BulkPastePreview } from "./BulkPastePreview";

const texts = ["Leche", "Huevos", "Pan"];

function setup(overrides: Partial<React.ComponentProps<typeof BulkPastePreview>> = {}) {
  const props = {
    texts,
    isPending: false,
    onChange: vi.fn(),
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
    ...overrides,
  };
  render(<BulkPastePreview {...props} />);
  return props;
}

describe("BulkPastePreview", () => {
  it("renders all items", () => {
    setup();
    expect(screen.getByText("Leche")).toBeInTheDocument();
    expect(screen.getByText("Huevos")).toBeInTheDocument();
    expect(screen.getByText("Pan")).toBeInTheDocument();
  });

  it("shows item count in confirm button", () => {
    setup();
    expect(screen.getByTestId("bulk-confirm")).toHaveTextContent("Añadir 3 elementos");
  });

  it("calls onConfirm when confirm button is clicked", async () => {
    const { onConfirm } = setup();
    await userEvent.click(screen.getByTestId("bulk-confirm"));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("calls onCancel when cancel button is clicked", async () => {
    const { onCancel } = setup();
    await userEvent.click(screen.getByTestId("bulk-cancel"));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("calls onChange without the removed item when ✕ is clicked", async () => {
    const { onChange } = setup();
    await userEvent.click(screen.getByTestId("bulk-remove-1"));
    expect(onChange).toHaveBeenCalledWith(["Leche", "Pan"]);
  });

  it("calls onCancel when last item is removed", async () => {
    const { onCancel } = setup({ texts: ["Único"] });
    await userEvent.click(screen.getByTestId("bulk-remove-0"));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("disables confirm button while pending", () => {
    setup({ isPending: true });
    expect(screen.getByTestId("bulk-confirm")).toBeDisabled();
    expect(screen.getByTestId("bulk-confirm")).toHaveTextContent("Añadiendo…");
  });

  it("shows max warning when at limit", () => {
    setup({ texts: Array.from({ length: 100 }, (_, i) => `Item ${i}`) });
    expect(screen.getByText(/máx\. 100/)).toBeInTheDocument();
  });
});
