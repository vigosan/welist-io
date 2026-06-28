import { describe, expect, it } from "vitest";
import { parseBulkText } from "./bulk-text";

describe("parseBulkText", () => {
  // --- parity with mobile parseBulkText ---
  it("splits multiline input into one entry per non-empty line", () => {
    expect(parseBulkText("uno\ndos\ntres")).toEqual(["uno", "dos", "tres"]);
  });

  it("trims surrounding whitespace so accidental indents do not duplicate entries", () => {
    expect(parseBulkText("  a  \n\tb\t")).toEqual(["a", "b"]);
  });

  it("drops blank lines including whitespace-only lines", () => {
    expect(parseBulkText("a\n\n   \nb")).toEqual(["a", "b"]);
  });

  it("removes case-insensitive duplicates", () => {
    expect(parseBulkText("Foo\nfoo\nFOO\nbar")).toEqual(["Foo", "bar"]);
  });

  it("supports CRLF line endings from desktop pastes", () => {
    expect(parseBulkText("a\r\nb\r\nc")).toEqual(["a", "b", "c"]);
  });

  // --- enhanced web behavior ---
  it("strips numbered list markers (1. 2) 3 -)", () => {
    expect(parseBulkText("1. Alpha\n2) Beta\n3 - Gamma")).toEqual([
      "Alpha",
      "Beta",
      "Gamma",
    ]);
  });

  it("strips bullet markers (- * • –)", () => {
    expect(parseBulkText("- a\n* b\n• c\n– d")).toEqual(["a", "b", "c", "d"]);
  });

  it("splits a single comma-separated line when there are no newlines", () => {
    expect(parseBulkText("apples, bananas, cherries")).toEqual([
      "apples",
      "bananas",
      "cherries",
    ]);
  });

  it("splits a single semicolon-separated line", () => {
    expect(parseBulkText("one; two; three")).toEqual(["one", "two", "three"]);
  });

  it("does NOT comma-split when input has multiple lines (commas are content)", () => {
    expect(parseBulkText("Lisbon, Portugal\nKyoto, Japan")).toEqual([
      "Lisbon, Portugal",
      "Kyoto, Japan",
    ]);
  });

  it("returns an empty array for empty or whitespace input", () => {
    expect(parseBulkText("")).toEqual([]);
    expect(parseBulkText("   \n  ")).toEqual([]);
  });

  it("keeps a single plain line as one entry", () => {
    expect(parseBulkText("just one thing")).toEqual(["just one thing"]);
  });

  it("does not strip a hyphen that is part of the content", () => {
    expect(parseBulkText("e-bike route")).toEqual(["e-bike route"]);
  });
});
