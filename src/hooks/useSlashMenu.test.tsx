import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useSlashMenu } from "./useSlashMenu";

function makeInput(value: string) {
  const el = document.createElement("input");
  el.value = value;
  el.setSelectionRange(value.length, value.length);
  el.focus = vi.fn();
  el.setSelectionRange = vi.fn(el.setSelectionRange.bind(el));
  return el;
}

describe("useSlashMenu", () => {
  it("is closed initially", () => {
    const { result } = renderHook(() => useSlashMenu(vi.fn()));
    expect(result.current.open).toBe(false);
  });

  it("opens when the value has an active slash query at the caret", () => {
    const { result } = renderHook(() => useSlashMenu(vi.fn()));
    const el = makeInput("/");
    act(() => result.current.sync(el));
    expect(result.current.open).toBe(true);
    expect(result.current.activeIndex).toBe(0);
  });

  it("stays closed for text with a non-triggering slash", () => {
    const { result } = renderHook(() => useSlashMenu(vi.fn()));
    const el = makeInput("Xàbia/Jávea");
    act(() => result.current.sync(el));
    expect(result.current.open).toBe(false);
  });

  it("arrow keys move the active index and wrap", () => {
    const { result } = renderHook(() => useSlashMenu(vi.fn()));
    const el = makeInput("/");
    act(() => result.current.sync(el));

    const down = new KeyboardEvent("keydown", { key: "ArrowDown" });
    act(() => {
      result.current.onKeyDown(
        { ...down, preventDefault: vi.fn(), key: "ArrowDown" },
        el
      );
    });
    expect(result.current.activeIndex).toBe(1);

    act(() => {
      result.current.onKeyDown({ preventDefault: vi.fn(), key: "ArrowUp" }, el);
    });
    expect(result.current.activeIndex).toBe(0);

    act(() => {
      result.current.onKeyDown({ preventDefault: vi.fn(), key: "ArrowUp" }, el);
    });
    expect(result.current.activeIndex).toBe(5);
  });

  it("Enter applies the active action and reports the new value", () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useSlashMenu(onChange));
    const el = makeInput("/");
    act(() => result.current.sync(el));
    act(() => {
      result.current.onKeyDown({ preventDefault: vi.fn(), key: "Enter" }, el);
    });
    expect(onChange).toHaveBeenCalledWith("**texto**");
    expect(result.current.open).toBe(false);
  });

  it("Escape closes the menu without changing the value", () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useSlashMenu(onChange));
    const el = makeInput("/");
    act(() => result.current.sync(el));
    act(() => {
      result.current.onKeyDown({ preventDefault: vi.fn(), key: "Escape" }, el);
    });
    expect(result.current.open).toBe(false);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("select() applies a clicked action and reports the new value", () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useSlashMenu(onChange));
    const el = makeInput("hola /");
    act(() => result.current.sync(el));
    act(() => result.current.select("link", el));
    expect(onChange).toHaveBeenCalledWith("hola [texto](url)");
    expect(result.current.open).toBe(false);
  });
});
