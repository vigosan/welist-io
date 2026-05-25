import { describe, expect, it } from "vitest";
import { privateName } from "./private-name";

describe("privateName", () => {
  it("returns em dash for null", () => {
    expect(privateName(null)).toBe("—");
  });

  it("returns em dash for undefined", () => {
    expect(privateName(undefined)).toBe("—");
  });

  it("returns em dash for empty string", () => {
    expect(privateName("")).toBe("—");
  });

  it("returns the only part when name is a single token", () => {
    expect(privateName("Madonna")).toBe("Madonna");
  });

  it("abbreviates the last name with an initial", () => {
    expect(privateName("Vicent Gozalbes")).toBe("Vicent G.");
  });

  it("uses the last token as the surname when there are middle names", () => {
    expect(privateName("Ana María García López")).toBe("Ana L.");
  });

  it("collapses internal whitespace", () => {
    expect(privateName("  Vicent   Gozalbes  ")).toBe("Vicent G.");
  });
});
