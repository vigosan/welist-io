import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useSearchInput } from "./useSearchInput";

describe("useSearchInput", () => {
  it("starts with empty input and committed value", () => {
    const { result } = renderHook(() => useSearchInput());
    expect(result.current.q).toBe("");
    expect(result.current.search).toBe("");
  });

  it("updates q via setQ without committing search", () => {
    const { result } = renderHook(() => useSearchInput());
    act(() => result.current.setQ("hello"));
    expect(result.current.q).toBe("hello");
    expect(result.current.search).toBe("");
  });

  it("commits trimmed q to search on submit", () => {
    const { result } = renderHook(() => useSearchInput());
    act(() => result.current.setQ("  hello  "));
    act(() =>
      result.current.handleSearch({
        preventDefault: () => {},
      } as React.FormEvent)
    );
    expect(result.current.search).toBe("hello");
  });

  it("calls preventDefault on submit", () => {
    const { result } = renderHook(() => useSearchInput());
    let prevented = false;
    act(() =>
      result.current.handleSearch({
        preventDefault: () => {
          prevented = true;
        },
      } as React.FormEvent)
    );
    expect(prevented).toBe(true);
  });
});
