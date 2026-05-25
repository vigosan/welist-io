import { describe, expect, it } from "vitest";
import { parseBulkText } from "./bulk-text";

describe("parseBulkText", () => {
  it("splits multiline input into one entry per non-empty line", () => {
    expect(parseBulkText("uno\ndos\ntres")).toEqual(["uno", "dos", "tres"]);
  });

  it("trims surrounding whitespace so accidental indents do not duplicate entries", () => {
    expect(parseBulkText("  a  \n\tb\t")).toEqual(["a", "b"]);
  });

  it("drops blank lines including whitespace-only lines", () => {
    expect(parseBulkText("a\n\n   \nb")).toEqual(["a", "b"]);
  });

  it("removes case-insensitive duplicates so paste does not insert the same item twice", () => {
    expect(parseBulkText("Foo\nfoo\nFOO\nbar")).toEqual(["Foo", "bar"]);
  });

  it("supports CRLF line endings from desktop pastes", () => {
    expect(parseBulkText("a\r\nb\r\nc")).toEqual(["a", "b", "c"]);
  });
});
