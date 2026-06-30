import { describe, expect, it } from "vitest";
import { applySlashAction, getSlashQuery } from "./slash-menu";

describe("getSlashQuery", () => {
  it("returns null when there is no slash before the caret", () => {
    expect(getSlashQuery("comprar leche", 13)).toBeNull();
  });

  it("detects a slash typed at the start of the input", () => {
    expect(getSlashQuery("/", 1)).toEqual({ query: "", start: 0 });
  });

  it("detects a slash in the middle preceded by a space", () => {
    const value = "cena /bol";
    expect(getSlashQuery(value, value.length)).toEqual({
      query: "bol",
      start: 5,
    });
  });

  it("does not trigger when the slash is part of a word (e.g. a URL or X/Y)", () => {
    expect(getSlashQuery("Xàbia /Jávea", 5)).toBeNull();
    expect(getSlashQuery("https://x.com", 13)).toBeNull();
  });

  it("only considers the slash run that contains the caret", () => {
    const value = "/bold text /it";
    expect(getSlashQuery(value, value.length)).toEqual({
      query: "it",
      start: 11,
    });
  });

  it("closes (returns null) once a space follows the slash query", () => {
    expect(getSlashQuery("/bold ", 6)).toBeNull();
  });
});

describe("applySlashAction", () => {
  const base = (extra: Partial<Parameters<typeof applySlashAction>[0]> = {}) => ({
    value: "/",
    start: 0,
    caret: 1,
    ...extra,
  });

  it("bold replaces the slash query with **placeholder** and selects the placeholder", () => {
    const r = applySlashAction({ ...base(), action: "bold", placeholder: "texto" });
    expect(r.value).toBe("**texto**");
    expect(r.selectionStart).toBe(2);
    expect(r.selectionEnd).toBe(7);
  });

  it("italic wraps in single asterisks", () => {
    const r = applySlashAction({ ...base(), action: "italic", placeholder: "texto" });
    expect(r.value).toBe("*texto*");
    expect(r.selectionStart).toBe(1);
    expect(r.selectionEnd).toBe(6);
  });

  it("code wraps in backticks", () => {
    const r = applySlashAction({ ...base(), action: "code", placeholder: "texto" });
    expect(r.value).toBe("`texto`");
    expect(r.selectionStart).toBe(1);
    expect(r.selectionEnd).toBe(6);
  });

  it("link inserts [label](url) and selects the label", () => {
    const r = applySlashAction({
      ...base(),
      action: "link",
      placeholder: "texto",
      urlPlaceholder: "url",
    });
    expect(r.value).toBe("[texto](url)");
    expect(r.selectionStart).toBe(1);
    expect(r.selectionEnd).toBe(6);
  });

  it("place inserts an @ trigger and puts the caret after it", () => {
    const r = applySlashAction({ ...base(), action: "place", placeholder: "texto" });
    expect(r.value).toBe("@");
    expect(r.selectionStart).toBe(1);
    expect(r.selectionEnd).toBe(1);
  });

  it("tag inserts a # trigger and puts the caret after it", () => {
    const r = applySlashAction({ ...base(), action: "tag", placeholder: "texto" });
    expect(r.value).toBe("#");
    expect(r.selectionStart).toBe(1);
    expect(r.selectionEnd).toBe(1);
  });

  it("preserves text around the slash query", () => {
    const value = "cena /bo aquí";
    const r = applySlashAction({
      value,
      start: 5,
      caret: 8,
      action: "bold",
      placeholder: "texto",
    });
    expect(r.value).toBe("cena **texto** aquí");
    expect(r.selectionStart).toBe(7);
    expect(r.selectionEnd).toBe(12);
  });
});
